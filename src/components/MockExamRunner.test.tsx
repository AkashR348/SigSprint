import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, BackHandler } from 'react-native';

import type { Question } from '@/content/questions';
import type { SavedExam } from '@/lib/mockSave';
import { dayKey, freshProgress, type Progress } from '@/lib/progress';
import { loadProgress, PROGRESS_KEY, resetProgressStoreForTests } from '@/lib/progressStore';

import { MockExamRunner } from './MockExamRunner';

const q = (id: string, answer: 0 | 1 | 2 | 3): Question => ({
  id,
  domain: id === 'three' ? 'safety' : 'federal',
  stem: `Stem ${id}`,
  choices: [`${id} a`, `${id} b`, `${id} c`, `${id} d`],
  answer,
  explanation: `Why ${id}`,
  source: { title: `Source ${id}`, url: 'https://www.fda.gov/x' },
});
const three = [q('one', 0), q('two', 1), q('three', 2)];
const onLeave = jest.fn();
const onNewExam = jest.fn();
const HOUR = 3600_000;

// Question one's choices are drawn in reverse, so the letter on screen is not the stored position.
function exam(mode: SavedExam['mode'], clock: number): SavedExam {
  return { mode, length: 'half', ids: ['one', 'two', 'three'], orders: ['3210', '0123', '0123'], answers: [null, null, null], flagged: [], index: 0, clock };
}

async function stored(): Promise<Progress> {
  return JSON.parse((await AsyncStorage.getItem(PROGRESS_KEY)) ?? 'null');
}

async function start(saved: SavedExam, before: Partial<Progress> = {}) {
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...freshProgress(), ...before, exam: saved }));
  await loadProgress();
  jest.clearAllMocks();
  await render(<MockExamRunner saved={saved} questions={three} onLeave={onLeave} onNewExam={onNewExam} />);
  // The first question waits for the clock's first tick.
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
}

const strict = (before?: Partial<Progress>) => start(exam('exam', Date.now() + HOUR), before);
const relaxed = () => start(exam('relaxed', HOUR));
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const choose = (name: string | RegExp) => fireEvent.press(screen.getByRole('radio', { name }));
const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(10);
  });

beforeEach(async () => {
  jest.useFakeTimers({ now: new Date(2026, 10, 19, 12, 0, 0) });
  resetProgressStoreForTests();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

test('an answer is saved as it is tapped, by its stored position, and can be changed', async () => {
  await strict();
  expect(screen.getByRole('radio', { name: 'A. one d' })).toBeTruthy();
  await choose('A. one d');
  await settle();
  expect((await stored()).exam?.answers).toEqual([3, null, null]);
  await choose('D. one a');
  await settle();
  expect((await stored()).exam?.answers).toEqual([0, null, null]);
  expect(screen.getByRole('radio', { name: 'D. one a' })).toBeChecked();
  // Nothing says right or wrong before the exam is submitted.
  expect(screen.queryByText(/Correct|Not quite|Why one/)).toBeNull();
});

test('questions can be skipped, gone back to and flagged, and the place is saved', async () => {
  await strict();
  expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  await press('Next');
  expect(screen.getByText('Stem two')).toBeTruthy();
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Flag this question for review' }));
  expect(screen.getByText('Flagged for review')).toBeTruthy();
  await press('Next');
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  await press('Back');
  await settle();
  expect(await stored()).toMatchObject({ exam: { index: 1, flagged: [1], answers: [null, null, null] } });
});

test('the review list shows what is answered and flagged, and opens any question', async () => {
  await strict();
  await choose('D. one a');
  await press('Next');
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Flag this question for review' }));
  await press('Review and submit');
  expect(screen.getByText('Review your answers')).toBeTruthy();
  expect(screen.getByText('1 answered · 2 not answered · 1 flagged')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Question 1, answered' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Question 2, not answered, flagged' })).toBeTruthy();
  await press('Question 3, not answered');
  expect(screen.getByText('Stem three')).toBeTruthy();
});

test('submitting with blanks asks once, then scores them as wrong and takes no points for them', async () => {
  await strict({ xp: 30 });
  await choose('D. one a');
  await press('Next');
  await choose('A. two a');
  await press('Review and submit');
  await press('Submit exam');
  expect(screen.getByText('1 question is not answered and will count as wrong. Submit anyway?')).toBeTruthy();
  expect((await stored()).exam).toBeDefined();
  await press('Keep working');
  await press('Submit exam');
  await press('Submit anyway');
  await settle();
  expect(screen.getByText('Exam complete')).toBeTruthy();
  expect(screen.getByText('33%')).toBeTruthy();
  expect(screen.getByText('1 of 3 correct')).toBeTruthy();
  expect(screen.getByText('1 not answered, counted as wrong')).toBeTruthy();
  expect(screen.getByText('You gained 5 points')).toBeTruthy();
  const saved = await stored();
  expect(saved).toMatchObject({ xp: 35, days: { [dayKey(new Date())]: 2 } });
  expect(saved.exam).toBeUndefined();
  expect(saved.exams).toEqual([
    expect.objectContaining({ mode: 'exam', length: 'half', correct: 1, total: 3, timedOut: false, byDomain: [{ id: 'federal', correct: 1, total: 2 }, { id: 'safety', correct: 0, total: 1 }] }),
  ]);
});

test('with every question answered, submit goes straight to the result and its full review', async () => {
  await strict();
  await choose('D. one a');
  await press('Next');
  await choose('B. two b');
  await press('Next');
  await choose('A. three a');
  await press('Review and submit');
  await press('Submit exam');
  await settle();
  expect(screen.getByText('2 of 3 correct')).toBeTruthy();
  expect(screen.getByText('1,400')).toBeTruthy();
  expect(screen.getByText('Your estimate is right at the passing score of 1,400.')).toBeTruthy();
  expect(screen.getByText(/rough estimate, not a PTCB score/)).toBeTruthy();
  expect(screen.getByText('Federal Requirements')).toBeTruthy();
  expect(screen.getByText('2 of 2')).toBeTruthy();
  expect(screen.getByText('3. Incorrect')).toBeTruthy();
  expect(screen.getByText('Your answer: three a')).toBeTruthy();
  expect(screen.getByText('Correct answer: three c')).toBeTruthy();
  expect(screen.getByText('Why three')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Source: Source three' })).toBeTruthy();
  await press('New exam');
  expect(onNewExam).toHaveBeenCalledTimes(1);
  await press('Done');
  expect(onLeave).toHaveBeenCalledTimes(1);
});

test('when a strict exam runs out of time it ends, with what was answered', async () => {
  const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  await strict();
  expect(screen.getByText('1:00:00')).toBeTruthy();
  await choose('D. one a');
  await act(async () => {
    await jest.advanceTimersByTimeAsync(HOUR + 1000);
  });
  expect(screen.getByText("Time's up")).toBeTruthy();
  expect(screen.getByText('1 of 3 correct')).toBeTruthy();
  expect(say).toHaveBeenCalledWith("Time's up. 1 of 3 correct.");
  expect((await stored()).exams?.[0]).toMatchObject({ timedOut: true, correct: 1, seconds: 3300 });
});

test('a strict exam that ran out while the app was away opens on its result, never on a question', async () => {
  await start({ ...exam('exam', Date.now() - 5000), answers: [0, null, null] });
  await settle();
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.getByText("Time's up")).toBeTruthy();
  expect(screen.getByText('1 of 3 correct')).toBeTruthy();
});

test('the last 10 minutes are flagged on screen and aloud', async () => {
  const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  await strict();
  expect(screen.queryByText('Less than 10 minutes left.')).toBeNull();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(HOUR - 600_000);
  });
  expect(screen.getByText('Less than 10 minutes left.')).toBeTruthy();
  expect(say).toHaveBeenCalledWith('Less than 10 minutes left.');
});

test('a strict exam has no pause, and its clock runs on while the app is away', async () => {
  const listen = jest.spyOn(AppState, 'addEventListener');
  await strict();
  expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
  expect(listen).not.toHaveBeenCalled();
  jest.setSystemTime(Date.now() + 20 * 60_000);
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
  expect(screen.getByText('40:00')).toBeTruthy();
});

test('pausing a relaxed exam hides the question and stops the clock, which is saved', async () => {
  await relaxed();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
  });
  expect(screen.getByText('59:00')).toBeTruthy();
  await press('Pause');
  expect(screen.getByText('Paused')).toBeTruthy();
  expect(screen.queryByText('Stem one')).toBeNull();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(30 * 60_000);
  });
  // To the second: the clock started a tick after the test's own.
  expect(Math.round(((await stored()).exam?.clock ?? 0) / 1000)).toBe(3540);
  await press('Resume');
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(screen.getByText('Stem one')).toBeTruthy();
  expect(screen.getByText('58:59')).toBeTruthy();
});

test('leaving the app stops a relaxed clock, and the exam comes back paused', async () => {
  const listen = jest.spyOn(AppState, 'addEventListener');
  await relaxed();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(60_000);
  });
  const onChange = listen.mock.calls[0][1];
  await act(async () => {
    onChange('background');
    jest.setSystemTime(Date.now() + 5 * HOUR);
    onChange('active');
    await jest.advanceTimersByTimeAsync(1000);
  });
  expect(screen.getByText('Paused')).toBeTruthy();
  expect(screen.getByText('59:00')).toBeTruthy();
  // To the second: the clock started a tick after the test's own.
  expect(Math.round(((await stored()).exam?.clock ?? 0) / 1000)).toBe(3540);
});

test('a relaxed exam still ends when its time is used up', async () => {
  await relaxed();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(HOUR + 1000);
  });
  expect(screen.getByText("Time's up")).toBeTruthy();
});

test('closing asks first: stay, leave for later with the exam kept, or quit with nothing counted', async () => {
  await strict({ xp: 30 });
  await choose('D. one a');
  await press('Close mock exam');
  expect(screen.getByText('Leave this exam?')).toBeTruthy();
  expect(screen.getByText(/the clock keeps running/)).toBeTruthy();
  await press('Keep going');
  expect(onLeave).not.toHaveBeenCalled();
  await press('Close mock exam');
  await press('Leave and come back later');
  await settle();
  expect(onLeave).toHaveBeenCalledTimes(1);
  expect((await stored()).exam?.answers).toEqual([0, null, null]);
  await press('Quit exam');
  await settle();
  const saved = await stored();
  expect(saved.exam).toBeUndefined();
  expect(saved).toMatchObject({ xp: 30, days: {} });
  expect(saved.exams).toBeUndefined();
});

test("Android's back button asks the same question", async () => {
  const listen = jest.spyOn(BackHandler, 'addEventListener');
  await strict();
  const onBack = listen.mock.calls[listen.mock.calls.length - 1][1] as unknown as () => boolean;
  let handled: boolean | null | undefined;
  await act(async () => {
    handled = onBack();
  });
  expect(handled).toBe(true);
  expect(screen.getByText('Leave this exam?')).toBeTruthy();
});

test('a result that cannot be saved says so, shows no points, and can be tried again', async () => {
  await strict();
  await choose('D. one a');
  await press('Review and submit');
  await press('Submit exam');
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
  await press('Submit anyway');
  await settle();
  expect(screen.getByText(/This result couldn't be saved on this phone/)).toBeTruthy();
  expect(screen.queryByText(/You gained/)).toBeNull();
  await press('Try saving again');
  await settle();
  await waitFor(() => expect(screen.getByText('You gained 10 points')).toBeTruthy());
  expect((await stored()).exams).toHaveLength(1);
});

test('an answer that cannot be saved is said so while the exam goes on', async () => {
  await strict();
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
  await choose('D. one a');
  await settle();
  expect(screen.getByText(/Your last change couldn't be saved on this phone/)).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'D. one a' })).toBeChecked();
});

test('no question is drawn before the clock has been read', async () => {
  const saved = exam('exam', Date.now() + HOUR);
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...freshProgress(), exam: saved }));
  await loadProgress();
  await render(<MockExamRunner saved={saved} questions={three} onLeave={onLeave} onNewExam={onNewExam} />);
  expect(screen.queryByRole('radio')).toBeNull();
  await settle();
  expect(screen.getAllByRole('radio')).toHaveLength(4);
});

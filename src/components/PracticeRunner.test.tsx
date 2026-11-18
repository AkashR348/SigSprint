import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, BackHandler, Linking } from 'react-native';

import type { Question } from '@/content/questions';
import { dayKey } from '@/lib/progress';
import { loadProgress, PROGRESS_KEY, resetProgressStoreForTests } from '@/lib/progressStore';

import * as Buttons from './ChunkyButton';
import { PracticeRunner } from './PracticeRunner';

const q = (id: string, answer: 0 | 1 | 2 | 3): Question => ({
  id,
  domain: 'federal',
  stem: `Stem ${id}`,
  choices: [`${id} a`, `${id} b`, `${id} c`, `${id} d`],
  answer,
  explanation: `Why ${id}`,
  source: { title: `Source ${id}`, url: 'https://www.fda.gov/x' },
});
const two = [q('one', 0), q('two', 1)];
const onLeave = jest.fn();
const onNewTest = jest.fn();

async function stored(): Promise<{ xp: number; days: Record<string, number> } | null> {
  return JSON.parse((await AsyncStorage.getItem(PROGRESS_KEY)) ?? 'null');
}

async function start(config: { timed: boolean; showAnswers: 'each' | 'end' }) {
  await render(<PracticeRunner questions={two} config={config} onLeave={onLeave} onNewTest={onNewTest} />);
}

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const choose = (name: string | RegExp) => fireEvent.press(screen.getByRole('radio', { name }));

beforeEach(async () => {
  resetProgressStoreForTests();
  await AsyncStorage.clear();
  await loadProgress();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

test('nothing can be checked, and nothing is saved, until a choice is tapped', async () => {
  await start({ timed: false, showAnswers: 'each' });
  expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
  await choose(/one b/);
  expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('a correct answer shows why, its source, and the points once they are saved', async () => {
  await start({ timed: false, showAnswers: 'each' });
  await choose(/one a/);
  await press('Check');
  expect(screen.getByText('Correct!')).toBeTruthy();
  expect(screen.getByText('Why one')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Source: Source one' })).toBeTruthy();
  expect(await screen.findByText('+10 XP')).toBeTruthy();
  expect(await stored()).toMatchObject({ xp: 10, days: { [dayKey(new Date())]: 1 } });
});

test('a wrong answer names the right one and still counts toward today, and a total of 0 stays at 0', async () => {
  await start({ timed: false, showAnswers: 'each' });
  await choose(/one c/);
  await press('Check');
  expect(screen.getByText('Not quite')).toBeTruthy();
  expect(screen.getByText('The answer is one a.')).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'A. one a, correct answer' })).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'C. one c, your answer, incorrect' })).toBeDisabled();
  await waitFor(async () => expect(await stored()).toMatchObject({ xp: 0, days: { [dayKey(new Date())]: 1 } }));
  expect(screen.queryByText(/XP/)).toBeNull();
});

test('a wrong answer takes 5 points, and says so once it is saved', async () => {
  await start({ timed: false, showAnswers: 'each' });
  await choose(/one a/);
  await press('Check');
  await press('Continue');
  await choose(/two a/);
  await press('Check');
  expect(await screen.findByLabelText('Minus 5 points')).toHaveTextContent('\u22125 XP');
  expect(await stored()).toMatchObject({ xp: 5, days: { [dayKey(new Date())]: 2 } });
});

test('an answer that cannot be saved says so and is counted on the results, not hidden', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));
  await start({ timed: false, showAnswers: 'each' });
  await choose(/one a/);
  await press('Check');
  expect(await screen.findByText("This answer couldn't be saved on this phone.")).toBeTruthy();
  expect(screen.queryByText('+10 XP')).toBeNull();
  await press('Continue');
  await choose(/two b/);
  await press('Check');
  await press('See results');
  expect(screen.getByText('2 of 2 correct')).toBeTruthy();
  expect(screen.getByText(/1 answer couldn't be saved/)).toBeTruthy();
  expect(await stored()).toMatchObject({ xp: 10 });
  // Only the saved answer is in the points.
  expect(screen.getByText('You gained 10 points')).toBeTruthy();
  expect(screen.getAllByText(/XP/)).toHaveLength(1);
});

test('with answers at the end nothing is revealed until the results', async () => {
  await start({ timed: false, showAnswers: 'end' });
  await choose(/one b/);
  await press('Next');
  expect(screen.queryByText('Why one')).toBeNull();
  expect(screen.getByText('Stem two')).toBeTruthy();
  await choose(/two b/);
  await press('Finish');
  expect(screen.getByText('50%')).toBeTruthy();
  expect(screen.getByText('1 of 2 correct')).toBeTruthy();
  expect(screen.getByText('Your answer: one b')).toBeTruthy();
  expect(screen.getByText('Why one')).toBeTruthy();
  await waitFor(async () => expect(await stored()).toMatchObject({ xp: 10, days: { [dayKey(new Date())]: 2 } }));
});

test('with answers at the end the results show the points for the test and for each question', async () => {
  await start({ timed: false, showAnswers: 'end' });
  await choose(/one a/);
  await press('Next');
  expect(screen.queryByText(/XP/)).toBeNull();
  await choose(/two a/);
  await press('Finish');
  expect(await screen.findByText('You gained 5 points')).toBeTruthy();
  expect(screen.getByLabelText('Plus 10 points')).toHaveTextContent('+10 XP');
  expect(screen.getByLabelText('Minus 5 points')).toHaveTextContent('\u22125 XP');
});

test('a wrong answer at a total of 0 changes nothing, and the results say so', async () => {
  await start({ timed: false, showAnswers: 'end' });
  await choose(/one b/);
  await press('Next');
  await choose(/two a/);
  await press('Finish');
  expect(await screen.findByText("Your points didn't change")).toBeTruthy();
  expect(screen.queryByText(/XP/)).toBeNull();
});

test('closing asks first, and keeps the test when the person stays', async () => {
  await start({ timed: false, showAnswers: 'each' });
  await press('Close practice test');
  expect(screen.getByText('Leave this test?')).toBeTruthy();
  expect(onLeave).not.toHaveBeenCalled();
  await press('Keep going');
  expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();
  await press('Close practice test');
  await press('Leave');
  expect(onLeave).toHaveBeenCalledTimes(1);
});

test('when the time runs out the test ends with the rest unanswered', async () => {
  jest.useFakeTimers();
  await start({ timed: true, showAnswers: 'end' });
  // Two questions at the exam's pace: 147 seconds.
  expect(screen.getByText('2:27')).toBeTruthy();
  await act(async () => {
    jest.advanceTimersByTime(148_000);
  });
  expect(screen.getByText("Time's up")).toBeTruthy();
  expect(screen.getByText('0 of 2 correct')).toBeTruthy();
  expect(screen.getByText('2 not answered')).toBeTruthy();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('the results offer a new test and a way out', async () => {
  await start({ timed: false, showAnswers: 'end' });
  await choose(/one a/);
  await press('Next');
  await choose(/two a/);
  await press('Finish');
  await press('New test');
  expect(onNewTest).toHaveBeenCalledTimes(1);
  await press('Done');
  expect(onLeave).toHaveBeenCalledTimes(1);
});

test('an answer after the time has ended is not taken, even before the clock ticks', async () => {
  await start({ timed: true, showAnswers: 'end' });
  await choose(/one a/);
  const now = Date.now();
  const clockNow = jest.spyOn(Date, 'now').mockReturnValue(now + 200_000);
  await press('Next');
  clockNow.mockRestore();
  expect(screen.getByText("Time's up")).toBeTruthy();
  expect(screen.getByText('2 not answered')).toBeTruthy();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test("Android's back button asks before leaving", async () => {
  const listen = jest.spyOn(BackHandler, 'addEventListener');
  await start({ timed: false, showAnswers: 'each' });
  const onBack = listen.mock.calls[listen.mock.calls.length - 1][1] as unknown as () => boolean;
  let handled: boolean | null | undefined;
  await act(async () => {
    handled = onBack();
  });
  expect(handled).toBe(true);
  expect(screen.getByText('Leave this test?')).toBeTruthy();
  expect(onLeave).not.toHaveBeenCalled();
});

test('an answer saved after midnight still counts for the day it was given', async () => {
  let finishRead: (raw: string | null) => void = () => {};
  resetProgressStoreForTests();
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(new Promise((resolve) => (finishRead = resolve)));
  void loadProgress();
  jest.useFakeTimers({ now: new Date(2026, 10, 17, 23, 59, 58) });
  await start({ timed: false, showAnswers: 'each' });
  await choose(/one a/);
  await press('Check');
  jest.setSystemTime(new Date(2026, 10, 18, 0, 0, 5));
  await act(async () => {
    finishRead(null);
  });
  jest.useRealTimers();
  await waitFor(async () => expect(await stored()).toMatchObject({ days: { '2026-11-17': 1 } }));
  expect((await stored())?.days['2026-11-18']).toBeUndefined();
});

test('two taps before the screen redraws record the answer once', async () => {
  // Keep the handler from one draw, as two touches inside a single frame would.
  const real = Buttons.ChunkyButton;
  const handlers: Record<string, () => void> = {};
  const spy = jest.spyOn(Buttons, 'ChunkyButton').mockImplementation((props) => {
    handlers[props.label] = props.onPress;
    return real(props);
  });
  await start({ timed: false, showAnswers: 'end' });
  await choose(/one a/);
  const stale = handlers.Next;
  await act(async () => {
    stale();
    stale();
  });
  spy.mockRestore();
  await waitFor(async () => expect(await stored()).toMatchObject({ xp: 10 }));
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  expect((await stored())?.days[dayKey(new Date())]).toBe(1);
});

test('the leave question is said aloud and does not promise an answer that failed to save', async () => {
  const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));
  await start({ timed: false, showAnswers: 'each' });
  await choose(/one a/);
  await press('Check');
  await screen.findByText("This answer couldn't be saved on this phone.");
  expect(say).toHaveBeenCalledWith("This answer couldn't be saved on this phone.");
  await press('Close practice test');
  expect(say).toHaveBeenCalledWith('Leave this test?');
  expect(screen.getByText(/1 answer couldn't be saved on this phone/)).toBeTruthy();
  expect(screen.queryByText(/still count toward today/)).toBeNull();
});

test('with every answer saved the leave question says they count', async () => {
  await start({ timed: false, showAnswers: 'each' });
  await choose(/one a/);
  await press('Check');
  await screen.findByText('+10 XP');
  await press('Close practice test');
  expect(screen.getByText('The questions you have answered still count toward today.')).toBeTruthy();
});

test('the end of a test is said aloud with the score, and so is an unsaved answer', async () => {
  const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));
  await start({ timed: false, showAnswers: 'end' });
  await choose(/one a/);
  await press('Next');
  await choose(/two a/);
  await press('Finish');
  expect(say).toHaveBeenCalledWith('Test complete. 1 of 2 correct.');
  await waitFor(() => expect(say).toHaveBeenCalledWith(expect.stringMatching(/^1 answer couldn't be saved/)));
});

test('running out of time is said aloud', async () => {
  const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  jest.useFakeTimers();
  await start({ timed: true, showAnswers: 'end' });
  await act(async () => {
    jest.advanceTimersByTime(148_000);
  });
  expect(say).toHaveBeenCalledWith("Time's up. 0 of 2 correct.");
});

test('a source that cannot be opened shows its address instead', async () => {
  jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('no browser'));
  await start({ timed: false, showAnswers: 'each' });
  await choose(/one a/);
  await press('Check');
  await fireEvent.press(screen.getByRole('link', { name: 'Source: Source one' }));
  expect(await screen.findByText("Couldn't open the page. Its address is https://www.fda.gov/x")).toBeTruthy();
});

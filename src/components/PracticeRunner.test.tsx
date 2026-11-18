import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import type { Question } from '@/content/questions';
import { dayKey } from '@/lib/progress';
import { loadProgress, PROGRESS_KEY, resetProgressStoreForTests } from '@/lib/progressStore';

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

test('a wrong answer names the right one, earns no points, and still counts toward today', async () => {
  await start({ timed: false, showAnswers: 'each' });
  await choose(/one c/);
  await press('Check');
  expect(screen.getByText('Not quite')).toBeTruthy();
  expect(screen.getByText('The answer is one a.')).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'A. one a, correct answer' })).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'C. one c, your answer, incorrect' })).toBeDisabled();
  await waitFor(async () => expect(await stored()).toMatchObject({ xp: 0, days: { [dayKey(new Date())]: 1 } }));
  expect(screen.queryByText('+10 XP')).toBeNull();
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

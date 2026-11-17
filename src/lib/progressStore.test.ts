import AsyncStorage from '@react-native-async-storage/async-storage';

import { freshProgress, recordAnswer, type Progress } from './progress';
import {
  getProgressState,
  loadProgress,
  PROGRESS_KEY,
  resetProgressStoreForTests,
  retryProgress,
  updateProgress,
} from './progressStore';

const answer = (p: Progress) => recordAnswer(p, '2026-11-17', 10);
const oneAnswer = { version: 1, dailyGoal: 20, xp: 10, days: { '2026-11-17': 1 } };

async function stored(): Promise<unknown> {
  return JSON.parse((await AsyncStorage.getItem(PROGRESS_KEY)) ?? 'null');
}

beforeEach(async () => {
  resetProgressStoreForTests();
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('it stays loading until the read finishes', async () => {
  let finishRead: (raw: string | null) => void = () => {};
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(new Promise((resolve) => (finishRead = resolve)));
  const loading = loadProgress();
  expect(getProgressState()).toEqual({ status: 'loading' });
  finishRead(null);
  await loading;
  expect(getProgressState().status).toBe('ready');
});

test('no save is a fresh install, read once from the progress key', async () => {
  await loadProgress();
  await loadProgress();
  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(PROGRESS_KEY);
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
});

test('a stored save is what loads', async () => {
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(oneAnswer));
  await loadProgress();
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(PROGRESS_KEY);
  expect(getProgressState()).toEqual({ status: 'ready', progress: oneAnswer });
});

test.each(['{not json', JSON.stringify({ version: 1, dailyGoal: 20, xp: -4, days: {} })])(
  'a damaged save %p is unavailable, stays so on retry, and is never overwritten',
  async (raw) => {
    await AsyncStorage.setItem(PROGRESS_KEY, raw);
    jest.clearAllMocks();
    await loadProgress();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(PROGRESS_KEY);
    expect(getProgressState()).toEqual({ status: 'unavailable', reason: 'damaged' });
    await retryProgress();
    expect(getProgressState()).toEqual({ status: 'unavailable', reason: 'damaged' });
    expect(await updateProgress(answer)).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(PROGRESS_KEY)).toBe(raw);
  },
);

test('a read that fails is unavailable, not a fresh install, and a retry reads again', async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
  await loadProgress();
  expect(getProgressState()).toEqual({ status: 'unavailable', reason: 'read' });
  expect(await updateProgress(answer)).toBe(false);
  await retryProgress();
  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2);
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
  expect(await updateProgress(answer)).toBe(true);
});

test('an update is saved under the progress key, then shown', async () => {
  await loadProgress();
  expect(await updateProgress(answer)).toBe(true);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(PROGRESS_KEY, JSON.stringify(oneAnswer));
  expect(await stored()).toEqual(oneAnswer);
  expect(getProgressState()).toEqual({ status: 'ready', progress: oneAnswer });
});

test('an answer given before the save has been read waits for it and counts', async () => {
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(oneAnswer));
  expect(await updateProgress(answer)).toBe(true);
  expect(await stored()).toEqual({ version: 1, dailyGoal: 20, xp: 20, days: { '2026-11-17': 2 } });
});

test('a write that fails reports it and shows nothing that was not saved', async () => {
  await loadProgress();
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));
  expect(await updateProgress(answer)).toBe(false);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(PROGRESS_KEY, JSON.stringify(oneAnswer));
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
  expect(await updateProgress(answer)).toBe(true);
});

test.each([
  ['a day that is not a date', (p: Progress) => recordAnswer(p, 'tomorrow', 10)],
  ['a count past exact integers', (p: Progress) => ({ ...p, xp: Number.MAX_SAFE_INTEGER + 1 })],
  ['a change that throws', () => { throw new Error('bug'); }],
])('%s is refused, never written, and does not block the next update', async (_name, change) => {
  await loadProgress();
  expect(await updateProgress(change)).toBe(false);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
  expect(await updateProgress(answer)).toBe(true);
});

test('two updates in a row both count', async () => {
  await loadProgress();
  expect(await Promise.all([updateProgress(answer), updateProgress(answer)])).toEqual([true, true]);
  expect(await stored()).toEqual({ version: 1, dailyGoal: 20, xp: 20, days: { '2026-11-17': 2 } });
});

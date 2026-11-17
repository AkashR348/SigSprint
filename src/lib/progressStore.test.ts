import AsyncStorage from '@react-native-async-storage/async-storage';

import { freshProgress, recordAnswer } from './progress';
import { getProgressState, loadProgress, PROGRESS_KEY, resetProgressStoreForTests, updateProgress } from './progressStore';

beforeEach(async () => {
  resetProgressStoreForTests();
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('it is loading until the save has been read', () => {
  expect(getProgressState()).toEqual({ status: 'loading' });
});

test('no save is a fresh install, read from the progress key', async () => {
  await loadProgress();
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(PROGRESS_KEY);
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
});

test('a stored save is what loads', async () => {
  const saved = recordAnswer(freshProgress(), '2026-11-17', 10);
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(saved));
  await loadProgress();
  expect(getProgressState()).toEqual({ status: 'ready', progress: saved });
});

test.each(['{not json', JSON.stringify({ version: 1, dailyGoal: 20, xp: -4, days: {} })])(
  'a damaged save %p is unavailable and is not overwritten',
  async (raw) => {
    await AsyncStorage.setItem(PROGRESS_KEY, raw);
    await loadProgress();
    expect(getProgressState()).toEqual({ status: 'unavailable' });
    expect(await updateProgress((p) => recordAnswer(p, '2026-11-17', 10))).toBe(false);
    expect(await AsyncStorage.getItem(PROGRESS_KEY)).toBe(raw);
  },
);

test('a read that fails is unavailable, not a fresh install', async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
  await loadProgress();
  expect(getProgressState()).toEqual({ status: 'unavailable' });
});

test('an update is saved under the progress key', async () => {
  await loadProgress();
  expect(await updateProgress((p) => recordAnswer(p, '2026-11-17', 10))).toBe(true);
  const stored = JSON.parse((await AsyncStorage.getItem(PROGRESS_KEY)) ?? 'null');
  expect(stored).toEqual(recordAnswer(freshProgress(), '2026-11-17', 10));
});

test('a write that fails reports it', async () => {
  await loadProgress();
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));
  expect(await updateProgress((p) => recordAnswer(p, '2026-11-17', 10))).toBe(false);
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { freshProgress, recordAnswer } from './progress';
import { PROGRESS_KEY, resetProgressStoreForTests, updateProgress } from './progressStore';
import { msUntilNextDay, toToday, useToday } from './useToday';

const now = new Date(2026, 10, 17, 9, 0);

beforeEach(async () => {
  resetProgressStoreForTests();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

test('loading and unavailable pass through without numbers', () => {
  expect(toToday({ status: 'loading' }, now)).toEqual({ status: 'loading' });
  expect(toToday({ status: 'unavailable', reason: 'read' }, now)).toEqual({ status: 'unavailable', reason: 'read' });
});

test('a fresh install is ready with true zeros and the default goal', () => {
  expect(toToday({ status: 'ready', progress: freshProgress() }, now)).toEqual({
    status: 'ready', answeredToday: 0, dailyGoal: 20, streakDays: 0, xp: 0,
  });
});

test("today's count, streak and points come from the save", () => {
  const progress = { ...freshProgress(), xp: 130, days: { '2026-11-16': 20, '2026-11-17': 7 } };
  expect(toToday({ status: 'ready', progress }, now)).toEqual({
    status: 'ready', answeredToday: 7, dailyGoal: 20, streakDays: 2, xp: 130,
  });
});

test('the next day starts just past local midnight', () => {
  expect(msUntilNextDay(new Date(2026, 10, 17, 23, 59, 59, 0))).toBe(1001);
});

test('the hook loads the save, then follows the store', async () => {
  jest.useFakeTimers({ now });
  const saved = { ...freshProgress(), xp: 130, days: { '2026-11-16': 20, '2026-11-17': 7 } };
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(saved));
  const { result } = await renderHook(() => useToday());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current).toMatchObject({ answeredToday: 7, streakDays: 2, xp: 130 });
  await act(async () => {
    await updateProgress((p) => recordAnswer(p, '2026-11-17', 10));
  });
  expect(result.current).toMatchObject({ answeredToday: 8, xp: 140 });
});

test('the hook starts a new day at midnight without being asked', async () => {
  jest.useFakeTimers({ now: new Date(2026, 10, 17, 23, 59, 59) });
  const saved = { ...freshProgress(), days: { '2026-11-17': 7 } };
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(saved));
  const { result } = await renderHook(() => useToday());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current).toMatchObject({ answeredToday: 7, streakDays: 1 });
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(result.current).toMatchObject({ answeredToday: 0, streakDays: 1 });
});

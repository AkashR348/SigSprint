import { freshProgress } from './progress';
import { toToday } from './useToday';

const now = new Date(2026, 10, 17, 9, 0);

test('loading and unavailable pass through without numbers', () => {
  expect(toToday({ status: 'loading' }, now)).toEqual({ status: 'loading' });
  expect(toToday({ status: 'unavailable' }, now)).toEqual({ status: 'unavailable' });
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

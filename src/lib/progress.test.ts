import { dayKey, freshProgress, parseProgress, recordAnswer, streakDays } from './progress';

test('a day key is the local calendar date', () => {
  expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
});

test('a sound save round-trips through JSON', () => {
  const saved = recordAnswer(freshProgress(), '2026-11-17', 10);
  expect(parseProgress(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
});

test.each([
  ['not an object', 'nope'],
  ['an unknown version', { version: 2, dailyGoal: 20, xp: 0, days: {} }],
  ['a negative count', { version: 1, dailyGoal: 20, xp: -1, days: {} }],
  ['a missing number', { version: 1, dailyGoal: 20, xp: null, days: {} }],
  ['a zero goal', { version: 1, dailyGoal: 0, xp: 0, days: {} }],
  ['a fractional day count', { version: 1, dailyGoal: 20, xp: 0, days: { '2026-11-17': 1.5 } }],
  ['a malformed day key', { version: 1, dailyGoal: 20, xp: 0, days: { today: 3 } }],
])('a save with %s is rejected, not zeroed', (_name, value) => {
  expect(parseProgress(value)).toBeNull();
});

test('recording an answer counts the day and adds the points without touching the old value', () => {
  const before = freshProgress();
  const after = recordAnswer(recordAnswer(before, '2026-11-17', 10), '2026-11-17', 5);
  expect(after.days['2026-11-17']).toBe(2);
  expect(after.xp).toBe(15);
  expect(before).toEqual(freshProgress());
});

test('a streak counts back from today across a month boundary', () => {
  const days = { '2026-10-30': 4, '2026-10-31': 1, '2026-11-01': 2 };
  expect(streakDays(days, '2026-11-01')).toBe(3);
});

test('a streak survives until the end of the next day, then breaks', () => {
  const days = { '2026-11-15': 3, '2026-11-16': 3 };
  expect(streakDays(days, '2026-11-17')).toBe(2);
  expect(streakDays(days, '2026-11-18')).toBe(0);
});

test('a day with zero answers does not extend a streak', () => {
  expect(streakDays({ '2026-11-16': 0, '2026-11-17': 1 }, '2026-11-17')).toBe(1);
  expect(streakDays({}, '2026-11-17')).toBe(0);
});

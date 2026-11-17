import { recoverySummary } from './recoveryText';

test('answers and points are both named', () => {
  expect(recoverySummary({ days: { '2026-11-16': 12, '2026-11-17': 1 }, answers: 13, xp: 130 })).toBe(
    'We found old saved data on this phone: 13 answers across 2 days and 130 points.',
  );
});

test('unreadable points are said to be unreadable, not zero', () => {
  expect(recoverySummary({ days: { '2026-11-16': 1 }, answers: 1, xp: null })).toBe(
    "We found old saved data on this phone: 1 answer across 1 day. Its points couldn't be read.",
  );
});

test('points alone say the daily answers were unreadable', () => {
  expect(recoverySummary({ days: {}, answers: 0, xp: 1 })).toBe(
    "We found old saved data on this phone: 1 point. Its daily answers couldn't be read.",
  );
});

test('nothing sound says nothing can be recovered', () => {
  expect(recoverySummary(null)).toContain('nothing can be recovered');
});

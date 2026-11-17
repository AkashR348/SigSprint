import { goalProgress } from './dailyGoal';

test('counts toward the goal', () => {
  expect(goalProgress(15, 20)).toEqual({ fraction: 0.75, remaining: 5, done: false });
});

test('going past the goal caps at full', () => {
  expect(goalProgress(26, 20)).toEqual({ fraction: 1, remaining: 0, done: true });
});

test('a real zero is progress, not an absence', () => {
  expect(goalProgress(0, 20)).toEqual({ fraction: 0, remaining: 20, done: false });
});

test('no goal or an unreadable count is null, never a zero', () => {
  expect(goalProgress(5, 0)).toBeNull();
  expect(goalProgress(Number.NaN, 20)).toBeNull();
});

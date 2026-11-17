import { goalLine, goalProgress, unavailableNotice } from './dailyGoal';

test('counts toward the goal', () => {
  expect(goalProgress(15, 20)).toEqual({ answered: 15, goal: 20, fraction: 0.75, remaining: 5, done: false });
});

test('going past the goal caps at full', () => {
  expect(goalProgress(26, 20)).toEqual({ answered: 26, goal: 20, fraction: 1, remaining: 0, done: true });
});

test('a real zero is progress, not an absence', () => {
  expect(goalProgress(0, 20)).toEqual({ answered: 0, goal: 20, fraction: 0, remaining: 20, done: false });
});

test('no goal or an unreadable count is null, never a zero', () => {
  expect(goalProgress(5, 0)).toBeNull();
  expect(goalProgress(Number.NaN, 20)).toBeNull();
});

test('the goal line names each state and never prints a number it does not have', () => {
  expect(goalLine('loading', null)).toBe('Loading your day');
  expect(goalLine('unavailable', null)).toBe("Couldn't load your progress");
  expect(goalLine('ready', goalProgress(3, 20))).toBe('3 of 20 questions');
  expect(goalLine('ready', goalProgress(Number.NaN, 20))).toBe('No daily goal to show yet');
  expect(goalLine('ready', goalProgress(0, 0))).toBe('No daily goal to show yet');
});

test('both unavailable notices say answers will not be saved', () => {
  expect(unavailableNotice('read')).toContain("won't be saved");
  expect(unavailableNotice('damaged')).toContain("won't be saved");
  expect(unavailableNotice('damaged')).toContain('Nothing has been erased');
});

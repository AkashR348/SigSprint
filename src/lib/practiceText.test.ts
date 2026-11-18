import { leaveNotice, scoreLine, setupSummary, shortNotice, unsavedNotice } from './practiceText';

test('the summary names questions, topics and time, with singulars', () => {
  expect(setupSummary(10, 3, 13)).toBe('10 questions · 3 topics · 13 minutes');
  expect(setupSummary(1, 1, 1)).toBe('1 question · 1 topic · 1 minute');
  expect(setupSummary(5, 2, null)).toBe('5 questions · 2 topics · no timer');
});

test('with no topic the summary asks for one', () => {
  expect(setupSummary(0, 0, null)).toBe('Pick at least one topic.');
});

test('a short pool is said plainly', () => {
  expect(shortNotice(12)).toBe('Only 12 questions are ready for these topics so far, so your test will have 12.');
  expect(shortNotice(1)).toBe('Only 1 question is ready for these topics so far, so your test will have 1.');
});

test('unsaved answers are counted, not hidden', () => {
  expect(unsavedNotice(1)).toBe("1 answer couldn't be saved on this phone, so it isn't in your streak, points or daily goal.");
  expect(unsavedNotice(3)).toBe("3 answers couldn't be saved on this phone, so they aren't in your streak, points or daily goal.");
});

test('the score reads as a count', () => {
  expect(scoreLine(8, 10)).toBe('8 of 10 correct');
});

test('the leave question only promises what was saved', () => {
  expect(leaveNotice(0, false)).toBe('The questions you have answered still count toward today.');
  expect(leaveNotice(0, true)).toBe('Your last answer is still being saved.');
  expect(leaveNotice(2, true)).toBe(unsavedNotice(2));
});

import type { Question } from '@/content/questions';

import { clock, clockSpoken, finish, next, pick, startRun, submit } from './practiceRun';

const q = (id: string, answer: 0 | 1 | 2 | 3): Question => ({
  id,
  domain: 'medications',
  stem: id,
  choices: ['a', 'b', 'c', 'd'],
  answer,
  explanation: 'because',
  source: { title: 't', url: 'https://www.fda.gov/x' },
});
const two = [q('one', 0), q('two', 1)];

test('a new run starts on the first question with nothing answered', () => {
  expect(startRun(two, 'each')).toEqual({ questions: two, showAnswers: 'each', index: 0, answers: [null, null], picked: null, revealed: false, done: false });
});

test('a run with no questions is already done', () => {
  expect(startRun([], 'each').done).toBe(true);
});

test('nothing is locked in until a choice is picked', () => {
  const run = startRun(two, 'each');
  expect(submit(run)).toBe(run);
  expect(pick(run, 4)).toBe(run);
});

test('showing each answer: submit reveals, the pick is then fixed, and next moves on', () => {
  const shown = submit(pick(pick(startRun(two, 'each'), 3), 2));
  expect(shown).toMatchObject({ index: 0, answers: [2, null], revealed: true, done: false });
  expect(pick(shown, 0)).toBe(shown);
  expect(submit(shown)).toBe(shown);
  expect(next(shown)).toMatchObject({ index: 1, picked: null, revealed: false, answers: [2, null] });
});

test('next does nothing before the answer is revealed', () => {
  const run = pick(startRun(two, 'each'), 1);
  expect(next(run)).toBe(run);
});

test('answers at the end: submit moves straight on and the last one ends the test', () => {
  const second = submit(pick(startRun(two, 'end'), 0));
  expect(second).toMatchObject({ index: 1, answers: [0, null], revealed: false, done: false });
  expect(submit(pick(second, 3))).toMatchObject({ answers: [0, 3], done: true });
});

test('the last revealed answer leads to the results', () => {
  const last = submit(pick(next(submit(pick(startRun(two, 'each'), 0))), 1));
  expect(last.done).toBe(false);
  expect(next(last)).toMatchObject({ answers: [0, 1], done: true });
});

test('finishing early leaves the rest unanswered, and a tapped choice is not an answer', () => {
  const ended = finish(pick(startRun(two, 'end'), 2));
  expect(ended).toMatchObject({ answers: [null, null], picked: null, done: true });
  expect(pick(ended, 1)).toBe(ended);
  expect(finish(ended)).toBe(ended);
});

test('the clock counts in minutes and seconds and never goes below zero', () => {
  expect(clock(734)).toBe('12:14');
  expect(clock(59.2)).toBe('1:00');
  expect(clock(5)).toBe('0:05');
  expect(clock(-3)).toBe('0:00');
  expect(clockSpoken(61)).toBe('Time left, 1 minute 1 second');
  expect(clockSpoken(120)).toBe('Time left, 2 minutes 0 seconds');
});

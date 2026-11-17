import type { Question } from '@/content/questions';

import type { Answers, TestConfig } from './practice';

// One test in progress. `picked` is the choice tapped but not yet locked in.
// `revealed`: the answer to the current question is on show (only when answers show after each).
export type Run = {
  questions: readonly Question[];
  showAnswers: TestConfig['showAnswers'];
  index: number;
  answers: Answers;
  picked: number | null;
  revealed: boolean;
  done: boolean;
};

export function startRun(questions: readonly Question[], showAnswers: TestConfig['showAnswers']): Run {
  return { questions, showAnswers, index: 0, answers: questions.map(() => null), picked: null, revealed: false, done: questions.length === 0 };
}

/** Taps a choice. An answer already locked in cannot be changed. */
export function pick(run: Run, choice: number): Run {
  if (run.done || run.revealed || choice < 0 || choice > 3) return run;
  return { ...run, picked: choice };
}

function advance(run: Run): Run {
  const last = run.index >= run.questions.length - 1;
  return last ? { ...run, picked: null, revealed: false, done: true } : { ...run, index: run.index + 1, picked: null, revealed: false };
}

/** Locks in the picked choice: shows the answer, or moves on when answers wait for the end. */
export function submit(run: Run): Run {
  if (run.done || run.revealed || run.picked === null) return run;
  const answers = run.answers.map((a, i) => (i === run.index ? run.picked : a));
  const locked = { ...run, answers };
  return run.showAnswers === 'each' ? { ...locked, revealed: true } : advance(locked);
}

/** Leaves a revealed answer for the next question, or for the results after the last. */
export function next(run: Run): Run {
  return run.done || !run.revealed ? run : advance(run);
}

/** Ends the test now, as when the timer runs out. A choice tapped but not locked in is not an answer. */
export function finish(run: Run): Run {
  return run.done ? run : { ...run, picked: null, revealed: false, done: true };
}

/** "12:05" for a countdown; never negative. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The same time in words for a screen reader. */
export function clockSpoken(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `Time left, ${m} ${m === 1 ? 'minute' : 'minutes'} ${s % 60} ${s % 60 === 1 ? 'second' : 'seconds'}`;
}

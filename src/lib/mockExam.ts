import { mockExam } from '@/content/domains';
import type { Question } from '@/content/questions';

import { EXAM_HISTORY_LIMIT, type ExamLength, type ExamMode, type ExamRecord, type SavedExam } from './mockSave';
import { defaultConfig, pickQuestions, scoreTest, XP_PER_CORRECT, XP_PER_WRONG, type Result } from './practice';
import { answeredOn, isDayKey, type Progress } from './progress';

// The half exam is half the real one, at the same pace and weighting.
export const examShapes: Record<ExamLength, { questions: number; minutes: number }> = {
  full: { questions: mockExam.questions, minutes: mockExam.minutes },
  half: { questions: mockExam.questions / 2, minutes: mockExam.minutes / 2 },
};

export const PASSING_SCORE = 1400;
export const WARNING_SECONDS = 600;

export function limitSeconds(length: ExamLength): number {
  return examShapes[length].minutes * 60;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A new exam drawn by exam weight, questions and choices in a fresh order; null if the pool is too small. */
export function drawExam(pool: readonly Question[], mode: ExamMode, length: ExamLength, now: number, random: () => number = Math.random): SavedExam | null {
  const count = examShapes[length].questions;
  const questions = pickQuestions(pool, { ...defaultConfig, count }, random);
  if (questions.length !== count) return null;
  const limit = limitSeconds(length) * 1000;
  return {
    mode,
    length,
    ids: questions.map((q) => q.id),
    orders: questions.map(() => shuffled(['0', '1', '2', '3'], random).join('')),
    answers: questions.map(() => null),
    flagged: [],
    index: 0,
    clock: mode === 'exam' ? now + limit : limit,
  };
}

/** The exam's questions in its order, or null if any is no longer in the pool. */
export function resolveExam(exam: SavedExam, pool: readonly Question[]): Question[] | null {
  const byId = new Map(pool.map((q) => [q.id, q]));
  const out: Question[] = [];
  for (const id of exam.ids) {
    const q = byId.get(id);
    if (!q) return null;
    out.push(q);
  }
  return out;
}

/** The stored positions of question `at`'s choices, in the order they are drawn. */
export function choiceOrder(exam: SavedExam, at: number): number[] {
  return [...(exam.orders[at] ?? '0123')].map(Number);
}

/** Answers the current question; `choice` is a stored position. An answer can be changed until the exam ends. */
export function answerCurrent(exam: SavedExam, choice: number): SavedExam {
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return exam;
  return { ...exam, answers: exam.answers.map((a, i) => (i === exam.index ? choice : a)) };
}

export function toggleFlag(exam: SavedExam): SavedExam {
  const on = exam.flagged.includes(exam.index);
  const flagged = on ? exam.flagged.filter((f) => f !== exam.index) : [...exam.flagged, exam.index].sort((a, b) => a - b);
  return { ...exam, flagged };
}

export function goTo(exam: SavedExam, index: number): SavedExam {
  if (!Number.isInteger(index) || index < 0 || index >= exam.ids.length) return exam;
  return { ...exam, index };
}

export function examCounts(exam: SavedExam): { answered: number; unanswered: number; flagged: number } {
  const answered = exam.answers.filter((a) => a !== null).length;
  return { answered, unanswered: exam.answers.length - answered, flagged: exam.flagged.length };
}

/** Milliseconds a saved exam has left at `now`, taking a relaxed one as stopped. */
export function savedMsLeft(exam: SavedExam, now: number): number {
  return Math.max(0, exam.mode === 'exam' ? exam.clock - now : exam.clock);
}

/** Whole seconds used when `msLeft` remain; never more than the limit. */
export function secondsUsed(length: ExamLength, msLeft: number): number {
  const limit = limitSeconds(length);
  return Math.min(limit, Math.max(0, limit - Math.ceil(msLeft / 1000)));
}

/** Points for a whole exam: a blank takes none. */
export function examPoints(result: Result): number {
  const wrong = result.total - result.correct - result.unanswered;
  return result.correct * XP_PER_CORRECT - wrong * XP_PER_WRONG;
}

/** A rough 1000 to 1600 figure from the share right, to the nearest 10; null with nothing to score. Not PTCB's method. */
export function estimateScore(correct: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((1000 + (600 * correct) / total) / 10) * 10;
}

export function estimateSide(estimate: number): 'above' | 'at' | 'below' {
  return estimate > PASSING_SCORE ? 'above' : estimate < PASSING_SCORE ? 'below' : 'at';
}

// A finished exam, before it is saved.
export type Outcome = { result: Result; record: ExamRecord; points: number; answered: number };

/** Scores an exam as it stands. Unanswered questions count as wrong. */
export function concludeExam(exam: SavedExam, questions: readonly Question[], msLeft: number, timedOut: boolean, now: number): Outcome {
  const result = scoreTest(questions, exam.answers);
  const record: ExamRecord = {
    at: now,
    mode: exam.mode,
    length: exam.length,
    correct: result.correct,
    total: result.total,
    seconds: secondsUsed(exam.length, timedOut ? 0 : msLeft),
    timedOut,
    byDomain: result.byDomain,
  };
  return { result, record, points: examPoints(result), answered: result.total - result.unanswered };
}

const sameExam = (a: SavedExam, b: SavedExam) => a.ids.length === b.ids.length && a.ids.every((id, i) => id === b.ids[i]);

/** Progress with a new exam in progress. Any exam already there is replaced, so ask first. */
export function startExam(progress: Progress, exam: SavedExam): Progress {
  return { ...progress, exam };
}

/** Progress with the exam in progress updated; null once that exam has ended, so a late save cannot bring it back. */
export function keepExam(progress: Progress, exam: SavedExam): Progress | null {
  if (!progress.exam || !sameExam(progress.exam, exam)) return null;
  return { ...progress, exam };
}

/** Progress with only the saved exam's clock moved, as when a relaxed exam is paused. */
export function keepClock(progress: Progress, msLeft: number): Progress | null {
  if (!progress.exam || progress.exam.mode !== 'relaxed') return null;
  return { ...progress, exam: { ...progress.exam, clock: Math.max(0, Math.floor(msLeft)) } };
}

/** Progress without the exam in progress. Nothing from it counts. */
export function quitExam(progress: Progress): Progress {
  const next = { ...progress };
  delete next.exam;
  return next;
}

/** Progress after the exam in progress ends: points and answered questions counted once, result kept. Null if none is in progress. */
export function finishExam(progress: Progress, outcome: Outcome, today: string): Progress | null {
  if (!progress.exam || !isDayKey(today)) return null;
  const next = quitExam(progress);
  next.xp = Math.max(0, progress.xp + outcome.points);
  if (outcome.answered > 0) next.days = { ...progress.days, [today]: answeredOn(progress.days, today) + outcome.answered };
  next.exams = [outcome.record, ...(progress.exams ?? [])].slice(0, EXAM_HISTORY_LIMIT);
  return next;
}

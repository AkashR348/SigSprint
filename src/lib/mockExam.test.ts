import { domains, type DomainId } from '@/content/domains';
import type { Question } from '@/content/questions';
import { starterQuestions } from '@/content/starterQuestions';

import {
  answerCurrent,
  choiceOrder,
  concludeExam,
  drawExam,
  estimateScore,
  estimateSide,
  examCounts,
  examPoints,
  finishExam,
  goTo,
  keepClock,
  keepExam,
  limitSeconds,
  quitExam,
  resolveExam,
  savedMsLeft,
  secondsUsed,
  startExam,
  toggleFlag,
} from './mockExam';
import { parseSavedExam, type ExamRecord, type SavedExam } from './mockSave';
import { scoreTest } from './practice';
import { freshProgress, parseProgress } from './progress';

const NOW = Date.UTC(2026, 10, 19, 18, 0, 0);

// A repeatable stand-in for Math.random.
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const full = (mode: SavedExam['mode'] = 'exam') => drawExam(starterQuestions, mode, 'full', NOW, seeded(1))!;
const perDomain = (questions: readonly Question[]) => {
  const out: Record<DomainId, number> = { medications: 0, federal: 0, safety: 0, orderEntry: 0 };
  for (const q of questions) out[q.domain] += 1;
  return out;
};

test('a full exam is 90 different questions, 110 minutes on a strict clock', () => {
  const exam = full();
  expect(exam.ids).toHaveLength(90);
  expect(new Set(exam.ids).size).toBe(90);
  expect(exam.clock).toBe(NOW + 110 * 60 * 1000);
  expect(limitSeconds('full')).toBe(6600);
  expect(perDomain(resolveExam(exam, starterQuestions)!)).toEqual({ medications: 32, federal: 17, safety: 21, orderEntry: 20 });
});

test('full exams leave out different questions when the pool has more than 90', () => {
  const left = (seed: number) => {
    const ids = new Set(drawExam(starterQuestions, 'exam', 'full', NOW, seeded(seed))!.ids);
    return starterQuestions.filter((q) => !ids.has(q.id));
  };
  const a = left(1);
  const b = left(2);
  expect(a).toHaveLength(starterQuestions.length - 90);
  expect(perDomain(a)).toEqual({ medications: 0, federal: 0, safety: 1, orderEntry: 5 });
  expect(a.map((q) => q.id)).not.toEqual(b.map((q) => q.id));
});

test('a half exam draws 16, 8, 11 and 10 at random, with 55 minutes left on a relaxed clock', () => {
  const a = drawExam(starterQuestions, 'relaxed', 'half', NOW, seeded(1))!;
  const b = drawExam(starterQuestions, 'relaxed', 'half', NOW, seeded(2))!;
  expect(a.ids).toHaveLength(45);
  expect(perDomain(resolveExam(a, starterQuestions)!)).toEqual({ medications: 16, federal: 8, safety: 11, orderEntry: 10 });
  expect(a.clock).toBe(55 * 60 * 1000);
  expect([...a.ids].sort()).not.toEqual([...b.ids].sort());
});

test('each exam has its questions and its choices in a new order', () => {
  const a = full();
  const b = drawExam(starterQuestions, 'exam', 'full', NOW, seeded(7))!;
  expect(a.ids).not.toEqual(b.ids);
  expect(a.orders.every((o) => [...o].sort().join('') === '0123')).toBe(true);
  expect(new Set(a.orders).size).toBeGreaterThan(1);
  expect(choiceOrder(a, 0)).toEqual([...a.orders[0]].map(Number));
});

test('a pool too small for the exam draws none, and what is drawn can be saved', () => {
  expect(drawExam(starterQuestions.slice(0, 80), 'exam', 'full', NOW)).toBeNull();
  expect(parseSavedExam(JSON.parse(JSON.stringify(full())))).toEqual(full());
});

test('an exam whose question has left the pool cannot be resolved', () => {
  const exam = full();
  expect(resolveExam(exam, starterQuestions.filter((q) => q.id !== exam.ids[3]))).toBeNull();
});

test('answers can be given, changed and skipped, and flags turn on and off', () => {
  let exam = full();
  exam = answerCurrent(exam, 2);
  exam = answerCurrent(exam, 1);
  expect(exam.answers[0]).toBe(1);
  expect(answerCurrent(exam, 4)).toBe(exam);
  exam = goTo(exam, 5);
  expect(goTo(exam, 90)).toBe(exam);
  exam = toggleFlag(exam);
  exam = toggleFlag(goTo(exam, 2));
  expect(exam.flagged).toEqual([2, 5]);
  expect(examCounts(exam)).toEqual({ answered: 1, unanswered: 89, flagged: 2 });
  expect(toggleFlag(exam).flagged).toEqual([5]);
});

test('the clock left and the time used come from the saved clock', () => {
  const strict = full();
  expect(savedMsLeft(strict, NOW + 60_000)).toBe(6600_000 - 60_000);
  expect(savedMsLeft(strict, NOW + 7000_000)).toBe(0);
  expect(savedMsLeft({ ...strict, mode: 'relaxed', clock: 5000 }, NOW + 60_000)).toBe(5000);
  expect(secondsUsed('full', 6600_000)).toBe(0);
  expect(secondsUsed('full', 6539_500)).toBe(60);
  expect(secondsUsed('half', -5)).toBe(3300);
});

test('the estimate is 1000 plus 600 times the share right, to the nearest 10', () => {
  expect(estimateScore(0, 90)).toBe(1000);
  expect(estimateScore(90, 90)).toBe(1600);
  expect(estimateScore(60, 90)).toBe(1400);
  expect(estimateScore(62, 90)).toBe(1410);
  expect(estimateScore(31, 45)).toBe(1410);
  expect(estimateScore(0, 0)).toBeNull();
  expect([estimateSide(1410), estimateSide(1400), estimateSide(1390)]).toEqual(['above', 'at', 'below']);
});

function answered(exam: SavedExam, questions: readonly Question[], right: number, wrong: number): SavedExam {
  const answers = exam.answers.map((_, i) => (i < right ? questions[i].answer : i < right + wrong ? (questions[i].answer + 1) % 4 : null));
  return { ...exam, answers };
}

test('a finished exam counts blanks as wrong but takes no points for them', () => {
  const exam = full();
  const questions = resolveExam(exam, starterQuestions)!;
  const done = answered(exam, questions, 60, 20);
  const outcome = concludeExam(done, questions, 600_000, false, NOW + 6000_000);
  expect(outcome.result).toMatchObject({ total: 90, correct: 60, unanswered: 10, percent: 67 });
  expect(outcome.points).toBe(60 * 10 - 20 * 5);
  expect(examPoints(scoreTest(questions, exam.answers))).toBe(0);
  expect(outcome.answered).toBe(80);
  expect(outcome.record).toMatchObject({ at: NOW + 6000_000, mode: 'exam', length: 'full', correct: 60, total: 90, seconds: 6000, timedOut: false });
  expect(outcome.record.byDomain.map((d) => d.id)).toEqual(domains.map((d) => d.id));
  expect(outcome.record.byDomain.reduce((n, d) => n + d.total, 0)).toBe(90);
});

test('an exam that ran out of time used all of it', () => {
  const exam = full();
  const outcome = concludeExam(exam, resolveExam(exam, starterQuestions)!, 4000, true, NOW);
  expect(outcome.record).toMatchObject({ seconds: 6600, timedOut: true, correct: 0 });
});

test('finishing adds the points and the answered questions once, keeps the result and clears the exam', () => {
  const exam = full();
  const questions = resolveExam(exam, starterQuestions)!;
  const outcome = concludeExam(answered(exam, questions, 60, 20), questions, 0, false, NOW);
  const before = { ...startExam(freshProgress(), exam), xp: 30, days: { '2026-11-19': 4 } };
  const after = finishExam(before, exam, outcome, '2026-11-19')!;
  expect(after).toMatchObject({ xp: 530, days: { '2026-11-19': 84 } });
  expect(after.exam).toBeUndefined();
  expect(after.exams).toEqual([outcome.record]);
  expect(parseProgress(JSON.parse(JSON.stringify(after)))).toEqual(after);
  // A second finish has no exam to end, so nothing is counted twice.
  expect(finishExam(after, exam, outcome, '2026-11-19')).toBeNull();
  expect(finishExam(before, exam, outcome, 'today')).toBeNull();
  // A late finish of one exam never ends another that took its place.
  const other = { ...exam, ids: [...exam.ids].reverse() };
  expect(finishExam(startExam(freshProgress(), other), exam, outcome, '2026-11-19')).toBeNull();
});

test('a losing exam stops the total at 0, and an exam with no answers adds no day', () => {
  const exam = full();
  const questions = resolveExam(exam, starterQuestions)!;
  const lost = finishExam({ ...startExam(freshProgress(), exam), xp: 20 }, exam, concludeExam(answered(exam, questions, 0, 30), questions, 0, false, NOW), '2026-11-19')!;
  expect(lost.xp).toBe(0);
  const blank = finishExam(startExam(freshProgress(), exam), exam, concludeExam(exam, questions, 0, true, NOW), '2026-11-19')!;
  expect(blank.days).toEqual({});
  expect(blank.exams).toHaveLength(1);
});

test('only the last 10 results are kept, newest first', () => {
  const exam = full();
  const questions = resolveExam(exam, starterQuestions)!;
  let progress = freshProgress();
  for (let i = 0; i < 12; i++) {
    progress = finishExam(startExam(progress, exam), exam, concludeExam(exam, questions, 0, false, NOW + i), '2026-11-19')!;
  }
  expect(progress.exams?.map((r: ExamRecord) => r.at)).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((i) => NOW + i));
});

test('a quit exam leaves nothing behind, and a late save cannot bring an ended exam back', () => {
  const exam = full();
  const started = startExam({ ...freshProgress(), xp: 50 }, exam);
  const quit = quitExam(started);
  expect(quit).toEqual({ ...freshProgress(), xp: 50 });
  expect(keepExam(quit, answerCurrent(exam, 1))).toBeNull();
  expect(keepExam(started, answerCurrent(exam, 1))?.exam?.answers[0]).toBe(1);
  expect(keepExam(started, drawExam(starterQuestions, 'exam', 'full', NOW, seeded(9))!)).toBeNull();
});

test('only a relaxed exam has a clock that can be moved', () => {
  expect(keepClock(startExam(freshProgress(), full()), 1000)).toBeNull();
  expect(keepClock(startExam(freshProgress(), full('relaxed')), 1234.9)?.exam?.clock).toBe(1234);
  expect(keepClock(freshProgress(), 1000)).toBeNull();
});

import { allocateQuestions, domains, mockExam, type DomainId } from '@/content/domains';
import type { Question } from '@/content/questions';

export const QUESTION_COUNTS = [5, 10, 15, 20, 25, 50] as const;

export type TestConfig = {
  domains: readonly DomainId[];
  count: number;
  timed: boolean;
  // `each`: the answer and explanation follow every question. `end`: only on the results screen.
  showAnswers: 'each' | 'end';
};

export const defaultConfig: TestConfig = {
  domains: domains.map((d) => d.id),
  count: 10,
  timed: false,
  showAnswers: 'each',
};

// Points for a correct answer. A wrong one earns none, and still counts toward the daily goal.
export const XP_PER_CORRECT = 10;

export function xpFor(question: Question, choice: number): number {
  return choice === question.answer ? XP_PER_CORRECT : 0;
}

/** How many questions the pool holds for the chosen topics. */
export function availableCount(pool: readonly Question[], ids: readonly DomainId[]): number {
  return pool.filter((q) => ids.includes(q.domain)).length;
}

type Params = Record<string, string | string[] | undefined>;

/** The setup screen's choices as route params. */
export function toParams(config: TestConfig): Record<string, string> {
  return { topics: config.domains.join(','), count: String(config.count), timed: config.timed ? '1' : '0', show: config.showAnswers };
}

/** A test config read back from route params, or null if any part is not one the setup screen offers. */
export function fromParams(params: Params): TestConfig | null {
  const { topics, count, timed, show } = params;
  if (typeof topics !== 'string' || typeof count !== 'string') return null;
  const asked = topics.split(',');
  const chosen = domains.map((d) => d.id).filter((id) => asked.includes(id));
  if (chosen.length === 0 || chosen.length !== asked.length) return null;
  const n = QUESTION_COUNTS.find((c) => String(c) === count);
  if (n === undefined || (timed !== '0' && timed !== '1') || (show !== 'each' && show !== 'end')) return null;
  return { domains: chosen, count: n, timed: timed === '1', showAnswers: show };
}

/** Seconds allowed for `count` questions at the real exam's pace. */
export function timeLimitSeconds(count: number): number {
  return Math.ceil((count * mockExam.minutes * 60) / mockExam.questions);
}

/** Whole minutes for the setup screen's estimate. */
export function estimateMinutes(count: number): number {
  return Math.ceil(timeLimitSeconds(count) / 60);
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type Picked = { questions: Question[]; requested: number };

/** Draws a test from the pool by exam weight. A domain that runs short is topped up from the others chosen. */
export function pickQuestions(pool: readonly Question[], config: TestConfig, random: () => number = Math.random): Picked {
  // Each topic once, however the list was written, so no question is drawn twice.
  const ids = domains.map((d) => d.id).filter((id) => config.domains.includes(id));
  const want = allocateQuestions(config.count, ids);
  const taken: Question[] = [];
  const spare: Question[] = [];
  for (const id of ids) {
    const mine = shuffled(pool.filter((q) => q.domain === id), random);
    taken.push(...mine.slice(0, want[id]));
    spare.push(...mine.slice(want[id]));
  }
  const missing = Math.max(0, Math.floor(config.count) - taken.length);
  taken.push(...shuffled(spare, random).slice(0, missing));
  return { questions: shuffled(taken, random), requested: config.count };
}

// null: not answered, which is not the same as wrong until the test ends.
export type Answers = readonly (number | null)[];

export type Result = {
  total: number;
  correct: number;
  unanswered: number;
  percent: number | null;
  byDomain: { id: DomainId; correct: number; total: number }[];
};

/** Scores a finished test. `percent` is null when there were no questions to score. */
export function scoreTest(questions: readonly Question[], answers: Answers): Result {
  let correct = 0;
  let unanswered = 0;
  const tally = new Map<DomainId, { correct: number; total: number }>();
  questions.forEach((q, i) => {
    const given = answers[i] ?? null;
    const row = tally.get(q.domain) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (given === null) unanswered += 1;
    else if (given === q.answer) {
      correct += 1;
      row.correct += 1;
    }
    tally.set(q.domain, row);
  });
  const total = questions.length;
  return {
    total,
    correct,
    unanswered,
    percent: total === 0 ? null : Math.round((correct / total) * 100),
    byDomain: domains.filter((d) => tally.has(d.id)).map((d) => ({ id: d.id, ...tally.get(d.id)! })),
  };
}

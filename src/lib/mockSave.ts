import { domains, type DomainId } from '@/content/domains';

// `exam`: the clock never stops. `relaxed`: it can be paused, and stops while the app is closed.
export type ExamMode = 'exam' | 'relaxed';
export type ExamLength = 'full' | 'half';

export const EXAM_HISTORY_LIMIT = 10;

// A mock exam in progress. `orders[i]` is the order question i's choices are drawn in, as their stored positions ("2031").
// `answers[i]` is the stored position chosen, or null. `clock` is when an `exam` ends (ms), or the ms a `relaxed` one has left.
export type SavedExam = {
  mode: ExamMode;
  length: ExamLength;
  ids: string[];
  orders: string[];
  answers: (number | null)[];
  flagged: number[];
  index: number;
  clock: number;
};

// A finished mock exam. `at` is when it ended (ms) and `seconds` the time it used.
export type ExamRecord = {
  at: number;
  mode: ExamMode;
  length: ExamLength;
  correct: number;
  total: number;
  seconds: number;
  timedOut: boolean;
  byDomain: { id: DomainId; correct: number; total: number }[];
};

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const isMode = (v: unknown): v is ExamMode => v === 'exam' || v === 'relaxed';
const isLength = (v: unknown): v is ExamLength => v === 'full' || v === 'half';
const isOrder = (v: unknown): v is string => typeof v === 'string' && v.length === 4 && [...v].sort().join('') === '0123';
const isAnswer = (v: unknown): v is number | null => v === null || (isCount(v) && v <= 3);

/** A stored exam in progress if every field is sound, else null. */
export function parseSavedExam(value: unknown): SavedExam | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isMode(v.mode) || !isLength(v.length) || !isCount(v.index) || !isCount(v.clock)) return null;
  const { ids, orders, answers, flagged } = v;
  if (!Array.isArray(ids) || !Array.isArray(orders) || !Array.isArray(answers) || !Array.isArray(flagged)) return null;
  const n = ids.length;
  if (n === 0 || orders.length !== n || answers.length !== n || v.index >= n) return null;
  if (!ids.every((id) => typeof id === 'string') || new Set(ids).size !== n) return null;
  if (!orders.every(isOrder) || !answers.every(isAnswer)) return null;
  if (!flagged.every((f) => isCount(f) && f < n) || new Set(flagged).size !== flagged.length) return null;
  return { mode: v.mode, length: v.length, ids: [...ids], orders: [...orders], answers: [...answers], flagged: [...flagged], index: v.index, clock: v.clock };
}

function parseRecord(value: unknown): ExamRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isCount(v.at) || !isMode(v.mode) || !isLength(v.length) || typeof v.timedOut !== 'boolean') return null;
  if (!isCount(v.correct) || !isCount(v.total) || !isCount(v.seconds) || v.total === 0 || v.correct > v.total) return null;
  if (!Array.isArray(v.byDomain)) return null;
  const byDomain: ExamRecord['byDomain'] = [];
  for (const row of v.byDomain as unknown[]) {
    const r = row as Partial<ExamRecord['byDomain'][number]> | null;
    if (typeof r !== 'object' || r === null) return null;
    const known = domains.find((d) => d.id === r.id);
    if (!known || !isCount(r.correct) || !isCount(r.total) || r.correct > r.total) return null;
    byDomain.push({ id: known.id, correct: r.correct, total: r.total });
  }
  return { at: v.at, mode: v.mode, length: v.length, correct: v.correct, total: v.total, seconds: v.seconds, timedOut: v.timedOut, byDomain };
}

/** The stored list of finished exams if every one is sound and the list is no longer than it may be, else null. */
export function parseExamRecords(value: unknown): ExamRecord[] | null {
  if (!Array.isArray(value) || value.length > EXAM_HISTORY_LIMIT) return null;
  const out: ExamRecord[] = [];
  for (const item of value) {
    const record = parseRecord(item);
    if (record === null) return null;
    out.push(record);
  }
  return out;
}

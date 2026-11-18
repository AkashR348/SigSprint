// What the phone remembers. `days` maps a local date (YYYY-MM-DD) to questions answered that day.
export type Progress = { version: 1; dailyGoal: number; xp: number; days: Record<string, number> };

export const DEFAULT_DAILY_GOAL = 20;

export function freshProgress(): Progress {
  return { version: 1, dailyGoal: DEFAULT_DAILY_GOAL, xp: 0, days: {} };
}

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written YYYY-MM-DD; 2026-02-30 is not one. */
export function isDayKey(key: string): boolean {
  const m = DAY_KEY.exec(key);
  return m !== null && dayKey(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) === key;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Stored progress if every field is sound, else null. A damaged save is never read as zeros. */
export function parseProgress(value: unknown): Progress | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || !isCount(v.dailyGoal) || v.dailyGoal === 0 || !isCount(v.xp)) return null;
  if (typeof v.days !== 'object' || v.days === null || Array.isArray(v.days)) return null;
  const days: Record<string, number> = {};
  for (const [key, count] of Object.entries(v.days)) {
    if (!isDayKey(key) || !isCount(count)) return null;
    days[key] = count;
  }
  return { version: 1, dailyGoal: v.dailyGoal, xp: v.xp, days };
}

/** The phone's local calendar day, so a streak turns over at the user's midnight. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayBefore(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/** Questions answered on a day. A checked save with no entry for the day means none were. */
export function answeredOn(days: Record<string, number>, day: string): number {
  return days[day] ?? 0;
}

/** Days in a row with an answer, ending today, or yesterday while today is still open. */
export function streakDays(days: Record<string, number>, today: string): number {
  let cursor = answeredOn(days, today) > 0 ? today : dayBefore(today);
  let streak = 0;
  while (answeredOn(days, cursor) > 0) {
    streak += 1;
    cursor = dayBefore(cursor);
  }
  return streak;
}

/** Progress after one answer on `today` that adds or takes `xp` points, or null if either is unsound. */
export function recordAnswer(progress: Progress, today: string, xp: number): Progress | null {
  if (!isDayKey(today) || !Number.isSafeInteger(xp)) return null;
  // A wrong answer takes points, but the total stops at 0.
  const total = Math.max(0, progress.xp + xp);
  const answered = answeredOn(progress.days, today) + 1;
  if (!isCount(total) || !isCount(answered)) return null;
  return { ...progress, xp: total, days: { ...progress.days, [today]: answered } };
}

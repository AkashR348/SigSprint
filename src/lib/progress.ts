// What the phone remembers. `days` maps a local date (YYYY-MM-DD) to questions answered that day.
export type Progress = { version: 1; dailyGoal: number; xp: number; days: Record<string, number> };

export const DEFAULT_DAILY_GOAL = 20;

export function freshProgress(): Progress {
  return { version: 1, dailyGoal: DEFAULT_DAILY_GOAL, xp: 0, days: {} };
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

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
    if (!DAY_KEY.test(key) || !isCount(count)) return null;
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

/** Days in a row with an answer, ending today, or yesterday while today is still open. */
export function streakDays(days: Record<string, number>, today: string): number {
  let cursor = (days[today] ?? 0) > 0 ? today : dayBefore(today);
  let streak = 0;
  while ((days[cursor] ?? 0) > 0) {
    streak += 1;
    cursor = dayBefore(cursor);
  }
  return streak;
}

/** Progress after one answered question worth `xp` points on the day `today`. */
export function recordAnswer(progress: Progress, today: string, xp: number): Progress {
  const gained = isCount(xp) ? xp : 0;
  return {
    ...progress,
    xp: progress.xp + gained,
    days: { ...progress.days, [today]: (progress.days[today] ?? 0) + 1 },
  };
}

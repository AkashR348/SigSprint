// What the phone remembers. `days` maps a local date (YYYY-MM-DD) to the answers and cards counted that day.
// `handledBackups` lists backups already recovered or set aside, so none is offered or counted twice.
// `cards` holds each flashcard's review schedule by card id; a card not in it has never been rated.
// `rated` is the last day the card counted toward that day's goal.
export type CardState = { due: string; gap: number; rated?: string };

export type Progress = {
  version: 1;
  dailyGoal: number;
  xp: number;
  days: Record<string, number>;
  handledBackups?: string[];
  cards?: Record<string, CardState>;
};

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
  const progress: Progress = { version: 1, dailyGoal: v.dailyGoal, xp: v.xp, days };
  if (v.handledBackups !== undefined) {
    if (!Array.isArray(v.handledBackups) || !v.handledBackups.every((k) => typeof k === 'string')) return null;
    progress.handledBackups = [...v.handledBackups];
  }
  if (v.cards !== undefined) {
    if (typeof v.cards !== 'object' || v.cards === null || Array.isArray(v.cards)) return null;
    const cards: [string, CardState][] = [];
    for (const [id, state] of Object.entries(v.cards)) {
      const s = state as Partial<CardState> | null;
      if (typeof s !== 'object' || s === null || typeof s.due !== 'string' || !isDayKey(s.due) || !isCount(s.gap)) return null;
      if (s.rated !== undefined && (typeof s.rated !== 'string' || !isDayKey(s.rated))) return null;
      cards.push([id, s.rated === undefined ? { due: s.due, gap: s.gap } : { due: s.due, gap: s.gap, rated: s.rated }]);
    }
    // fromEntries makes every id an own key, a "__proto__" one included.
    progress.cards = Object.fromEntries(cards);
  }
  return progress;
}

// What could be trusted in a damaged save. `xp` is null when the points were unreadable, not zero.
export type Salvage = { days: Record<string, number>; answers: number; xp: number | null };

/** The sound parts of a damaged save, or null when no part of it can be trusted. */
export function salvageProgress(value: unknown): Salvage | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const days: Record<string, number> = {};
  let answers = 0;
  if (typeof v.days === 'object' && v.days !== null && !Array.isArray(v.days)) {
    for (const [key, count] of Object.entries(v.days)) {
      if (!isDayKey(key) || !isCount(count) || count === 0 || !isCount(answers + count)) continue;
      days[key] = count;
      answers += count;
    }
  }
  const xp = isCount(v.xp) ? v.xp : null;
  if (answers === 0 && (xp === null || xp === 0)) return null;
  return { days, answers, xp };
}

/** The handled-backup keys still readable in a damaged save, so starting fresh does not forget them. */
export function salvageHandled(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return [];
  const list = (value as Record<string, unknown>).handledBackups;
  return Array.isArray(list) ? list.filter((k): k is string => typeof k === 'string') : [];
}

/** Current progress with a backup's sound parts added in, and every key in `backupKeys` marked handled. */
export function mergeRecovered(progress: Progress, found: Salvage | null, backupKeys: readonly string[]): Progress | null {
  const days = { ...progress.days };
  let xp = progress.xp;
  if (found !== null) {
    for (const [key, count] of Object.entries(found.days)) days[key] = answeredOn(days, key) + count;
    xp += found.xp ?? 0;
  }
  const handled = [...new Set([...(progress.handledBackups ?? []), ...backupKeys])];
  return parseProgress({ ...progress, xp, days, handledBackups: handled });
}

/** The phone's local calendar day, so a streak turns over at the user's midnight. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The day `days` after `key`; negative goes back. */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days));
}

const dayBefore = (key: string) => addDays(key, -1);

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

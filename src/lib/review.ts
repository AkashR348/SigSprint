import { addDays, answeredOn, isDayKey, type CardState, type Progress } from './progress';

export type Rating = 'again' | 'good' | 'easy';
export const RATINGS: readonly Rating[] = ['again', 'good', 'easy'];

// Days. Good starts at 2 and doubles; Easy starts at 5 and triples; no gap passes MAX_GAP.
const FIRST_GAP = { good: 2, easy: 5 } as const;
const GROWTH = { good: 2, easy: 3 } as const;
export const MAX_GAP = 60;

// Most cards in one sitting.
export const SESSION_LIMIT = 20;

/** Days until a card comes back. Again is 0: it returns in this session and is due today. */
export function nextGap(previous: number | undefined, rating: Rating): number {
  if (rating === 'again') return 0;
  return Math.min(MAX_GAP, Math.max(FIRST_GAP[rating], (previous ?? 0) * GROWTH[rating]));
}

/** Progress after one card is rated on `today`. A card counts toward a day once, however often it is rated, and adds no points. */
export function rateCard(progress: Progress, today: string, id: string, rating: Rating): Progress | null {
  if (!isDayKey(today) || id === '') return null;
  const before = progress.cards?.[id];
  const gap = nextGap(before?.gap, rating);
  const cards = { ...progress.cards, [id]: { due: addDays(today, gap), gap, rated: today } };
  if (before?.rated === today) return { ...progress, cards };
  const answered = answeredOn(progress.days, today) + 1;
  if (!Number.isSafeInteger(answered)) return null;
  return { ...progress, days: { ...progress.days, [today]: answered }, cards };
}

type States = Readonly<Record<string, CardState>> | undefined;

/** How many of `ids` are due again and how many were never rated. Day keys sort as text. */
export function countReady(ids: readonly string[], states: States, today: string): { review: number; fresh: number } {
  let review = 0;
  let fresh = 0;
  for (const id of ids) {
    const state = states?.[id];
    if (state === undefined) fresh += 1;
    else if (state.due <= today) review += 1;
  }
  return { review, fresh };
}

/** The cards for one sitting: those due longest first, then new ones in deck order, up to `limit`. */
export function sessionCards<T extends { id: string }>(deck: readonly T[], states: States, today: string, limit = SESSION_LIMIT): T[] {
  const due = deck
    .filter((c) => states?.[c.id] !== undefined && states[c.id].due <= today)
    .sort((a, b) => (states?.[a.id].due ?? '').localeCompare(states?.[b.id].due ?? ''));
  const fresh = deck.filter((c) => states?.[c.id] === undefined);
  return [...due, ...fresh].slice(0, limit);
}

/** The soonest day one of `ids` falls due after today, or null when none is scheduled. */
export function nextDue(ids: readonly string[], states: States, today: string): string | null {
  let soonest: string | null = null;
  for (const id of ids) {
    const due = states?.[id]?.due;
    if (due !== undefined && due > today && (soonest === null || due < soonest)) soonest = due;
  }
  return soonest;
}

/** Whole days from `from` to `to`, both day keys. */
export function daysBetween(from: string, to: string): number {
  const at = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((at(to) - at(from)) / 86_400_000);
}

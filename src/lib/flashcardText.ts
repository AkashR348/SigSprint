import type { Rating } from './review';

export type Direction = 'brand' | 'generic';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const directionName: Record<Direction, string> = { brand: 'Brand to generic', generic: 'Generic to brand' };

/** The route's `direction` value, or null when it is not one. */
export function toDirection(value: unknown): Direction | null {
  return value === 'brand' || value === 'generic' ? value : null;
}

export const ratingName: Record<Rating, string> = { again: 'Again', good: 'Good', easy: 'Easy' };

/** When a card comes back after a rating, as drawn under the button. */
export function gapLabel(gap: number): string {
  return gap === 0 ? 'soon' : plural(gap, 'day', 'days');
}

export function ratingSpoken(rating: Rating, gap: number): string {
  return gap === 0 ? `${ratingName[rating]}, shows this card again soon` : `${ratingName[rating]}, shows this card again in ${plural(gap, 'day', 'days')}`;
}

function inDays(days: number): string {
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

/** The line above Start. `nextIn` is days until the next card is due, or null when none is scheduled. */
export function readyLine(review: number, fresh: number, sitting: number, nextIn: number | null): string {
  const total = review + fresh;
  if (total === 0) return nextIn === null ? 'There are no cards yet.' : `Nothing is due today. Your next card is due ${inDays(nextIn)}.`;
  const parts = [review > 0 ? `${review} to review` : null, fresh > 0 ? `${fresh} new` : null].filter((p) => p !== null);
  const ready = `${plural(total, 'card', 'cards')} ready: ${parts.join(', ')}.`;
  return sitting < total ? `${ready} This sitting has ${sitting}.` : ready;
}

/** The deck's name on a tile. It says how many cards there are, since the top 200 are not all here yet. */
export function deckLabel(cards: number): string {
  return `Top drugs: ${cards} so far`;
}

export const flashcardRule = "Each card counts once a day toward today's goal. Cards give no XP.";
export const flashcardsLoading = 'Loading your cards…';
export const flashcardsBroken = "Flashcards couldn't be set up. Go back and try again.";
export const flashcardsNeedSave = "Flashcards need your saved progress to plan reviews, and it can't be read right now.";
export const cardUnsaved = "That rating couldn't be saved on this phone. Try again.";

/** Said when a sitting ends. `ready` is how many cards in the whole deck can still be studied today. */
export function doneLine(cards: number, ready: number, nextIn: number | null): string {
  const rated = `You went through ${plural(cards, 'card', 'cards')}.`;
  if (ready > 0) return `${rated} ${ready === 1 ? '1 more card is' : `${ready} more cards are`} ready now.`;
  return nextIn === null ? rated : `${rated} Your next card is due ${inDays(nextIn)}.`;
}

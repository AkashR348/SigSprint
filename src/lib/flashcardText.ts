import type { Rating } from './review';

export type Direction = 'brand' | 'generic';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Which set of cards a sitting draws from, as chosen on the setup screen and carried in the route.
export type Deck = 'drugs' | 'boxed';
export const DECKS: readonly { value: Deck; label: string }[] = [
  { value: 'drugs', label: 'Drug names' },
  { value: 'boxed', label: 'Boxed warnings' },
];

/** The route's `deck` value, or null when it is not one. */
export function toDeck(value: unknown): Deck | null {
  return value === 'drugs' || value === 'boxed' ? value : null;
}

/** What the setup screen says about a deck of `cards` cards. */
export function deckIntro(deck: Deck, cards: number): string {
  if (deck === 'boxed') {
    return `${plural(cards, 'drug', 'drugs')} in the deck whose FDA label has a boxed warning. See the drug, say the warning, then check the card and rate how well you knew it.`;
  }
  return `${cards} of the top 200 drugs so far. See one name, say the other, then check the card and rate how well you knew it.`;
}

/** The line over the progress bar while studying. */
export function sittingTitle(deck: Deck, direction: Direction): string {
  return deck === 'boxed' ? 'Boxed warnings' : `Top drugs · ${directionName[direction]}`;
}

export const directionName: Record<Direction, string> = { brand: 'Brand to generic', generic: 'Generic to brand' };

/** The route's `direction` value, or null when it is not one. */
export function toDirection(value: unknown): Direction | null {
  return value === 'brand' || value === 'generic' ? value : null;
}

// How many cards a sitting holds, as chosen on the setup screen and carried in the route.
export type Sitting = '10' | '20' | 'all';
export const SITTINGS: readonly { value: Sitting; label: string }[] = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: 'all', label: 'All' },
];
export const DEFAULT_SITTING: Sitting = '20';

/** The most cards for the route's `size` value, or null when it is not one. All has no limit. */
export function sittingLimit(value: unknown): number | null {
  if (value === '10') return 10;
  if (value === '20') return 20;
  return value === 'all' ? Number.POSITIVE_INFINITY : null;
}

export const NAME_SIZE = 36;
const NAME_FLOOR = 16;
// Width of an average Nunito Black letter, as a share of the font size.
const LETTER = 0.66;

/** Font size for a drug name so its longest word fits `width` at the phone's text scale, and never breaks inside a word. */
export function nameSize(name: string, width: number, fontScale: number): number {
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length));
  if (longest === 0 || !(width > 0) || !(fontScale > 0)) return NAME_SIZE;
  return Math.max(NAME_FLOOR, Math.min(NAME_SIZE, Math.floor(width / (longest * LETTER * fontScale))));
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

// Under "Flashcards" on the Home and Study tiles: both decks, so neither is hidden behind setup.
export const flashcardsTile = 'Drug names and boxed warnings';

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

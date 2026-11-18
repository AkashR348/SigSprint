import { boxedWarnings } from '@/content/boxedWarnings';
import { drugCards } from '@/content/drugCards';

import { drugFace, warningFace, type Face } from './flashcardFace';
import type { Deck, Direction } from './flashcardText';

// Each deck in one place: its card ids, how its cards are drawn, and whether it asks in two directions.
type DeckInfo = { ids: readonly string[]; twoWay: boolean; faces: (direction: Direction) => Face[] };

export const decks: Record<Deck, DeckInfo> = {
  drugs: { ids: drugCards.map((c) => c.id), twoWay: true, faces: (direction) => drugCards.map((c) => drugFace(c, direction)) },
  boxed: { ids: boxedWarnings.map((c) => c.id), twoWay: false, faces: () => boxedWarnings.map(warningFace) },
};

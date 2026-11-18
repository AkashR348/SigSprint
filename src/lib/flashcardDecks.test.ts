import { boxedWarnings } from '@/content/boxedWarnings';
import { drugCards } from '@/content/drugCards';

import { decks } from './flashcardDecks';

test('each deck lists its own cards and draws one face per card, in order', () => {
  expect(decks.drugs.ids).toEqual(drugCards.map((c) => c.id));
  expect(decks.boxed.ids).toEqual(boxedWarnings.map((c) => c.id));
  expect(decks.drugs.faces('generic').map((f) => f.id)).toEqual(decks.drugs.ids);
  expect(decks.boxed.faces('generic').map((f) => f.id)).toEqual(decks.boxed.ids);
});

test('only the drug names deck asks in two directions', () => {
  expect(decks.drugs.twoWay).toBe(true);
  expect(decks.boxed.twoWay).toBe(false);
  expect(decks.drugs.faces('brand')[0].name).toBe(drugCards[0].brand);
  expect(decks.drugs.faces('generic')[0].name).toBe(drugCards[0].generic);
  expect(decks.boxed.faces('brand')).toEqual(decks.boxed.faces('generic'));
});

test('no card id is in both decks', () => {
  expect(decks.boxed.ids.filter((id) => decks.drugs.ids.includes(id))).toEqual([]);
});

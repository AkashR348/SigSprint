import { boxedWarnings } from './boxedWarnings';
import { drugCards } from './drugCards';

test('there are 12 warning cards, one per drug, each with its own id', () => {
  expect(boxedWarnings).toHaveLength(12);
  expect(new Set(boxedWarnings.map((w) => w.id)).size).toBe(12);
  expect(new Set(boxedWarnings.map((w) => w.generic)).size).toBe(12);
});

test.each(boxedWarnings.map((w) => [w.id, w] as const))('%s names a drug in the deck and cites that drug\'s own label', (_, card) => {
  const drug = drugCards.find((d) => d.generic === card.generic);
  expect(drug).toBeDefined();
  expect(card.id).toBe(`boxed-${drug?.id.slice('drug-'.length)}`);
  expect(card.brand).toBe(drug?.brand);
  expect(card.source).toEqual(drug?.source);
  expect(new URL(card.source.url).hostname).toBe('dailymed.nlm.nih.gov');
  expect(card.heading.trim().length).toBeGreaterThan(5);
  expect(card.detail.trim().length).toBeGreaterThan(40);
});

test('no warning card shares an id with a drug card, so their schedules stay apart', () => {
  const drugIds = new Set(drugCards.map((d) => d.id));
  expect(boxedWarnings.filter((w) => drugIds.has(w.id))).toEqual([]);
});

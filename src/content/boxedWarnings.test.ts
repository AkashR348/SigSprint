import { boxedWarnings } from './boxedWarnings';
import { drugCards } from './drugCards';

test('there are 13 warning cards, one per drug, each with its own id', () => {
  expect(boxedWarnings).toHaveLength(13);
  expect(new Set(boxedWarnings.map((w) => w.id)).size).toBe(13);
  expect(new Set(boxedWarnings.map((w) => w.generic)).size).toBe(13);
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

// Drugs whose label was read and found to carry no boxed warning in its Highlights.
const noBoxedWarning = [
  'drug-amlodipine',
  'drug-metoprolol-succinate',
  'drug-atorvastatin',
  'drug-rosuvastatin',
  'drug-sitagliptin',
  'drug-insulin-glargine',
  'drug-omeprazole',
  'drug-pantoprazole',
  'drug-azithromycin',
  'drug-albuterol',
  'drug-tamsulosin',
];

test('every drug card either has a warning card or is listed as checked and found to have none', () => {
  const withWarning = boxedWarnings.map((w) => w.id.replace(/^boxed-/, 'drug-'));
  expect(withWarning.filter((id) => noBoxedWarning.includes(id))).toEqual([]);
  expect(drugCards.map((d) => d.id).filter((id) => !withWarning.includes(id) && !noBoxedWarning.includes(id))).toEqual([]);
  expect(noBoxedWarning.filter((id) => !drugCards.some((d) => d.id === id))).toEqual([]);
});

test('only the furosemide card carries a note, saying its warning is not coded as boxed', () => {
  expect(boxedWarnings.filter((w) => w.note !== undefined).map((w) => w.id)).toEqual(['boxed-furosemide']);
  expect(boxedWarnings.find((w) => w.id === 'boxed-furosemide')?.note).toMatch(/does not code it as a boxed warning/);
});

test('no warning card shares an id with a drug card, so their schedules stay apart', () => {
  const drugIds = new Set(drugCards.map((d) => d.id));
  expect(boxedWarnings.filter((w) => drugIds.has(w.id))).toEqual([]);
});

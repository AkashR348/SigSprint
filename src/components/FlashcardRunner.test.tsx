import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import type { DrugCard } from '@/content/drugCards';
import { drugFace, warningFace } from '@/lib/flashcardFace';
import type { Direction } from '@/lib/flashcardText';
import { addDays, dayKey } from '@/lib/progress';
import { loadProgress, PROGRESS_KEY, resetProgressStoreForTests } from '@/lib/progressStore';

import { FlashcardRunner } from './FlashcardRunner';

const card = (n: string, trick?: string): DrugCard => ({
  id: `drug-${n}`,
  brand: `Brand${n}`,
  generic: `generic${n}`,
  drugClass: `Class ${n}`,
  usedFor: `Use ${n}`,
  watchFor: `Watch ${n}`,
  trick,
  source: { title: `Brand${n} label, DailyMed`, url: 'https://dailymed.nlm.nih.gov/x' },
});
const two = [card('A', 'Names ending in -a are things.'), card('B')];
const faces = (cards: DrugCard[], direction: Direction) => cards.map((c) => drugFace(c, direction));
const ids = (cards: DrugCard[]) => cards.map((c) => c.id);
const onLeave = jest.fn();
const today = () => dayKey(new Date());

async function stored() {
  const raw = await AsyncStorage.getItem(PROGRESS_KEY);
  return raw === null ? null : JSON.parse(raw);
}

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(async () => {
  resetProgressStoreForTests();
  await AsyncStorage.clear();
  await loadProgress();
  jest.clearAllMocks();
});

test('a card shows one name, and its facts and source only after Show answer', async () => {
  await render(<FlashcardRunner cards={faces(two, 'brand')} deckIds={ids(two)} title="Deck title" onLeave={onLeave} />);
  expect(screen.getByText('What is the generic name for')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'BrandA' })).toBeTruthy();
  expect(screen.queryByText('genericA')).toBeNull();
  expect(screen.queryByRole('button', { name: /Good/ })).toBeNull();
  await press('Show answer');
  expect(screen.getByRole('header', { name: 'BrandA is genericA' })).toBeTruthy();
  expect(screen.getByText('Class A')).toBeTruthy();
  expect(screen.getByText('Use A')).toBeTruthy();
  expect(screen.getByText('Watch A')).toBeTruthy();
  expect(screen.getByText('Memory trick: Names ending in -a are things.')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Source: BrandA label, DailyMed' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Source: WHO INN Stem Book 2013' })).toBeTruthy();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('generic to brand asks with the generic name', async () => {
  await render(<FlashcardRunner cards={faces(two, 'generic')} deckIds={ids(two)} title="Deck title" onLeave={onLeave} />);
  expect(screen.getByText('What is the brand name for')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'genericA' })).toBeTruthy();
  await press('Show answer');
  expect(screen.getByRole('header', { name: 'genericA is BrandA' })).toBeTruthy();
});

test('a card with no trick shows none, and no stem source', async () => {
  await render(<FlashcardRunner cards={faces([two[1]], 'brand')} deckIds={ids(two)} title="Deck title" onLeave={onLeave} />);
  await press('Show answer');
  expect(screen.queryByText(/Memory trick/)).toBeNull();
  expect(screen.queryByRole('link', { name: /Stem Book/ })).toBeNull();
});

test('Good saves a 2 day gap, counts toward today with no points, and moves on', async () => {
  await render(<FlashcardRunner cards={faces(two, 'brand')} deckIds={ids(two)} title="Deck title" onLeave={onLeave} />);
  await press('Show answer');
  await press('Good, shows this card again in 2 days');
  expect(await screen.findByRole('header', { name: 'BrandB' })).toBeTruthy();
  expect(await stored()).toMatchObject({
    xp: 0,
    days: { [today()]: 1 },
    cards: { 'drug-A': { due: addDays(today(), 2), gap: 2, rated: today() } },
  });
});

test('a card rated Again and then Good counts once toward today', async () => {
  await render(<FlashcardRunner cards={faces([two[0]], 'brand')} deckIds={ids(two)} title="Deck title" onLeave={onLeave} />);
  await press('Show answer');
  await press('Again, shows this card again soon');
  await screen.findByText('What is the generic name for');
  expect(await stored()).toMatchObject({ days: { [today()]: 1 }, cards: { 'drug-A': { due: today(), gap: 0 } } });
  await press('Show answer');
  await press('Again, shows this card again soon');
  await screen.findByText('What is the generic name for');
  await press('Show answer');
  await press('Good, shows this card again in 2 days');
  await screen.findByText('All done for now');
  expect(await stored()).toMatchObject({ days: { [today()]: 1 }, cards: { 'drug-A': { due: addDays(today(), 2), gap: 2 } } });
});

test('the end says cards outside the sitting are still ready, not when the next is due', async () => {
  await render(<FlashcardRunner cards={faces([two[0]], 'brand')} deckIds={ids(two)} title="Deck title" onLeave={onLeave} />);
  await press('Show answer');
  await press('Good, shows this card again in 2 days');
  expect(await screen.findByText('You went through 1 card. 1 more card is ready now.')).toBeTruthy();
  expect(screen.queryByText(/next card is due/)).toBeNull();
});

test('the end says when the next card is due once the whole deck is done for today', async () => {
  await render(<FlashcardRunner cards={faces([two[0]], 'brand')} deckIds={ids([two[0]])} title="Deck title" onLeave={onLeave} />);
  await press('Show answer');
  await press('Good, shows this card again in 2 days');
  expect(await screen.findByText('You went through 1 card. Your next card is due in 2 days.')).toBeTruthy();
});

test('each side is given focus and nothing is announced on top of it', async () => {
  const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  await render(<FlashcardRunner cards={faces([two[0]], 'brand')} deckIds={ids([two[0]])} title="Deck title" onLeave={onLeave} />);
  expect(focus).not.toHaveBeenCalled();
  await press('Show answer');
  expect(focus).toHaveBeenCalledTimes(1);
  await press('Good, shows this card again in 2 days');
  await screen.findByText('All done for now');
  expect(focus).toHaveBeenCalledTimes(2);
  expect(announce).not.toHaveBeenCalled();
});

test('Easy saves 5 days, and a card rated before offers its grown gaps', async () => {
  await AsyncStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({ version: 1, dailyGoal: 20, xp: 0, days: {}, cards: { 'drug-A': { due: today(), gap: 4 } } }),
  );
  resetProgressStoreForTests();
  await loadProgress();
  await render(<FlashcardRunner cards={faces(two, 'brand')} deckIds={ids(two)} title="Deck title" onLeave={onLeave} />);
  await press('Show answer');
  expect(screen.getByRole('button', { name: 'Good, shows this card again in 8 days' })).toBeTruthy();
  await press('Easy, shows this card again in 12 days');
  await screen.findByRole('header', { name: 'BrandB' });
  await press('Show answer');
  await press('Easy, shows this card again in 5 days');
  await screen.findByText('All done for now');
  expect(await stored()).toMatchObject({
    cards: { 'drug-A': { due: addDays(today(), 12), gap: 12 }, 'drug-B': { due: addDays(today(), 5), gap: 5 } },
  });
});

test('Again brings the card back in the same sitting, and the sitting ends only when every card is rated Good or Easy', async () => {
  await render(<FlashcardRunner cards={faces(two, 'brand')} deckIds={ids(two)} title="Deck title" onLeave={onLeave} />);
  await press('Show answer');
  await press('Again, shows this card again soon');
  await screen.findByRole('header', { name: 'BrandB' });
  expect(await stored()).toMatchObject({ days: { [today()]: 1 }, cards: { 'drug-A': { due: today(), gap: 0 } } });
  await press('Show answer');
  await press(/^Good/);
  expect(await screen.findByRole('header', { name: 'BrandA' })).toBeTruthy();
  await press('Show answer');
  await press(/^Good/);
  expect(await screen.findByText('All done for now')).toBeTruthy();
  expect(screen.getByText('You went through 2 cards. Your next card is due in 2 days.')).toBeTruthy();
  expect(await stored()).toMatchObject({ days: { [today()]: 2 } });
  await press('Done');
  expect(onLeave).toHaveBeenCalledTimes(1);
});

test('a rating that cannot be saved says so and keeps the card, so nothing unsaved is shown as done', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));
  await render(<FlashcardRunner cards={faces(two, 'brand')} deckIds={ids(two)} title="Deck title" onLeave={onLeave} />);
  await press('Show answer');
  await press(/^Good/);
  expect(await screen.findByText("That rating couldn't be saved on this phone. Try again.")).toBeTruthy();
  expect(screen.getByRole('header', { name: 'BrandA is genericA' })).toBeTruthy();
  expect(await stored()).toBeNull();
  await press(/^Good/);
  expect(await screen.findByRole('header', { name: 'BrandB' })).toBeTruthy();
  expect(screen.queryByText(/couldn't be saved/)).toBeNull();
  expect(await stored()).toMatchObject({ days: { [today()]: 1 } });
});

test('the progress bar counts finished cards, and close leaves at once', async () => {
  await render(<FlashcardRunner cards={faces(two, 'brand')} deckIds={ids(two)} title="Deck title" onLeave={onLeave} />);
  expect(screen.getByRole('progressbar', { name: 'Card 1 of 2', value: { now: 0, max: 2 } })).toBeTruthy();
  await press('Show answer');
  await press(/^Easy/);
  expect(await screen.findByRole('progressbar', { name: 'Card 2 of 2', value: { now: 1, max: 2 } })).toBeTruthy();
  await press('Close flashcards');
  expect(onLeave).toHaveBeenCalledTimes(1);
});

test('a boxed warning card shows the drug, then its warning, detail and label, with no facts table', async () => {
  const warning = warningFace({
    id: 'boxed-A',
    brand: 'BrandA',
    generic: 'genericA',
    heading: 'Fetal toxicity',
    detail: 'Stop it as soon as pregnancy is detected.',
    source: { title: 'BrandA label, DailyMed', url: 'https://dailymed.nlm.nih.gov/x' },
  });
  await render(<FlashcardRunner cards={[warning]} deckIds={['boxed-A']} title="Boxed warnings" onLeave={onLeave} />);
  expect(screen.getByText('Boxed warnings')).toBeTruthy();
  expect(screen.getByText('What is the boxed warning for')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'BrandA (genericA)' })).toBeTruthy();
  expect(screen.queryByText('Fetal toxicity')).toBeNull();
  await press('Show answer');
  expect(screen.getByRole('header', { name: 'BrandA (genericA): Fetal toxicity' })).toBeTruthy();
  expect(screen.getByText('Stop it as soon as pregnancy is detected.')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Source: BrandA label, DailyMed' })).toBeTruthy();
  expect(screen.queryByText('Class')).toBeNull();
  expect(screen.queryByText(/^Note:/)).toBeNull();
  await press('Easy, shows this card again in 5 days');
  await screen.findByText('All done for now');
  expect(await stored()).toMatchObject({ xp: 0, days: { [today()]: 1 }, cards: { 'boxed-A': { due: addDays(today(), 5), gap: 5 } } });
});

test('a warning card with a note shows it under the warning', async () => {
  const warning = warningFace({
    id: 'boxed-A',
    brand: 'BrandA',
    generic: 'genericA',
    heading: 'Profound diuresis',
    detail: 'A potent diuretic.',
    note: 'Not coded as a boxed warning.',
    source: { title: 'BrandA label, DailyMed', url: 'https://dailymed.nlm.nih.gov/x' },
  });
  await render(<FlashcardRunner cards={[warning]} deckIds={['boxed-A']} title="Boxed warnings" onLeave={onLeave} />);
  expect(screen.queryByText(/^Note:/)).toBeNull();
  await press('Show answer');
  expect(screen.getByText('Note: Not coded as a boxed warning.')).toBeTruthy();
});

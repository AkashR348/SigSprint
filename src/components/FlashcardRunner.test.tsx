import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { DrugCard } from '@/content/drugCards';
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
  await render(<FlashcardRunner cards={two} direction="brand" onLeave={onLeave} />);
  expect(screen.getByText('What is the generic name for')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'BrandA' })).toBeTruthy();
  expect(screen.queryByText('genericA')).toBeNull();
  expect(screen.queryByRole('button', { name: /Good/ })).toBeNull();
  await press('Show answer');
  expect(screen.getByRole('header', { name: 'genericA' })).toBeTruthy();
  expect(screen.getByText('Class A')).toBeTruthy();
  expect(screen.getByText('Use A')).toBeTruthy();
  expect(screen.getByText('Watch A')).toBeTruthy();
  expect(screen.getByText('Memory trick: Names ending in -a are things.')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Source: BrandA label, DailyMed' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Source: WHO INN Stem Book 2013' })).toBeTruthy();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('generic to brand asks with the generic name', async () => {
  await render(<FlashcardRunner cards={two} direction="generic" onLeave={onLeave} />);
  expect(screen.getByText('What is the brand name for')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'genericA' })).toBeTruthy();
  await press('Show answer');
  expect(screen.getByRole('header', { name: 'BrandA' })).toBeTruthy();
});

test('a card with no trick shows none, and no stem source', async () => {
  await render(<FlashcardRunner cards={[two[1]]} direction="brand" onLeave={onLeave} />);
  await press('Show answer');
  expect(screen.queryByText(/Memory trick/)).toBeNull();
  expect(screen.queryByRole('link', { name: /Stem Book/ })).toBeNull();
});

test('Good saves a 2 day gap, counts toward today with no points, and moves on', async () => {
  await render(<FlashcardRunner cards={two} direction="brand" onLeave={onLeave} />);
  await press('Show answer');
  await press('Good, shows this card again in 2 days');
  expect(await screen.findByRole('header', { name: 'BrandB' })).toBeTruthy();
  expect(await stored()).toMatchObject({
    xp: 0,
    days: { [today()]: 1 },
    cards: { 'drug-A': { due: addDays(today(), 2), gap: 2 } },
  });
});

test('Easy saves 5 days, and a card rated before offers its grown gaps', async () => {
  await AsyncStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({ version: 1, dailyGoal: 20, xp: 0, days: {}, cards: { 'drug-A': { due: today(), gap: 4 } } }),
  );
  resetProgressStoreForTests();
  await loadProgress();
  await render(<FlashcardRunner cards={two} direction="brand" onLeave={onLeave} />);
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
  await render(<FlashcardRunner cards={two} direction="brand" onLeave={onLeave} />);
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
  expect(await stored()).toMatchObject({ days: { [today()]: 3 } });
  await press('Done');
  expect(onLeave).toHaveBeenCalledTimes(1);
});

test('a rating that cannot be saved says so and keeps the card, so nothing unsaved is shown as done', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));
  await render(<FlashcardRunner cards={two} direction="brand" onLeave={onLeave} />);
  await press('Show answer');
  await press(/^Good/);
  expect(await screen.findByText("That rating couldn't be saved on this phone. Try again.")).toBeTruthy();
  expect(screen.getByRole('header', { name: 'genericA' })).toBeTruthy();
  expect(await stored()).toBeNull();
  await press(/^Good/);
  expect(await screen.findByRole('header', { name: 'BrandB' })).toBeTruthy();
  expect(screen.queryByText(/couldn't be saved/)).toBeNull();
  expect(await stored()).toMatchObject({ days: { [today()]: 1 } });
});

test('the progress bar counts finished cards, and close leaves at once', async () => {
  await render(<FlashcardRunner cards={two} direction="brand" onLeave={onLeave} />);
  expect(screen.getByRole('progressbar', { name: 'Card 1 of 2', value: { now: 0, max: 2 } })).toBeTruthy();
  await press('Show answer');
  await press(/^Easy/);
  expect(await screen.findByRole('progressbar', { name: 'Card 2 of 2', value: { now: 1, max: 2 } })).toBeTruthy();
  await press('Close flashcards');
  expect(onLeave).toHaveBeenCalledTimes(1);
});

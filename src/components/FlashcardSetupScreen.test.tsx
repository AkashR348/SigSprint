import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import FlashcardSetupScreen from '@/app/flashcards/setup';
import { boxedWarnings } from '@/content/boxedWarnings';
import { drugCards } from '@/content/drugCards';
import { addDays, dayKey } from '@/lib/progress';
import { loadProgress, PROGRESS_KEY, resetProgressStoreForTests } from '@/lib/progressStore';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

async function open(save: object | string | null) {
  resetProgressStoreForTests();
  await AsyncStorage.clear();
  if (save !== null) await AsyncStorage.setItem(PROGRESS_KEY, typeof save === 'string' ? save : JSON.stringify(save));
  await loadProgress();
  mockPush.mockClear();
  await render(<FlashcardSetupScreen />);
}

const base = { version: 1, dailyGoal: 20, xp: 0, days: {} };

// Jest finds no tests under src/app, so the route's test lives here.
test('a first visit offers a sitting of new cards and starts in the chosen direction', async () => {
  await open(null);
  expect(screen.getByText('24 cards ready: 24 new. This sitting has 20.')).toBeTruthy();
  expect(screen.getByText("Each card counts once a day toward today's goal. Cards give no XP.")).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: 'Show me, Generic name' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/flashcards/run', params: { deck: 'drugs', direction: 'generic', size: '20' } });
});

test('the sitting size can be 10, 20 or every card that is ready', async () => {
  await open(null);
  await fireEvent.press(screen.getByRole('radio', { name: 'Cards this sitting, 10' }));
  expect(screen.getByText('24 cards ready: 24 new. This sitting has 10.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: 'Cards this sitting, All' }));
  expect(screen.getByText('24 cards ready: 24 new.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/flashcards/run', params: { deck: 'drugs', direction: 'brand', size: 'all' } });
});

test('the boxed warnings deck counts its own cards, hides the name direction, and starts that deck', async () => {
  await open({ ...base, cards: Object.fromEntries(drugCards.map((c) => [c.id, { due: addDays(dayKey(new Date()), 3), gap: 3 }])) });
  expect(screen.getByText('Nothing is due today. Your next card is due in 3 days.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: 'Deck, Boxed warnings' }));
  expect(screen.getByText(`${boxedWarnings.length} cards ready: ${boxedWarnings.length} new.`)).toBeTruthy();
  expect(screen.getByText(/whose FDA label has a boxed warning/)).toBeTruthy();
  expect(screen.queryByRole('radio', { name: 'Show me, Brand name' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/flashcards/run', params: { deck: 'boxed', direction: 'brand', size: '20' } });
});

test('when nothing is due the screen says when the next card is, and Start is off', async () => {
  const later = addDays(dayKey(new Date()), 3);
  await open({ ...base, cards: Object.fromEntries(drugCards.map((c) => [c.id, { due: later, gap: 3 }])) });
  expect(screen.getByText('Nothing is due today. Your next card is due in 3 days.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
});

test('a save that cannot be read is not shown as nothing due', async () => {
  await open('{not json');
  expect(screen.getByText(/Flashcards need your saved progress/)).toBeTruthy();
  expect(screen.queryByText(/Nothing is due/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
});

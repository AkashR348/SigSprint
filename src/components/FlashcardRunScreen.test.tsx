import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import FlashcardRunScreen from '@/app/flashcards/run';
import { drugCards } from '@/content/drugCards';
import { loadProgress, PROGRESS_KEY, resetProgressStoreForTests } from '@/lib/progressStore';

const mockRouter = { canDismiss: jest.fn(), dismiss: jest.fn(), dismissTo: jest.fn(), replace: jest.fn() };
let mockParams: Record<string, string> = { direction: 'brand' };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));

beforeEach(async () => {
  resetProgressStoreForTests();
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockParams = { direction: 'brand' };
});

// Jest finds no tests under src/app, so the route's test lives here.
test('opened before the save is read, it waits and then shows the first card', async () => {
  await render(<FlashcardRunScreen />);
  expect(screen.getByText('Loading your cards…')).toBeTruthy();
  expect(screen.queryByText(/couldn't be set up/)).toBeNull();
  await act(async () => {
    await loadProgress();
  });
  expect(screen.getByRole('header', { name: drugCards[0].brand })).toBeTruthy();
  expect(screen.getByRole('progressbar', { name: 'Card 1 of 20' })).toBeTruthy();
});

test('a save that cannot be read says so, and is not shown as loading or as a card', async () => {
  await AsyncStorage.setItem(PROGRESS_KEY, '{not json');
  await loadProgress();
  await render(<FlashcardRunScreen />);
  expect(screen.getByText(/Flashcards need your saved progress/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(mockRouter.dismissTo).toHaveBeenCalledWith('/flashcards/setup');
});

test('a direction that is not one is refused', async () => {
  mockParams = { direction: 'sideways' };
  await loadProgress();
  await render(<FlashcardRunScreen />);
  expect(screen.getByText("Flashcards couldn't be set up. Go back and try again.")).toBeTruthy();
});

test('closing goes back past the setup screen to the tab underneath', async () => {
  await loadProgress();
  mockRouter.canDismiss.mockReturnValue(true);
  await render(<FlashcardRunScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Close flashcards' }));
  expect(mockRouter.dismiss).toHaveBeenCalledWith(2);
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test('closing a screen opened by a link, with nothing under it, opens Home', async () => {
  await loadProgress();
  mockRouter.canDismiss.mockReturnValue(false);
  await render(<FlashcardRunScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Close flashcards' }));
  expect(mockRouter.replace).toHaveBeenCalledWith('/');
  expect(mockRouter.dismiss).not.toHaveBeenCalled();
});

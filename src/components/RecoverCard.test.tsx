import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { freshProgress } from '@/lib/progress';
import {
  BACKUP_KEY_PREFIX,
  getProgressState,
  loadProgress,
  PROGRESS_KEY,
  resetProgressStoreForTests,
} from '@/lib/progressStore';

import { RecoverCard } from './RecoverCard';

const backupKey = `${BACKUP_KEY_PREFIX}1000`;
const damaged = JSON.stringify({ version: 1, dailyGoal: 20, xp: 130, days: { '2026-11-16': 12, nope: 3 } });
const found = 'We found old saved data on this phone: 12 answers across 1 day and 130 points.';

async function start(backup: string | null) {
  resetProgressStoreForTests();
  await AsyncStorage.clear();
  if (backup !== null) await AsyncStorage.setItem(backupKey, backup);
  await loadProgress();
  jest.clearAllMocks();
  await render(<RecoverCard />);
}

test('with no backup the card draws nothing', async () => {
  await start(null);
  await waitFor(() => expect(AsyncStorage.getAllKeys).toHaveBeenCalled());
  expect(screen.queryByRole('button')).toBeNull();
});

test('it shows what was found and writes nothing until asked', async () => {
  await start(damaged);
  expect(await screen.findByText(found)).toBeTruthy();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('adding it merges the sound parts and the card goes away', async () => {
  await start(damaged);
  await fireEvent.press(await screen.findByRole('button', { name: 'Add to my progress' }));
  await waitFor(() => expect(screen.queryByText(found)).toBeNull());
  expect(getProgressState()).toEqual({
    status: 'ready',
    progress: { ...freshProgress(), xp: 130, days: { '2026-11-16': 12 }, handledBackups: [backupKey] },
  });
});

test('declining changes no numbers and the card goes away', async () => {
  await start(damaged);
  await fireEvent.press(await screen.findByRole('button', { name: "Don't recover" }));
  await waitFor(() => expect(screen.queryByText(found)).toBeNull());
  expect(getProgressState()).toEqual({ status: 'ready', progress: { ...freshProgress(), handledBackups: [backupKey] } });
});

test('both buttons lock while it saves, and a failure says nothing changed', async () => {
  await start(damaged);
  let failWrite: (e: Error) => void = () => {};
  jest.mocked(AsyncStorage.setItem).mockReturnValueOnce(new Promise<void>((_, reject) => (failWrite = reject)));
  await fireEvent.press(await screen.findByRole('button', { name: 'Add to my progress' }));
  await waitFor(() => expect(screen.getByRole('button', { name: "Don't recover" })).toBeDisabled());
  expect(screen.getByRole('button', { name: 'Add to my progress' })).toBeDisabled();
  failWrite(new Error('full'));
  expect(await screen.findByText(/nothing was changed/)).toBeTruthy();
  expect(JSON.parse((await AsyncStorage.getItem(PROGRESS_KEY)) ?? 'null')).toBeNull();
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
});

test('a backup with nothing sound says so and offers only OK', async () => {
  await start('{not json');
  expect(await screen.findByText(/nothing can be recovered/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Add to my progress' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'OK' }));
  await waitFor(() => expect(screen.queryByText(/nothing can be recovered/)).toBeNull());
});

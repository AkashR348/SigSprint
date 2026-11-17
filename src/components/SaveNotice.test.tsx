import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { startFreshFailed, startFreshWarning } from '@/lib/dailyGoal';
import { freshProgress } from '@/lib/progress';
import { getProgressState, loadProgress, PROGRESS_KEY, resetProgressStoreForTests } from '@/lib/progressStore';

import { SaveNotice } from './SaveNotice';

const damaged = { status: 'unavailable', reason: 'damaged' };

beforeEach(async () => {
  resetProgressStoreForTests();
  await AsyncStorage.clear();
  await AsyncStorage.setItem(PROGRESS_KEY, '{not json');
  await loadProgress();
  jest.clearAllMocks();
});

test('the first tap only asks; nothing is written until the person agrees', async () => {
  await render(<SaveNotice reason="damaged" />);
  expect(screen.queryByText(startFreshWarning)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Start fresh' }));
  expect(screen.getByText(startFreshWarning)).toBeTruthy();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(getProgressState()).toEqual(damaged);
});

test('cancel backs out and leaves the damaged save alone', async () => {
  await render(<SaveNotice reason="damaged" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Start fresh' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Start fresh' })).toBeTruthy();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(PROGRESS_KEY)).toBe('{not json');
});

test('agreeing starts fresh, and neither button can be tapped while it runs', async () => {
  let finishWrite: () => void = () => {};
  jest.mocked(AsyncStorage.setItem).mockReturnValueOnce(new Promise<void>((resolve) => (finishWrite = resolve)));
  await render(<SaveNotice reason="damaged" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Start fresh' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Yes, start fresh' }));
  expect(screen.getByRole('button', { name: 'Yes, start fresh' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('button', { name: 'Start fresh' })).toBeNull();
  finishWrite();
  // The held write was the backup, so the copy never landed and the save must be untouched.
  await waitFor(() => expect(screen.getByText(startFreshFailed)).toBeTruthy());
  expect(await AsyncStorage.getItem(PROGRESS_KEY)).toBe('{not json');
  expect(screen.getByRole('button', { name: 'Yes, start fresh' })).toBeEnabled();
});

test('agreeing replaces the save once the copy is made', async () => {
  await render(<SaveNotice reason="damaged" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Start fresh' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Yes, start fresh' }));
  await waitFor(() => expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() }));
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
});

test('a failed read offers Try again, which reads the save again', async () => {
  await render(<SaveNotice reason="read" />);
  expect(screen.queryByRole('button', { name: 'Start fresh' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(PROGRESS_KEY));
});

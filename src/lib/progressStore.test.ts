import AsyncStorage from '@react-native-async-storage/async-storage';

import { freshProgress, recordAnswer, type Progress } from './progress';
import {
  BACKUP_KEY_PREFIX,
  findRecovery,
  handleRecovery,
  getProgressState,
  loadProgress,
  PROGRESS_KEY,
  resetProgressStoreForTests,
  retryProgress,
  startFresh,
  updateProgress,
} from './progressStore';

const answer = (p: Progress) => recordAnswer(p, '2026-11-17', 10);
const oneAnswer = { version: 1, dailyGoal: 20, xp: 10, days: { '2026-11-17': 1 } };

async function stored(): Promise<unknown> {
  return JSON.parse((await AsyncStorage.getItem(PROGRESS_KEY)) ?? 'null');
}

beforeEach(async () => {
  resetProgressStoreForTests();
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('it stays loading until the read finishes', async () => {
  let finishRead: (raw: string | null) => void = () => {};
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(new Promise((resolve) => (finishRead = resolve)));
  const loading = loadProgress();
  expect(getProgressState()).toEqual({ status: 'loading' });
  finishRead(null);
  await loading;
  expect(getProgressState().status).toBe('ready');
});

test('no save is a fresh install, read once from the progress key', async () => {
  await loadProgress();
  await loadProgress();
  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(PROGRESS_KEY);
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
});

test('a stored save is what loads', async () => {
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(oneAnswer));
  await loadProgress();
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(PROGRESS_KEY);
  expect(getProgressState()).toEqual({ status: 'ready', progress: oneAnswer });
});

test.each(['{not json', JSON.stringify({ version: 1, dailyGoal: 20, xp: -4, days: {} })])(
  'a damaged save %p is unavailable, stays so on retry, and is never overwritten',
  async (raw) => {
    await AsyncStorage.setItem(PROGRESS_KEY, raw);
    jest.clearAllMocks();
    await loadProgress();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(PROGRESS_KEY);
    expect(getProgressState()).toEqual({ status: 'unavailable', reason: 'damaged' });
    await retryProgress();
    expect(getProgressState()).toEqual({ status: 'unavailable', reason: 'damaged' });
    expect(await updateProgress(answer)).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(PROGRESS_KEY)).toBe(raw);
  },
);

test('a read that fails is unavailable, not a fresh install, and a retry reads again', async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
  await loadProgress();
  expect(getProgressState()).toEqual({ status: 'unavailable', reason: 'read' });
  expect(await updateProgress(answer)).toBe(false);
  await retryProgress();
  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2);
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
  expect(await updateProgress(answer)).toBe(true);
});

test('an update is saved under the progress key, then shown', async () => {
  await loadProgress();
  expect(await updateProgress(answer)).toBe(true);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(PROGRESS_KEY, JSON.stringify(oneAnswer));
  expect(await stored()).toEqual(oneAnswer);
  expect(getProgressState()).toEqual({ status: 'ready', progress: oneAnswer });
});

test('an answer given before the save has been read waits for it and counts', async () => {
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(oneAnswer));
  expect(await updateProgress(answer)).toBe(true);
  expect(await stored()).toEqual({ version: 1, dailyGoal: 20, xp: 20, days: { '2026-11-17': 2 } });
});

test('a write that fails reports it and shows nothing that was not saved', async () => {
  await loadProgress();
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));
  expect(await updateProgress(answer)).toBe(false);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(PROGRESS_KEY, JSON.stringify(oneAnswer));
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
  expect(await updateProgress(answer)).toBe(true);
});

test.each([
  ['a day that is not a date', (p: Progress) => recordAnswer(p, 'tomorrow', 10)],
  ['a count past exact integers', (p: Progress) => ({ ...p, xp: Number.MAX_SAFE_INTEGER + 1 })],
  ['a change that throws', () => { throw new Error('bug'); }],
])('%s is refused, never written, and does not block the next update', async (_name, change) => {
  await loadProgress();
  expect(await updateProgress(change)).toBe(false);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
  expect(await updateProgress(answer)).toBe(true);
});

test('two updates in a row both count', async () => {
  await loadProgress();
  expect(await Promise.all([updateProgress(answer), updateProgress(answer)])).toEqual([true, true]);
  expect(await stored()).toEqual({ version: 1, dailyGoal: 20, xp: 20, days: { '2026-11-17': 2 } });
});

const at = new Date(2026, 10, 17, 9, 0);
const backupKey = `${BACKUP_KEY_PREFIX}${at.getTime()}`;

test('starting fresh copies the damaged save aside first, then replaces it', async () => {
  await AsyncStorage.setItem(PROGRESS_KEY, '{not json');
  await loadProgress();
  jest.clearAllMocks();
  expect(await startFresh(at)).toBe(true);
  expect(jest.mocked(AsyncStorage.setItem).mock.calls).toEqual([
    [backupKey, '{not json'],
    [PROGRESS_KEY, JSON.stringify(freshProgress())],
  ]);
  expect(await AsyncStorage.getItem(backupKey)).toBe('{not json');
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
  expect(await updateProgress(answer)).toBe(true);
});

test('if the copy cannot be written, the damaged save is left alone', async () => {
  await AsyncStorage.setItem(PROGRESS_KEY, '{not json');
  await loadProgress();
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));
  expect(await startFresh(at)).toBe(false);
  expect(await AsyncStorage.getItem(PROGRESS_KEY)).toBe('{not json');
  expect(getProgressState()).toEqual({ status: 'unavailable', reason: 'damaged' });
});

test('if the copy does not read back the same, the damaged save is left alone', async () => {
  await AsyncStorage.setItem(PROGRESS_KEY, '{not json');
  await loadProgress();
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('{not json').mockResolvedValueOnce('{not');
  expect(await startFresh(at)).toBe(false);
  expect(await AsyncStorage.getItem(PROGRESS_KEY)).toBe('{not json');
  expect(getProgressState()).toEqual({ status: 'unavailable', reason: 'damaged' });
});

test('starting fresh is refused for a sound save or a failed read', async () => {
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(oneAnswer));
  await loadProgress();
  expect(await startFresh(at)).toBe(false);
  expect(await stored()).toEqual(oneAnswer);

  resetProgressStoreForTests();
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
  await loadProgress();
  jest.clearAllMocks();
  expect(await startFresh(at)).toBe(false);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

const damagedSave = JSON.stringify({ version: 1, dailyGoal: 20, xp: -4, days: { '2026-11-16': 12, nope: 3 } });

async function freshAfterDamage(raw: string) {
  await AsyncStorage.setItem(PROGRESS_KEY, raw);
  await loadProgress();
  expect(await startFresh(at)).toBe(true);
  jest.clearAllMocks();
}

test('no backup means nothing to recover', async () => {
  await loadProgress();
  expect(await findRecovery()).toBeNull();
  expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
});

test('after starting fresh, the backup is found with its sound parts', async () => {
  await freshAfterDamage(damagedSave);
  expect(await findRecovery()).toEqual({ key: backupKey, found: { days: { '2026-11-16': 12 }, answers: 12, xp: null } });
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(backupKey);
});

test('a backup with nothing sound in it is found as such', async () => {
  await freshAfterDamage('{not json');
  expect(await findRecovery()).toEqual({ key: backupKey, found: null });
});

test('recovering adds to answers given since, saves once, and is not offered again', async () => {
  await freshAfterDamage(damagedSave);
  expect(await updateProgress((p) => recordAnswer(p, '2026-11-16', 10))).toBe(true);
  expect(await handleRecovery(backupKey, true)).toBe(true);
  const merged = { version: 1, dailyGoal: 20, xp: 10, days: { '2026-11-16': 13 }, handledBackups: [backupKey] };
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(PROGRESS_KEY, JSON.stringify(merged));
  expect(getProgressState()).toEqual({ status: 'ready', progress: merged });
  expect(await findRecovery()).toBeNull();
  expect(await handleRecovery(backupKey, true)).toBe(false);
  expect(await AsyncStorage.getItem(backupKey)).toBe(damagedSave);
});

test('setting a backup aside changes no numbers and stops the offer', async () => {
  await freshAfterDamage(damagedSave);
  expect(await handleRecovery(backupKey, false)).toBe(true);
  expect(getProgressState()).toEqual({ status: 'ready', progress: { ...freshProgress(), handledBackups: [backupKey] } });
  expect(await findRecovery()).toBeNull();
});

test('a recovery that cannot be saved changes nothing and can be tried again', async () => {
  await freshAfterDamage(damagedSave);
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));
  expect(await handleRecovery(backupKey, true)).toBe(false);
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
  expect(await handleRecovery(backupKey, true)).toBe(true);
});

test('recovery is refused for a key that is not a backup', async () => {
  await freshAfterDamage(damagedSave);
  expect(await handleRecovery(PROGRESS_KEY, true)).toBe(false);
});

test('recovery is refused, and nothing is written, before the save is ready', async () => {
  await freshAfterDamage(damagedSave);
  resetProgressStoreForTests();
  jest.clearAllMocks();
  expect(await findRecovery()).toBeNull();
  expect(await handleRecovery(backupKey, true)).toBe(false);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('two copies of the same damaged save are added once and neither is offered again', async () => {
  const raw = JSON.stringify({ version: 1, dailyGoal: 20, xp: 100, days: { '2026-11-16': 10, nope: 1 } });
  const older = `${BACKUP_KEY_PREFIX}1000`;
  const newer = `${BACKUP_KEY_PREFIX}2000`;
  await AsyncStorage.setItem(older, raw);
  await AsyncStorage.setItem(newer, raw);
  await loadProgress();
  expect((await findRecovery())?.key).toBe(newer);
  expect(await handleRecovery(newer, true)).toBe(true);
  expect(await stored()).toEqual({ ...freshProgress(), xp: 100, days: { '2026-11-16': 10 }, handledBackups: [newer, older] });
  expect(await findRecovery()).toBeNull();
  expect(await handleRecovery(older, true)).toBe(false);
});

test('a backup with different text is still offered after another is handled', async () => {
  await AsyncStorage.setItem(`${BACKUP_KEY_PREFIX}1000`, JSON.stringify({ xp: 5 }));
  await AsyncStorage.setItem(`${BACKUP_KEY_PREFIX}2000`, JSON.stringify({ xp: 7 }));
  await loadProgress();
  expect(await handleRecovery(`${BACKUP_KEY_PREFIX}2000`, true)).toBe(true);
  expect(await findRecovery()).toEqual({ key: `${BACKUP_KEY_PREFIX}1000`, found: { days: {}, answers: 0, xp: 5 } });
});

test('starting fresh a second time remembers the backups already handled', async () => {
  const first = `${BACKUP_KEY_PREFIX}1000`;
  await AsyncStorage.setItem(first, JSON.stringify({ xp: 'bad', days: { '2026-11-16': 10 } }));
  await loadProgress();
  expect(await handleRecovery(first, true)).toBe(true);
  // The save is damaged again, with its list of handled backups still readable.
  const again = JSON.stringify({ ...(await stored() as object), xp: 'bad' });
  await AsyncStorage.setItem(PROGRESS_KEY, again);
  resetProgressStoreForTests();
  await loadProgress();
  expect(await startFresh(new Date(2000))).toBe(true);
  expect(await stored()).toEqual({ ...freshProgress(), handledBackups: [first] });
  const second = `${BACKUP_KEY_PREFIX}2000`;
  expect((await findRecovery())?.key).toBe(second);
  expect(await handleRecovery(second, true)).toBe(true);
  expect(await findRecovery()).toBeNull();
  expect((await stored() as { days: unknown }).days).toEqual({ '2026-11-16': 10 });
});

test('adding a backup that has gone fails and leaves it unhandled', async () => {
  await freshAfterDamage(damagedSave);
  await AsyncStorage.removeItem(backupKey);
  jest.clearAllMocks();
  expect(await handleRecovery(backupKey, true)).toBe(false);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(getProgressState()).toEqual({ status: 'ready', progress: freshProgress() });
});

test('a backup key whose text has gone is not offered as unreadable', async () => {
  await loadProgress();
  jest.mocked(AsyncStorage.getAllKeys).mockResolvedValueOnce([backupKey]);
  expect(await findRecovery()).toBeNull();
});

test('a failed look for backups offers nothing', async () => {
  await freshAfterDamage(damagedSave);
  jest.mocked(AsyncStorage.getAllKeys).mockRejectedValueOnce(new Error('disk'));
  expect(await findRecovery()).toBeNull();
});

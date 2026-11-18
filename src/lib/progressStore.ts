import AsyncStorage from '@react-native-async-storage/async-storage';

import { freshProgress, mergeRecovered, parseProgress, salvageHandled, salvageProgress, type Progress, type Salvage } from './progress';

export const PROGRESS_KEY = 'sigsprint.progress.v1';
// A damaged save is copied here, with the time appended, before a fresh one replaces it.
export const BACKUP_KEY_PREFIX = 'sigsprint.progress.backup.';

// `read`: the phone could not be read, so trying again may work. `damaged`: it was read and is unsound.
export type ProgressState =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: 'read' | 'damaged' }
  | { status: 'ready'; progress: Progress };

let state: ProgressState = { status: 'loading' };
let loading: Promise<void> | null = null;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

function set(next: ProgressState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function getProgressState(): ProgressState {
  return state;
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Writes run one at a time, so each starts from the last one saved.
function enqueue(job: () => Promise<boolean>): Promise<boolean> {
  const run = queue.then(job);
  queue = run;
  return run;
}

async function read(): Promise<void> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(PROGRESS_KEY);
  } catch {
    return set({ status: 'unavailable', reason: 'read' });
  }
  if (raw === null) return set({ status: 'ready', progress: freshProgress() });
  let progress: Progress | null = null;
  try {
    progress = parseProgress(JSON.parse(raw));
  } catch {
    // Not JSON at all: damaged, like any other unsound save.
  }
  set(progress === null ? { status: 'unavailable', reason: 'damaged' } : { status: 'ready', progress });
}

/** Reads the save once per launch. No save is a fresh install; anything unsound is unavailable. */
export function loadProgress(): Promise<void> {
  loading ??= read();
  return loading;
}

/** Reads the save again after it was unavailable. A damaged save stays damaged. */
export function retryProgress(): Promise<void> {
  if (state.status !== 'unavailable') return loadProgress();
  set({ status: 'loading' });
  loading = read();
  return loading;
}

/** Saves a change, then shows it. Refused unless ready, so a damaged save is never overwritten. */
export function updateProgress(change: (progress: Progress) => Progress | null): Promise<boolean> {
  return enqueue(async () => {
    // An answer given before the first read finishes waits for it.
    await loadProgress();
    const current = getProgressState();
    if (current.status !== 'ready') return false;
    try {
      const next = change(current.progress);
      // Never save what could not be loaded back.
      if (next === null || parseProgress(next) === null) return false;
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      // Shown only once saved, so the screen never runs ahead of the phone.
      set({ status: 'ready', progress: next });
      return true;
    } catch {
      return false;
    }
  });
}

/** Replaces a damaged save with a fresh one, after copying it aside. Only call once the person agrees. */
export function startFresh(now: Date): Promise<boolean> {
  return enqueue(async () => {
    const current = getProgressState();
    if (current.status !== 'unavailable' || current.reason !== 'damaged') return false;
    try {
      const raw = await AsyncStorage.getItem(PROGRESS_KEY);
      // The copy must be on the phone before the damaged save is replaced.
      if (raw !== null) {
        const backupKey = `${BACKUP_KEY_PREFIX}${now.getTime()}`;
        await AsyncStorage.setItem(backupKey, raw);
        if ((await AsyncStorage.getItem(backupKey)) !== raw) return false;
      }
      const fresh = freshProgress();
      // Backups the damaged save had already counted stay counted.
      const handled = handledIn(raw);
      if (handled.length > 0) fresh.handledBackups = handled;
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(fresh));
      set({ status: 'ready', progress: fresh });
      return true;
    } catch {
      return false;
    }
  });
}

// A backup not yet recovered or set aside. `found` is null when no part of it can be trusted.
export type Recovery = { key: string; found: Salvage | null };

function parsed(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function handledIn(raw: string | null): string[] {
  return raw === null ? [] : salvageHandled(parsed(raw)).filter((k) => k.startsWith(BACKUP_KEY_PREFIX));
}

async function waitingKeys(handled: readonly string[]): Promise<string[]> {
  return (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(BACKUP_KEY_PREFIX) && !handled.includes(k));
}

const stamp = (key: string) => Number(key.slice(BACKUP_KEY_PREFIX.length)) || 0;

/** The newest backup still waiting, null when there is none, or `failed` when the phone could not be read. */
export async function findRecovery(): Promise<Recovery | 'failed' | null> {
  const current = getProgressState();
  if (current.status !== 'ready') return null;
  try {
    const keys = (await waitingKeys(current.progress.handledBackups ?? [])).sort((a, b) => stamp(b) - stamp(a));
    for (const key of keys) {
      const raw = await AsyncStorage.getItem(key);
      // A key whose text has gone is not a backup that "couldn't be read".
      if (raw !== null) return { key, found: salvageProgress(parsed(raw)) };
    }
    return null;
  } catch {
    // Not looked is not the same as none found.
    return 'failed';
  }
}

/** Adds a backup's sound parts to the save, or with `recover` false just sets the backup aside. */
export function handleRecovery(key: string, recover: boolean): Promise<boolean> {
  return enqueue(async () => {
    const current = getProgressState();
    if (current.status !== 'ready' || !key.startsWith(BACKUP_KEY_PREFIX)) return false;
    const handled = current.progress.handledBackups ?? [];
    if (handled.includes(key)) return false;
    try {
      // Read again here, so what is added is what is on the phone now.
      const raw = await AsyncStorage.getItem(key);
      // Nothing to add is not the same as added: a backup that has gone is a failure.
      if (raw === null && recover) return false;
      // Copies of the same text are one backup; handle them together so none is added twice.
      const same = [key];
      if (raw !== null) {
        for (const other of await waitingKeys(handled)) {
          if (other !== key && (await AsyncStorage.getItem(other)) === raw) same.push(other);
        }
      }
      const found = recover && raw !== null ? salvageProgress(parsed(raw)) : null;
      const next = mergeRecovered(current.progress, found, same);
      if (next === null) return false;
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      set({ status: 'ready', progress: next });
      return true;
    } catch {
      return false;
    }
  });
}

/** Test seam: forget what was loaded. */
export function resetProgressStoreForTests() {
  state = { status: 'loading' };
  loading = null;
  queue = Promise.resolve();
  listeners.clear();
}

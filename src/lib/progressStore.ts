import AsyncStorage from '@react-native-async-storage/async-storage';

import { freshProgress, parseProgress, type Progress } from './progress';

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
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(fresh));
      set({ status: 'ready', progress: fresh });
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

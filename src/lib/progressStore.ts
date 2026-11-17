import AsyncStorage from '@react-native-async-storage/async-storage';

import { freshProgress, parseProgress, type Progress } from './progress';

export const PROGRESS_KEY = 'sigsprint.progress.v1';

export type ProgressState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; progress: Progress };

let state: ProgressState = { status: 'loading' };
let started = false;
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

/** Reads the save once. No save is a fresh install; a failed read or a damaged save is unavailable. */
export async function loadProgress(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    if (raw === null) return set({ status: 'ready', progress: freshProgress() });
    const progress = parseProgress(JSON.parse(raw));
    set(progress === null ? { status: 'unavailable' } : { status: 'ready', progress });
  } catch {
    set({ status: 'unavailable' });
  }
}

/** Applies a change and saves it. Refused unless ready, so a damaged save is never overwritten. */
export async function updateProgress(change: (progress: Progress) => Progress): Promise<boolean> {
  if (state.status !== 'ready') return false;
  const next = change(state.progress);
  set({ status: 'ready', progress: next });
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/** Test seam: forget what was loaded. */
export function resetProgressStoreForTests() {
  state = { status: 'loading' };
  started = false;
  listeners.clear();
}

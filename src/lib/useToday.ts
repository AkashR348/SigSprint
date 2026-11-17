import { useEffect, useSyncExternalStore } from 'react';

import { dayKey, streakDays, type Progress } from './progress';
import { getProgressState, loadProgress, subscribeProgress, type ProgressState } from './progressStore';

export type Today =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; answeredToday: number; dailyGoal: number; streakDays: number; xp: number };

/** Today's numbers from a save. A day with no entry is a true zero: nothing was answered. */
export function todayFrom(progress: Progress, today: string): Extract<Today, { status: 'ready' }> {
  return {
    status: 'ready',
    answeredToday: progress.days[today] ?? 0,
    dailyGoal: progress.dailyGoal,
    streakDays: streakDays(progress.days, today),
    xp: progress.xp,
  };
}

export function toToday(state: ProgressState, now: Date): Today {
  return state.status === 'ready' ? todayFrom(state.progress, dayKey(now)) : state;
}

export function useToday(): Today {
  const state = useSyncExternalStore(subscribeProgress, getProgressState, getProgressState);
  useEffect(() => {
    void loadProgress();
  }, []);
  return toToday(state, new Date());
}

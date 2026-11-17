import { useEffect, useReducer, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { answeredOn, dayKey, streakDays, type Progress } from './progress';
import { getProgressState, loadProgress, subscribeProgress, type ProgressState } from './progressStore';

export type Today =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: 'read' | 'damaged' }
  | { status: 'ready'; answeredToday: number; dailyGoal: number; streakDays: number; xp: number };

/** Today's numbers from a save. */
export function todayFrom(progress: Progress, today: string): Extract<Today, { status: 'ready' }> {
  return {
    status: 'ready',
    answeredToday: answeredOn(progress.days, today),
    dailyGoal: progress.dailyGoal,
    streakDays: streakDays(progress.days, today),
    xp: progress.xp,
  };
}

export function toToday(state: ProgressState, now: Date): Today {
  return state.status === 'ready' ? todayFrom(state.progress, dayKey(now)) : state;
}

/** Milliseconds from `now` until just past the next local midnight. */
export function msUntilNextDay(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime() + 1;
}

export function useToday(): Today {
  const state = useSyncExternalStore(subscribeProgress, getProgressState, getProgressState);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    void loadProgress();
  }, []);
  useEffect(() => {
    // The day can turn over while the screen is open, or while the app sits in the background.
    let timer = setTimeout(function tick() {
      redraw();
      timer = setTimeout(tick, msUntilNextDay(new Date()));
    }, msUntilNextDay(new Date()));
    const resumed = AppState.addEventListener('change', (next) => {
      if (next === 'active') redraw();
    });
    return () => {
      clearTimeout(timer);
      resumed.remove();
    };
  }, []);
  return toToday(state, new Date());
}

export type Today =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; answeredToday: number; dailyGoal: number; streakDays: number; xp: number };

// A fresh install until on-device storage lands; the three states are what screens must handle.
export function useToday(): Today {
  return { status: 'ready', answeredToday: 0, dailyGoal: 20, streakDays: 0, xp: 0 };
}

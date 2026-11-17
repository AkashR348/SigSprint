export type GoalProgress = { fraction: number; remaining: number; done: boolean };

/** Progress toward the daily goal, or null when there is no goal to measure against. */
export function goalProgress(answered: number, goal: number): GoalProgress | null {
  if (!Number.isFinite(goal) || goal <= 0) return null;
  if (!Number.isFinite(answered)) return null;
  const count = Math.max(0, Math.floor(answered));
  const fraction = Math.min(1, count / goal);
  return { fraction, remaining: Math.max(0, goal - count), done: count >= goal };
}

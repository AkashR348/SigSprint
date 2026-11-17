export type GoalProgress = { answered: number; goal: number; fraction: number; remaining: number; done: boolean };

/** Progress toward the daily goal, or null when there is no goal to measure against. */
export function goalProgress(answered: number, goal: number): GoalProgress | null {
  if (!Number.isFinite(goal) || goal <= 0) return null;
  if (!Number.isFinite(answered)) return null;
  const count = Math.max(0, Math.floor(answered));
  const fraction = Math.min(1, count / goal);
  return { answered: count, goal, fraction, remaining: Math.max(0, goal - count), done: count >= goal };
}

/** The goal card's line. Null progress never prints numbers, since there are none to trust. */
export function goalLine(status: 'loading' | 'unavailable' | 'ready', progress: GoalProgress | null): string {
  if (status === 'loading') return 'Loading your day';
  if (status === 'unavailable') return "Couldn't load your progress";
  if (progress === null) return 'No daily goal to show yet';
  return `${progress.answered} of ${progress.goal} questions`;
}

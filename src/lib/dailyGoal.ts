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

/** What to tell someone whose save is unavailable; honest that answers will not be kept meanwhile. */
export function unavailableNotice(reason: 'read' | 'damaged'): string {
  if (reason === 'read') return "Your saved progress couldn't be read just now. Answers won't be saved until it loads.";
  return "The progress saved on this phone can't be read. Answers won't be saved for now. Nothing has been erased.";
}

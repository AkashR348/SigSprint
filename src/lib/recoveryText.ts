import type { Salvage } from './progress';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** What a backup holds, in plain words. Points that could not be read are said to be so, never shown as 0. */
export function recoverySummary(found: Salvage | null): string {
  if (found === null) return "The old saved data on this phone couldn't be read, so nothing can be recovered.";
  const days = Object.keys(found.days).length;
  const answers = found.answers > 0 ? `${plural(found.answers, 'answer', 'answers')} across ${plural(days, 'day', 'days')}` : null;
  const points = found.xp === null ? null : plural(found.xp, 'point', 'points');
  const parts = [answers, points].filter((p) => p !== null).join(' and ');
  const lost = [answers === null ? "Its daily answers couldn't be read." : null, points === null ? "Its points couldn't be read." : null]
    .filter((p) => p !== null)
    .join(' ');
  return `We found old saved data on this phone: ${parts}.${lost ? ` ${lost}` : ''}`;
}

export const recoveryFailed = "That didn't work, and nothing was changed. You can try again.";

export const lookFailed = "We couldn't check this phone for old saved data.";

export const lookFailedAgain = "Still couldn't check this phone.";
export const lookFoundNone = 'No old saved data found.';

export const recoveryTitle = 'Old saved data';

/** What to say once a backup is dealt with. `found` false: there was nothing in it to add. */
export function recoveryResult(recover: boolean, found: boolean): string {
  if (recover) return 'Added to your progress.';
  return found ? 'Set aside. Your progress is unchanged.' : 'Cleared. Your progress is unchanged.';
}

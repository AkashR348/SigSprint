import type { ExamMode } from './mockSave';

export type ExamTimer = {
  /** Lets a stopped relaxed clock run again. The strict clock always runs. */
  start: () => void;
  /** Stops a relaxed clock where it stands. The strict clock cannot be stopped. */
  stop: () => void;
  running: () => boolean;
  msLeft: () => number;
  now: () => number;
};

/** The clock of one exam, from its saved `clock`: an end time for `exam`, the time left for `relaxed`. */
export function createExamTimer(mode: ExamMode, clock: number, now: () => number = Date.now): ExamTimer {
  if (mode === 'exam') {
    return { start: () => {}, stop: () => {}, running: () => true, msLeft: () => Math.max(0, clock - now()), now };
  }
  let left = Math.max(0, clock);
  // When the clock ends, in ms; null while it is stopped.
  let endsAt: number | null = null;
  const msLeft = () => (endsAt === null ? left : Math.max(0, endsAt - now()));
  return {
    start: () => {
      endsAt ??= now() + left;
    },
    stop: () => {
      left = msLeft();
      endsAt = null;
    },
    running: () => endsAt !== null,
    msLeft,
    now,
  };
}

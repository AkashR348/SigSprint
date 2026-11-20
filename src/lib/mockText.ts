import type { DomainId } from '@/content/domains';

import { estimateSide, examShapes, PASSING_SCORE } from './mockExam';
import type { ExamLength, ExamMode, ExamRecord } from './mockSave';
import { pointsRule } from './practiceText';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const modeName: Record<ExamMode, string> = { exam: 'Exam-like', relaxed: 'Relaxed' };
export const lengthName: Record<ExamLength, string> = { full: 'Full exam', half: 'Half exam' };

// Short enough for one line of a history row.
const shortDomain: Record<DomainId, string> = { medications: 'Medications', federal: 'Federal', safety: 'Safety', orderEntry: 'Order entry' };

/** "1,410": a score with its thousands comma. */
export function scoreLabel(score: number): string {
  return score < 1000 ? String(score) : `${Math.floor(score / 1000)},${String(score % 1000).padStart(3, '0')}`;
}

/** "1:49:05" above an hour, "9:05" below; never negative. */
export function examClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** The same time in words for a screen reader. */
export function examClockSpoken(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const hours = h > 0 ? `${plural(h, 'hour', 'hours')} ` : '';
  return `Time left, ${hours}${plural(m, 'minute', 'minutes')} ${plural(s % 60, 'second', 'seconds')}`;
}

/** Time used, to the minute: "1 h 32 min". */
export function durationLabel(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes === 0) return 'under 1 min';
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h} h ${minutes % 60} min` : `${minutes} min`;
}

export function durationSpoken(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes === 0) return 'under 1 minute';
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${plural(h, 'hour', 'hours')} ${plural(minutes % 60, 'minute', 'minutes')}` : plural(minutes, 'minute', 'minutes');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 19, 2026", in the phone's own time zone. */
export function dateLabel(at: number): string {
  const d = new Date(at);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function shapeLine(length: ExamLength): string {
  const { questions, minutes } = examShapes[length];
  return `${questions} questions in ${minutes} minutes, weighted like the real exam.`;
}

/** The rules the setup screen states before an exam starts; `pool` is how many questions it draws from. */
export function examRules(mode: ExamMode, length: ExamLength, pool: number): string[] {
  const clock =
    mode === 'exam'
      ? 'The clock never stops, even if you leave the app. There is no pause.'
      : 'You can pause, which hides the question. The clock also stops while the app is closed.';
  return [
    shapeLine(length),
    clock,
    'When time runs out the exam ends, and unanswered questions count as wrong. You get a warning with 10 minutes left.',
    'Skip, flag and change answers as you like. Right and wrong answers show only after you submit.',
    `${pointsRule} Not answered takes none. Points are added when you submit. An exam you quit earns nothing.`,
    `Until the question bank is ready, each exam draws its ${examShapes[length].questions} questions from the same ${pool}.`,
  ];
}

export const estimateTitle = 'Rough estimate';
export const estimateCaveat = `This is a rough estimate, not a PTCB score. PTCB does not publish how it turns answers into a score. PTCB's passing score is ${scoreLabel(PASSING_SCORE)}.`;

/** Which side of the passing score an estimate falls on. */
export function estimateVerdict(estimate: number): string {
  const side = estimateSide(estimate);
  const pass = scoreLabel(PASSING_SCORE);
  if (side === 'at') return `Your estimate is right at the passing score of ${pass}.`;
  return `Your estimate is ${side} the passing score of ${pass}.`;
}

export function countsLine(answered: number, unanswered: number, flagged: number): string {
  return `${answered} answered · ${unanswered} not answered · ${flagged} flagged`;
}

/** Asked once before an exam with blanks is submitted. */
export function unansweredWarning(unanswered: number): string {
  return `${plural(unanswered, 'question is', 'questions are')} not answered and will count as wrong. Submit anyway?`;
}

export function leaveBody(mode: ExamMode): string {
  return mode === 'exam'
    ? 'You can leave and come back, but the clock keeps running. If you quit, nothing from this exam counts.'
    : 'You can leave and come back, and the clock stops while you are away. If you quit, nothing from this exam counts.';
}

export const warningNotice = 'Less than 10 minutes left.';
export const progressUnsaved = "Your last change couldn't be saved on this phone. If the app closes, it may be lost.";
export const resultSaving = 'Saving your result…';
export const resultUnsaved =
  "This result couldn't be saved on this phone, so it isn't in your history, points or daily goal yet, and the exam is still saved as in progress. The answers show once it is saved.";
export const quitFailed = "The exam couldn't be quit on this phone, so it is still saved. You can try again.";
export const examBroken = "This exam can't be continued, because its questions have changed since it started.";
export const noExam = 'There is no mock exam in progress.';
export const startFailed = "The exam couldn't be saved on this phone, so it didn't start. You can try again.";
export const needsProgress = "A mock exam is saved as you go, so it can't start until your progress loads.";
export const noHistory = 'No finished mock exams yet.';

/** A history row's two lines and what a screen reader says for it. */
export function historyRow(record: ExamRecord, estimate: number | null): { title: string; score: string; topics: string; spoken: string } {
  const percent = Math.round((record.correct / record.total) * 100);
  const title = `${dateLabel(record.at)} · ${modeName[record.mode]} · ${lengthName[record.length]}`;
  const est = estimate === null ? '' : ` · estimate ${scoreLabel(estimate)}`;
  const score = `${record.correct} of ${record.total} (${percent}%)${est} · ${durationLabel(record.seconds)}`;
  const topics = record.byDomain.map((d) => `${shortDomain[d.id]} ${d.correct}/${d.total}`).join(' · ');
  const estSpoken = estimate === null ? '' : `, rough estimate ${estimate}`;
  const topicsSpoken = record.byDomain.map((d) => `${shortDomain[d.id]} ${d.correct} of ${d.total}`).join(', ');
  const spoken = `${dateLabel(record.at)}, ${modeName[record.mode]}, ${lengthName[record.length]}. ${record.correct} of ${record.total} correct, ${percent} percent${estSpoken}. Time used ${durationSpoken(record.seconds)}. ${topicsSpoken}.`;
  return { title, score, topics, spoken };
}

/** What the setup screen says about an exam in progress. */
export function inProgressLine(mode: ExamMode, length: ExamLength, answered: number, total: number): string {
  return `${modeName[mode]} · ${lengthName[length]} · ${answered} of ${total} answered`;
}

/** `msLeft` is what the saved exam has left now, as `savedMsLeft` gives it. */
export function inProgressClock(mode: ExamMode, msLeft: number): string {
  if (msLeft <= 0) return 'Its time has run out. Continue to see the result.';
  return mode === 'exam' ? 'Its clock has kept running.' : `Its clock is stopped with ${examClock(msLeft / 1000)} left.`;
}

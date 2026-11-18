const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The line above Start test. `minutes` is null when the timer is off. */
export function setupSummary(questions: number, topics: number, minutes: number | null): string {
  if (topics === 0) return 'Pick at least one topic.';
  const time = minutes === null ? 'no timer' : plural(minutes, 'minute', 'minutes');
  return `${plural(questions, 'question', 'questions')} · ${plural(topics, 'topic', 'topics')} · ${time}`;
}

/** Said when the topics chosen hold fewer questions than were asked for. */
export function shortNotice(available: number): string {
  return `Only ${plural(available, 'question is', 'questions are')} ready for these topics so far, so your test will have ${available}.`;
}

export const setupBroken = "This test couldn't be set up. Go back and choose your topics again.";

/** Said on the results when some answers could not be saved to progress. */
export function unsavedNotice(count: number): string {
  return `${plural(count, 'answer', 'answers')} couldn't be saved on this phone, so ${count === 1 ? "it isn't" : "they aren't"} in your streak, points or daily goal.`;
}

/** The points an answer moved the total by, as drawn on the answer sheet. */
export function pointsLabel(change: number): string {
  return `${change > 0 ? '+' : '\u2212'}${Math.abs(change)} XP`;
}

export function pointsSpoken(change: number): string {
  return `${change > 0 ? 'Plus' : 'Minus'} ${plural(Math.abs(change), 'point', 'points')}`;
}

export const savingNotice = 'Saving your last answer…';
export const answerUnsaved = "This answer couldn't be saved on this phone.";

/** What leaving now means for the answers given, from what is known of their saves. */
export function leaveNotice(unsaved: number, saving: boolean): string {
  if (unsaved > 0) return unsavedNotice(unsaved);
  if (saving) return 'Your last answer is still being saved.';
  return 'The questions you have answered still count toward today.';
}

export function scoreLine(correct: number, total: number): string {
  return `${correct} of ${total} correct`;
}

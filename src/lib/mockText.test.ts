import {
  countsLine,
  dateLabel,
  durationLabel,
  durationSpoken,
  estimateCaveat,
  estimateVerdict,
  examClock,
  examClockSpoken,
  examRules,
  historyRow,
  inProgressClock,
  inProgressLine,
  leaveBody,
  scoreLabel,
  unansweredWarning,
} from './mockText';

test('the clock shows hours only when there are some', () => {
  expect(examClock(6600)).toBe('1:50:00');
  expect(examClock(3599.2)).toBe('1:00:00');
  expect(examClock(545)).toBe('9:05');
  expect(examClock(-3)).toBe('0:00');
  expect(examClockSpoken(6545)).toBe('Time left, 1 hour 49 minutes 5 seconds');
  expect(examClockSpoken(61)).toBe('Time left, 1 minute 1 second');
});

test('time used is given to the minute', () => {
  expect(durationLabel(5520)).toBe('1 h 32 min');
  expect(durationLabel(2880)).toBe('48 min');
  expect(durationLabel(40)).toBe('under 1 min');
  expect(durationSpoken(3660)).toBe('1 hour 1 minute');
  expect(durationSpoken(120)).toBe('2 minutes');
});

test('the estimate is always called an estimate and set against 1,400', () => {
  expect(scoreLabel(1410)).toBe('1,410');
  expect(scoreLabel(1000)).toBe('1,000');
  expect(estimateVerdict(1410)).toBe('Your estimate is above the passing score of 1,400.');
  expect(estimateVerdict(1390)).toBe('Your estimate is below the passing score of 1,400.');
  expect(estimateVerdict(1400)).toBe('Your estimate is right at the passing score of 1,400.');
  expect(estimateCaveat).toContain('rough estimate, not a PTCB score');
  expect(estimateCaveat).toContain("PTCB's passing score is 1,400");
  // The app never says pass or fail.
  for (const text of [estimateCaveat, estimateVerdict(1500), estimateVerdict(1100)]) expect(text).not.toMatch(/\b(passed|failed|fail)\b/i);
});

test('the rules state the shape, the clock for the mode, the points and the repeats', () => {
  const strict = examRules('exam', 'full').join(' ');
  expect(strict).toContain('90 questions in 110 minutes');
  expect(strict).toContain('The clock never stops, even if you leave the app. There is no pause.');
  expect(strict).toContain('unanswered questions count as wrong');
  expect(strict).toContain('10 minutes left');
  expect(strict).toContain('Correct adds 10 points. Wrong takes 5. Not answered takes none.');
  expect(strict).toContain('An exam you quit earns nothing.');
  expect(strict).toContain('every full exam has the same 90 questions in a new order');
  const relaxed = examRules('relaxed', 'half').join(' ');
  expect(relaxed).toContain('45 questions in 55 minutes');
  expect(relaxed).toContain('You can pause, which hides the question. The clock also stops while the app is closed.');
  expect(relaxed).toContain('When time runs out the exam ends');
  expect(relaxed).toContain('draws its 45 questions from the same 90');
});

test('a history row is labelled with its date, mode and length, and carries the estimate', () => {
  const row = historyRow(
    {
      at: new Date(2026, 10, 19, 15, 30).getTime(),
      mode: 'relaxed',
      length: 'half',
      correct: 31,
      total: 45,
      seconds: 2880,
      timedOut: false,
      byDomain: [
        { id: 'medications', correct: 12, total: 16 },
        { id: 'orderEntry', correct: 7, total: 10 },
      ],
    },
    1410,
  );
  expect(row.title).toBe('Nov 19, 2026 · Relaxed · Half exam');
  expect(row.score).toBe('31 of 45 (69%) · estimate 1,410 · 48 min');
  expect(row.topics).toBe('Medications 12/16 · Order entry 7/10');
  expect(row.spoken).toBe('Nov 19, 2026, Relaxed, Half exam. 31 of 45 correct, 69 percent, rough estimate 1410. Time used 48 minutes. Medications 12 of 16, Order entry 7 of 10.');
  expect(dateLabel(new Date(2027, 0, 2).getTime())).toBe('Jan 2, 2027');
});

test('the small lines read naturally for one and for many', () => {
  expect(countsLine(62, 28, 3)).toBe('62 answered · 28 not answered · 3 flagged');
  expect(unansweredWarning(1)).toBe('1 question is not answered and will count as wrong. Submit anyway?');
  expect(unansweredWarning(28)).toBe('28 questions are not answered and will count as wrong. Submit anyway?');
  expect(leaveBody('exam')).toContain('the clock keeps running');
  expect(leaveBody('relaxed')).toContain('the clock stops while you are away');
  expect(inProgressLine('exam', 'full', 34, 90)).toBe('Exam-like · Full exam · 34 of 90 answered');
  expect(inProgressClock('exam', 5)).toBe('Its clock has kept running.');
  expect(inProgressClock('relaxed', 3_730_000)).toBe('Its clock is stopped with 1:02:10 left.');
});

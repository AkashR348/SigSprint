import { parseExamRecords, parseSavedExam, type ExamRecord, type SavedExam } from './mockSave';
import { freshProgress, parseProgress } from './progress';

const exam: SavedExam = { mode: 'relaxed', length: 'half', ids: ['a', 'b'], orders: ['0123', '3120'], answers: [2, null], flagged: [1], index: 1, clock: 60_000 };
const record: ExamRecord = {
  at: 1_800_000_000_000,
  mode: 'exam',
  length: 'full',
  correct: 62,
  total: 90,
  seconds: 5520,
  timedOut: false,
  byDomain: [{ id: 'medications', correct: 22, total: 32 }],
};

test('a sound exam in progress is read back as it was saved', () => {
  expect(parseSavedExam(JSON.parse(JSON.stringify(exam)))).toEqual(exam);
});

test.each([
  ['an unknown mode', { mode: 'easy' }],
  ['an unknown length', { length: 'double' }],
  ['no questions', { ids: [], orders: [], answers: [] }],
  ['a question listed twice', { ids: ['a', 'a'] }],
  ['an order that is not the four choices', { orders: ['0123', '0012'] }],
  ['an answer past the fourth choice', { answers: [4, null] }],
  ['fewer answers than questions', { answers: [1] }],
  ['a flag on a question that is not there', { flagged: [2] }],
  ['a place past the last question', { index: 2 }],
  ['a clock that is not a count', { clock: -1 }],
])('an exam in progress with %s is not read', (_, change) => {
  expect(parseSavedExam({ ...exam, ...change })).toBeNull();
});

test('sound results are read back, and one unsound result spoils the list', () => {
  expect(parseExamRecords(JSON.parse(JSON.stringify([record])))).toEqual([record]);
  expect(parseExamRecords([record, { ...record, correct: 91 }])).toBeNull();
  expect(parseExamRecords([{ ...record, total: 0, correct: 0 }])).toBeNull();
  expect(parseExamRecords([{ ...record, byDomain: [{ id: 'cooking', correct: 1, total: 2 }] }])).toBeNull();
  expect(parseExamRecords(Array.from({ length: 11 }, () => record))).toBeNull();
  expect(parseExamRecords('none')).toBeNull();
});

test('saved progress carries the exam and the results, and is damaged if either is', () => {
  const progress = { ...freshProgress(), exam, exams: [record] };
  expect(parseProgress(JSON.parse(JSON.stringify(progress)))).toEqual(progress);
  expect(parseProgress({ ...progress, exam: { ...exam, index: 9 } })).toBeNull();
  expect(parseProgress({ ...progress, exams: [{}] })).toBeNull();
  // A save from before the mock exam has neither, and is not given empty ones.
  expect(parseProgress(freshProgress())).toEqual(freshProgress());
});

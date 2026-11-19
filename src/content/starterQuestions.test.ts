import { allocateQuestions, domains, mockExam } from './domains';
import { starterQuestions } from './starterQuestions';

// Rule 7: the sites whose own pages were read to confirm each answer.
const PRIMARY = ['www.ecfr.gov', 'dailymed.nlm.nih.gov', 'www.fda.gov', 'www.cdc.gov', 'www.osha.gov', 'www.nist.gov'];

// Written so far; each rises to its share of the mock exam as that domain's questions are added.
const COUNTS = { medications: 6, federal: 17, safety: 6, orderEntry: 6 } as const;

test('each exam domain has the number of questions written for it so far', () => {
  for (const d of domains) expect(starterQuestions.filter((q) => q.domain === d.id)).toHaveLength(COUNTS[d.id]);
  expect(starterQuestions).toHaveLength(Object.values(COUNTS).reduce((sum, n) => sum + n, 0));
});

test('federal has its full share of the mock exam', () => {
  const share = allocateQuestions(mockExam.questions, domains.map((d) => d.id));
  expect(COUNTS.federal).toBeGreaterThanOrEqual(share.federal);
});

test('every question has its own id and stem', () => {
  expect(new Set(starterQuestions.map((q) => q.id)).size).toBe(starterQuestions.length);
  expect(new Set(starterQuestions.map((q) => q.stem)).size).toBe(starterQuestions.length);
});

test.each(starterQuestions.map((q) => [q.id, q] as const))('%s has four different choices, one answer, and an explanation', (_, q) => {
  expect(q.choices).toHaveLength(4);
  expect(new Set(q.choices.map((c) => c.trim().toLowerCase())).size).toBe(4);
  expect([0, 1, 2, 3]).toContain(q.answer);
  expect(q.stem.trim().length).toBeGreaterThan(10);
  expect(q.explanation.trim().length).toBeGreaterThan(10);
});

test.each(starterQuestions.map((q) => [q.id, q] as const))('%s stores a source on a primary site', (_, q) => {
  const url = new URL(q.source.url);
  expect(url.protocol).toBe('https:');
  expect(PRIMARY).toContain(url.hostname);
  expect(q.source.title.trim().length).toBeGreaterThan(5);
});

test('the right answer is not always in the same place', () => {
  for (const d of domains) {
    const places = new Set(starterQuestions.filter((q) => q.domain === d.id).map((q) => q.answer));
    expect(places.size).toBeGreaterThanOrEqual(3);
  }
});

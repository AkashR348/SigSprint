import { allocateQuestions, domains, mockExam } from './domains';
import { drugCards } from './drugCards';
import { starterQuestions } from './starterQuestions';

// Rule 7: the sites whose own pages were read to confirm each answer.
const PRIMARY = ['www.ecfr.gov', 'dailymed.nlm.nih.gov', 'www.fda.gov', 'www.cdc.gov', 'www.osha.gov', 'www.nist.gov'];
// MedlinePlus: a code's meaning only. The ISMP error-prone list: that, and how a dose is written.
const MEDLINEPLUS = 'medlineplus.gov';
const ISMP = 'online.ecri.org';
const SIG_CODE = /\b(PRN|BID|TID|QID|QHS|QD|QOD|UD|OD|OS|OU|AD|AS|AU|IM|IV|SC|SQ)\b/;
const DOSE_WRITING = /\b(written|writing)\b.*\bISMP\b/;

// Written so far. A full exam takes 32, 17, 21 and 20, so the extras in Safety and Order Entry vary between exams.
const COUNTS = { medications: 32, federal: 17, safety: 22, orderEntry: 25 } as const;

test('each exam domain has the number of questions written for it so far', () => {
  for (const d of domains) expect(starterQuestions.filter((q) => q.domain === d.id)).toHaveLength(COUNTS[d.id]);
  expect(starterQuestions).toHaveLength(Object.values(COUNTS).reduce((sum, n) => sum + n, 0));
});

// Domains whose mock exam questions are all written.
const FULL = ['medications', 'federal', 'safety', 'orderEntry'] as const;

test.each(FULL)('%s has its full share of the mock exam', (id) => {
  const share = allocateQuestions(mockExam.questions, domains.map((d) => d.id));
  expect(COUNTS[id]).toBeGreaterThanOrEqual(share[id]);
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
  expect([...PRIMARY, MEDLINEPLUS, ISMP]).toContain(url.hostname);
  expect(q.source.title.trim().length).toBeGreaterThan(5);
});

test('MedlinePlus and ISMP are cited only for a sig code, and ISMP also for how a dose is written', () => {
  const citing = (host: string) => starterQuestions.filter((q) => new URL(q.source.url).hostname === host);
  const sigCode = (q: (typeof starterQuestions)[number]) => q.domain === 'orderEntry' && SIG_CODE.test(q.stem);
  expect(citing(MEDLINEPLUS).length + citing(ISMP).length).toBeGreaterThanOrEqual(12);
  expect(citing(MEDLINEPLUS).filter((q) => !sigCode(q)).map((q) => q.id)).toEqual([]);
  expect(citing(ISMP).filter((q) => !sigCode(q) && !(q.domain === 'safety' && DOSE_WRITING.test(q.stem))).map((q) => q.id)).toEqual([]);
});

test('the right answer is not always in the same place', () => {
  for (const d of domains) {
    const places = new Set(starterQuestions.filter((q) => q.domain === d.id).map((q) => q.answer));
    expect(places.size).toBeGreaterThanOrEqual(3);
  }
});

test.each(starterQuestions.map((q) => [q.id, q] as const))('%s does not make its answer the longest choice by a clear margin', (_, q) => {
  const wrong = q.choices.filter((_, i) => i !== q.answer).map((c) => c.length);
  expect(q.choices[q.answer].length).toBeLessThanOrEqual(Math.max(...wrong) + 2);
});

// A question asking a brand or generic name must not be answered by another question's text or source.
test('no question pairs the brand and generic that a name question asks for', () => {
  const nameQuestions = starterQuestions.flatMap((q) => {
    const asked = /(?:generic|brand) name of (\w+)/.exec(q.stem)?.[1].toLowerCase();
    const drug = drugCards.find((c) => c.brand.toLowerCase() === asked || c.generic.split(' ')[0].toLowerCase() === asked);
    return drug === undefined ? [] : [{ id: q.id, brand: drug.brand.toLowerCase(), generic: drug.generic.split(' ')[0].toLowerCase() }];
  });
  expect(nameQuestions.length).toBeGreaterThanOrEqual(7);
  for (const asked of nameQuestions) {
    const pairing = starterQuestions
      .filter((q) => q.id !== asked.id)
      .filter((q) => {
        const text = [q.stem, ...q.choices, q.explanation, q.source.title].join(' ').toLowerCase();
        return text.includes(asked.brand) && text.includes(asked.generic);
      })
      .map((q) => q.id);
    expect({ asked: asked.id, pairing }).toEqual({ asked: asked.id, pairing: [] });
  }
});

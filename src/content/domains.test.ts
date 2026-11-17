import { allocateQuestions, domains, mockExam } from './domains';

test('the four domain weights cover the whole exam', () => {
  expect(domains.reduce((sum, d) => sum + d.weight, 0)).toBe(100);
});

test('a mock exam is split by the 2026 weights and sums to 90', () => {
  const split = allocateQuestions(mockExam.questions, domains.map((d) => d.id));
  expect(split).toEqual({ medications: 32, federal: 17, safety: 21, orderEntry: 20 });
});

test('only the chosen domains receive questions', () => {
  const split = allocateQuestions(10, ['medications', 'federal']);
  expect(split.safety).toBe(0);
  expect(split.orderEntry).toBe(0);
  expect(split.medications + split.federal).toBe(10);
  expect(split.medications).toBeGreaterThan(split.federal);
});

test('no domains or no questions gives an empty split', () => {
  expect(Object.values(allocateQuestions(10, [])).every((n) => n === 0)).toBe(true);
  expect(Object.values(allocateQuestions(-3, ['medications'])).every((n) => n === 0)).toBe(true);
});

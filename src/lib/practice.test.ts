import type { DomainId } from '@/content/domains';
import type { Question } from '@/content/questions';

import {
  availableCount,
  defaultConfig,
  estimateMinutes,
  fromParams,
  pickQuestions,
  scoreTest,
  timeLimitSeconds,
  toParams,
  XP_PER_CORRECT,
  xpFor,
  type TestConfig,
} from './practice';

function make(domain: DomainId, n: number): Question[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${domain}-${i}`,
    domain,
    stem: `Question ${i}`,
    choices: ['a', 'b', 'c', 'd'] as const,
    answer: 0 as const,
    explanation: 'Because.',
    source: { title: 'Fixture', url: 'https://example.com' },
  }));
}

const pool = [...make('medications', 20), ...make('federal', 20), ...make('safety', 20), ...make('orderEntry', 20)];
const all: DomainId[] = ['medications', 'federal', 'safety', 'orderEntry'];
const config = (over: Partial<TestConfig>): TestConfig => ({ domains: all, count: 10, timed: false, showAnswers: 'each', ...over });
const count = (qs: Question[], d: DomainId) => qs.filter((q) => q.domain === d).length;

test('time follows the real exam pace of 110 minutes for 90 questions', () => {
  expect(timeLimitSeconds(90)).toBe(6600);
  expect(timeLimitSeconds(10)).toBe(734);
  expect(estimateMinutes(10)).toBe(13);
});

test('a test is split by exam weight and has no repeats', () => {
  const { questions } = pickQuestions(pool, config({ count: 20 }));
  expect(questions).toHaveLength(20);
  expect(new Set(questions.map((q) => q.id)).size).toBe(20);
  expect(all.map((d) => count(questions, d))).toEqual([7, 4, 5, 4]);
});

test('only the chosen topics appear', () => {
  const { questions } = pickQuestions(pool, config({ domains: ['federal', 'safety'], count: 10 }));
  expect(questions).toHaveLength(10);
  expect(count(questions, 'medications') + count(questions, 'orderEntry')).toBe(0);
});

test('a topic that runs short is topped up from the other chosen topics', () => {
  const thin = [...make('medications', 2), ...make('federal', 20)];
  const { questions } = pickQuestions(thin, config({ domains: ['medications', 'federal'], count: 10 }));
  expect(questions).toHaveLength(10);
  expect(count(questions, 'medications')).toBe(2);
});

test('a pool smaller than the request gives what there is and says what was asked for', () => {
  const picked = pickQuestions(make('federal', 3), config({ domains: ['federal'], count: 10 }));
  expect(picked.questions).toHaveLength(3);
  expect(picked.requested).toBe(10);
});

test('the same random source gives the same test', () => {
  const seeded = () => {
    let s = 7;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  };
  const a = pickQuestions(pool, config({}), seeded()).questions.map((q) => q.id);
  const b = pickQuestions(pool, config({}), seeded()).questions.map((q) => q.id);
  expect(a).toEqual(b);
});

test('scoring separates right, wrong and unanswered, by topic', () => {
  const questions = [...make('medications', 2), ...make('federal', 2)];
  expect(scoreTest(questions, [0, 1, null, 0])).toEqual({
    total: 4,
    correct: 2,
    unanswered: 1,
    percent: 50,
    byDomain: [
      { id: 'medications', correct: 1, total: 2 },
      { id: 'federal', correct: 1, total: 2 },
    ],
  });
});

test('a test with no questions has no percentage, not zero percent', () => {
  expect(scoreTest([], []).percent).toBeNull();
});

describe('route params', () => {
  const config: TestConfig = { domains: ['medications', 'safety'], count: 15, timed: true, showAnswers: 'end' };

  test('a config survives the trip through params', () => {
    expect(toParams(config)).toEqual({ topics: 'medications,safety', count: '15', timed: '1', show: 'end' });
    expect(fromParams(toParams(config))).toEqual(config);
    expect(fromParams(toParams(defaultConfig))).toEqual(defaultConfig);
  });

  test.each([
    ['no topics', { topics: '' }],
    ['a topic that does not exist', { topics: 'medications,cooking' }],
    ['a count the setup screen does not offer', { count: '7' }],
    ['a count that is not a number', { count: 'ten' }],
    ['an unknown timer value', { timed: 'yes' }],
    ['an unknown answers value', { show: 'never' }],
    ['a repeated param', { topics: ['medications', 'safety'] }],
    ['a missing param', { show: undefined }],
  ])('%s gives no config', (_, change) => {
    expect(fromParams({ ...toParams(config), ...change })).toBeNull();
  });
});

test('a correct answer earns points and a wrong one earns none', () => {
  const question = { answer: 2 } as Question;
  expect(xpFor(question, 2)).toBe(XP_PER_CORRECT);
  expect(xpFor(question, 1)).toBe(0);
});

test('available questions are counted for the chosen topics only', () => {
  const pool = [{ domain: 'medications' }, { domain: 'medications' }, { domain: 'federal' }] as Question[];
  expect(availableCount(pool, ['medications'])).toBe(2);
  expect(availableCount(pool, ['medications', 'federal'])).toBe(3);
  expect(availableCount(pool, [])).toBe(0);
});

test('a topic listed twice does not put a question in the test twice', () => {
  const pool = make('medications', 6);
  const picked = pickQuestions(pool, { domains: ['medications', 'medications'], count: 10, timed: false, showAnswers: 'each' }, () => 0.5);
  expect(picked.questions).toHaveLength(6);
  expect(new Set(picked.questions.map((q) => q.id)).size).toBe(6);
});

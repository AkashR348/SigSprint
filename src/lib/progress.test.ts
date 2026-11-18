import { dayKey, freshProgress, mergeRecovered, parseProgress, recordAnswer, salvageHandled, salvageProgress, streakDays } from './progress';

test('a day key is the local calendar date', () => {
  expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
});

test('a sound save round-trips through JSON', () => {
  const saved = recordAnswer(freshProgress(), '2026-11-17', 10);
  expect(saved).not.toBeNull();
  expect(parseProgress(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
});

test.each([
  ['not an object', 'nope'],
  ['an unknown version', { version: 2, dailyGoal: 20, xp: 0, days: {} }],
  ['a negative count', { version: 1, dailyGoal: 20, xp: -1, days: {} }],
  ['a missing number', { version: 1, dailyGoal: 20, xp: null, days: {} }],
  ['a zero goal', { version: 1, dailyGoal: 0, xp: 0, days: {} }],
  ['a fractional day count', { version: 1, dailyGoal: 20, xp: 0, days: { '2026-11-17': 1.5 } }],
  ['a malformed day key', { version: 1, dailyGoal: 20, xp: 0, days: { today: 3 } }],
  ['a day that is not on the calendar', { version: 1, dailyGoal: 20, xp: 0, days: { '2026-02-30': 3 } }],
])('a save with %s is rejected, not zeroed', (_name, value) => {
  expect(parseProgress(value)).toBeNull();
});

test('recording an answer counts the day and adds the points without touching the old value', () => {
  const before = freshProgress();
  const once = recordAnswer(before, '2026-11-17', 10);
  const twice = once && recordAnswer(once, '2026-11-17', 5);
  expect(twice).toEqual({ version: 1, dailyGoal: 20, xp: 15, days: { '2026-11-17': 2 } });
  expect(before).toEqual(freshProgress());
});

test.each([
  ['a day that is not a date', 'tomorrow', 10],
  ['a timestamp', '2026-11-17T09:00:00Z', 10],
  ['points that are not a number', '2026-11-17', Number.NaN],
  ['fractional points', '2026-11-17', 2.5],
])('an answer with %s is refused, not quietly counted', (_name, day, xp) => {
  expect(recordAnswer(freshProgress(), day, xp)).toBeNull();
});

test('a wrong answer takes points and still counts the day', () => {
  const before = { ...freshProgress(), xp: 20 };
  expect(recordAnswer(before, '2026-11-17', -5)).toEqual({ ...before, xp: 15, days: { '2026-11-17': 1 } });
});

test.each([[0, -5], [3, -5]])('a total of %i stops at 0 when an answer takes more', (xp, change) => {
  const after = recordAnswer({ ...freshProgress(), xp }, '2026-11-17', change);
  expect(after).toMatchObject({ xp: 0, days: { '2026-11-17': 1 } });
});

test('an answer that would push a total past exact integers is refused', () => {
  const full = { ...freshProgress(), xp: Number.MAX_SAFE_INTEGER };
  expect(recordAnswer(full, '2026-11-17', 1)).toBeNull();
});

test('a streak counts back from today across a month boundary', () => {
  const days = { '2026-10-30': 4, '2026-10-31': 1, '2026-11-01': 2 };
  expect(streakDays(days, '2026-11-01')).toBe(3);
});

test('a streak survives until the end of the next day, then breaks', () => {
  const days = { '2026-11-15': 3, '2026-11-16': 3 };
  expect(streakDays(days, '2026-11-17')).toBe(2);
  expect(streakDays(days, '2026-11-18')).toBe(0);
});

test('a day with zero answers does not extend a streak', () => {
  expect(streakDays({ '2026-11-16': 0, '2026-11-17': 1 }, '2026-11-17')).toBe(1);
  expect(streakDays({}, '2026-11-17')).toBe(0);
});

test('a save that lists handled backups round-trips, and a bad list is damage', () => {
  const saved = { ...freshProgress(), handledBackups: ['sigsprint.progress.backup.1'] };
  expect(parseProgress(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  expect(parseProgress({ ...freshProgress(), handledBackups: [1] })).toBeNull();
  expect(parseProgress({ ...freshProgress(), handledBackups: 'x' })).toBeNull();
});

test('salvage keeps the sound days and says the points were unreadable', () => {
  const damaged = { version: 1, dailyGoal: 20, xp: -4, days: { '2026-11-16': 12, '2026-02-30': 9, '2026-11-17': 1.5, nope: 3 } };
  expect(salvageProgress(damaged)).toEqual({ days: { '2026-11-16': 12 }, answers: 12, xp: null });
});

test('salvage keeps sound points when the days are gone', () => {
  expect(salvageProgress({ xp: 130, days: 'lost' })).toEqual({ days: {}, answers: 0, xp: 130 });
});

test.each([['text', 'oops'], ['a list', [1, 2]], ['nothing sound', { xp: 'many', days: { nope: 1 } }], ['only zeros', { xp: 0, days: { '2026-11-16': 0 } }]])(
  'salvage finds nothing in %s',
  (_name, value) => {
    expect(salvageProgress(value)).toBeNull();
  },
);

test('recovered answers and points are added to what is there now, and the backup is marked handled', () => {
  const now = { ...freshProgress(), xp: 20, days: { '2026-11-17': 2 } };
  const found = { days: { '2026-11-16': 12, '2026-11-17': 3 }, answers: 15, xp: 130 };
  expect(mergeRecovered(now, found, ['b1'])).toEqual({
    version: 1, dailyGoal: 20, xp: 150, days: { '2026-11-16': 12, '2026-11-17': 5 }, handledBackups: ['b1'],
  });
});

test('unreadable points add nothing, and setting a backup aside changes only the handled list', () => {
  const now = { ...freshProgress(), xp: 20, days: { '2026-11-17': 2 } };
  expect(mergeRecovered(now, { days: { '2026-11-16': 1 }, answers: 1, xp: null }, ['b1'])?.xp).toBe(20);
  expect(mergeRecovered(now, null, ['b1'])).toEqual({ ...now, handledBackups: ['b1'] });
});

test('a merge that would pass exact integers is refused', () => {
  const full = { ...freshProgress(), xp: Number.MAX_SAFE_INTEGER };
  expect(mergeRecovered(full, { days: {}, answers: 0, xp: 1 }, ['b1'])).toBeNull();
});

test('several keys are marked handled in one merge, each listed once', () => {
  const now = { ...freshProgress(), handledBackups: ['b0'] };
  expect(mergeRecovered(now, null, ['b1', 'b0', 'b2'])?.handledBackups).toEqual(['b0', 'b1', 'b2']);
});

test('handled keys are salvaged from a damaged save, and only the strings', () => {
  expect(salvageHandled({ xp: 'bad', handledBackups: ['b1', 7, null, 'b2'] })).toEqual(['b1', 'b2']);
  expect(salvageHandled({ handledBackups: 'b1' })).toEqual([]);
  expect(salvageHandled(null)).toEqual([]);
});

test('a save with card schedules is read back whole', () => {
  const saved = { ...freshProgress(), cards: { 'drug-a': { due: '2026-11-19', gap: 2 }, 'drug-b': { due: '2026-11-17', gap: 0 } } };
  expect(parseProgress(saved)).toEqual(saved);
});

test.each([
  ['a list instead of a map', []],
  ['a due day that is not a date', { 'drug-a': { due: 'soon', gap: 2 } }],
  ['a negative gap', { 'drug-a': { due: '2026-11-19', gap: -1 } }],
  ['a missing gap', { 'drug-a': { due: '2026-11-19' } }],
  ['an empty schedule', { 'drug-a': null }],
])('a save whose card schedules hold %s is rejected, not read as unrated', (_name, cards) => {
  expect(parseProgress({ ...freshProgress(), cards })).toBeNull();
});

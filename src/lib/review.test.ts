import { freshProgress, parseProgress } from './progress';
import { countReady, daysBetween, MAX_GAP, nextDue, nextGap, rateCard, sessionCards } from './review';

const today = '2026-11-17';

test('Again comes back the same day, Good in 2 days and Easy in 5', () => {
  expect([nextGap(undefined, 'again'), nextGap(undefined, 'good'), nextGap(undefined, 'easy')]).toEqual([0, 2, 5]);
});

test('the gap grows each time a card is rated Good or Easy again, and stops at the cap', () => {
  expect([nextGap(2, 'good'), nextGap(4, 'good'), nextGap(5, 'easy'), nextGap(2, 'easy')]).toEqual([4, 8, 15, 6]);
  expect(nextGap(40, 'good')).toBe(MAX_GAP);
  expect(nextGap(40, 'easy')).toBe(MAX_GAP);
});

test('Again sets a grown gap back, so the next Good starts from 2', () => {
  expect(nextGap(16, 'again')).toBe(0);
  expect(nextGap(0, 'good')).toBe(2);
});

test('rating a card schedules it, counts toward the day, and adds no points', () => {
  const before = { ...freshProgress(), xp: 30 };
  const after = rateCard(before, today, 'drug-a', 'good');
  expect(after).toEqual({ ...before, days: { [today]: 1 }, cards: { 'drug-a': { due: '2026-11-19', gap: 2 } } });
  const again = after && rateCard(after, '2026-11-19', 'drug-a', 'easy');
  expect(again).toMatchObject({ xp: 30, days: { [today]: 1, '2026-11-19': 1 }, cards: { 'drug-a': { due: '2026-11-25', gap: 6 } } });
  expect(before.cards).toBeUndefined();
});

test('a due date crosses the end of a month', () => {
  expect(rateCard(freshProgress(), '2026-11-28', 'drug-a', 'easy')?.cards).toEqual({ 'drug-a': { due: '2026-12-03', gap: 5 } });
});

test('a rating on a day that is not a date, or for no card, is refused', () => {
  expect(rateCard(freshProgress(), 'today', 'drug-a', 'good')).toBeNull();
  expect(rateCard(freshProgress(), today, '', 'good')).toBeNull();
});

test('what a rating saves is read back as sound progress', () => {
  const saved = rateCard(freshProgress(), today, 'drug-a', 'again');
  expect(parseProgress(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
});

const states = {
  a: { due: '2026-11-15', gap: 2 },
  b: { due: today, gap: 0 },
  c: { due: '2026-11-20', gap: 5 },
  d: { due: '2026-11-10', gap: 4 },
};
const deck = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }));
const ids = deck.map((c) => c.id);

test('cards due today or earlier are counted for review, and unrated ones as new', () => {
  expect(countReady(ids, states, today)).toEqual({ review: 3, fresh: 2 });
  expect(countReady(ids, undefined, today)).toEqual({ review: 0, fresh: 6 });
});

test('a sitting takes the longest overdue first, then new cards, and leaves out what is not due', () => {
  expect(sessionCards(deck, states, today).map((c) => c.id)).toEqual(['d', 'a', 'b', 'e', 'f']);
  expect(sessionCards(deck, states, today, 4).map((c) => c.id)).toEqual(['d', 'a', 'b', 'e']);
  expect(sessionCards(deck, undefined, today).map((c) => c.id)).toEqual(ids);
});

test('the next due day is the soonest after today, or null when none is scheduled', () => {
  expect(nextDue(ids, states, today)).toBe('2026-11-20');
  expect(nextDue(ids, { b: states.b }, today)).toBeNull();
  expect(nextDue(ids, undefined, today)).toBeNull();
});

test('days between two dates count across a month and a clock change', () => {
  expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
  expect(daysBetween(today, today)).toBe(0);
});

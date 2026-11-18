import { drugCards, stemSource } from './drugCards';

test('there are 24 cards, each with its own id, brand and generic name', () => {
  expect(drugCards).toHaveLength(24);
  for (const key of ['id', 'brand', 'generic'] as const) {
    expect(new Set(drugCards.map((c) => c[key].toLowerCase())).size).toBe(24);
  }
});

test.each(drugCards.map((c) => [c.id, c] as const))('%s has every fact and its own label on DailyMed', (_, card) => {
  for (const fact of [card.brand, card.generic, card.drugClass, card.usedFor, card.watchFor]) {
    expect(fact.trim().length).toBeGreaterThan(2);
  }
  const url = new URL(card.source.url);
  expect(url.protocol).toBe('https:');
  expect(url.hostname).toBe('dailymed.nlm.nih.gov');
  expect(url.searchParams.get('setid')).toMatch(/^[0-9a-f-]{36}$/);
  expect(card.source.title).toContain(card.brand);
});

test('no two cards cite the same label', () => {
  expect(new Set(drugCards.map((c) => c.source.url)).size).toBe(24);
});

test('a memory trick names a stem that the generic name really ends in', () => {
  const tricks = drugCards.filter((c) => c.trick !== undefined);
  expect(tricks.length).toBeGreaterThan(0);
  for (const card of tricks) {
    const stem = /^Names ending in -([a-z]+) are /.exec(card.trick ?? '')?.[1];
    expect(stem).toBeDefined();
    expect(card.generic.split(' ')[0].endsWith(stem ?? '?')).toBe(true);
  }
  expect(new URL(stemSource.url).hostname).toBe('www.who.int');
});

import { doneLine, gapLabel, ratingSpoken, readyLine, toDirection, deckLabel, nameSize, deckIntro, sittingLimit, sittingTitle, toDeck } from './flashcardText';

test('only the two directions are read from a route', () => {
  expect(toDirection('brand')).toBe('brand');
  expect(toDirection('generic')).toBe('generic');
  expect(toDirection(['brand'])).toBeNull();
  expect(toDirection(undefined)).toBeNull();
});

test('a gap is drawn as soon or a number of days, and spoken with the rating', () => {
  expect([gapLabel(0), gapLabel(1), gapLabel(5)]).toEqual(['soon', '1 day', '5 days']);
  expect(ratingSpoken('again', 0)).toBe('Again, shows this card again soon');
  expect(ratingSpoken('easy', 5)).toBe('Easy, shows this card again in 5 days');
});

test('the ready line says what is waiting, and how many this sitting holds', () => {
  expect(readyLine(4, 8, 12, null)).toBe('12 cards ready: 4 to review, 8 new.');
  expect(readyLine(0, 1, 1, null)).toBe('1 card ready: 1 new.');
  expect(readyLine(3, 0, 3, 2)).toBe('3 cards ready: 3 to review.');
  expect(readyLine(10, 14, 20, null)).toBe('24 cards ready: 10 to review, 14 new. This sitting has 20.');
});

test('nothing due is not the same as no cards', () => {
  expect(readyLine(0, 0, 0, 1)).toBe('Nothing is due today. Your next card is due tomorrow.');
  expect(readyLine(0, 0, 0, 3)).toBe('Nothing is due today. Your next card is due in 3 days.');
  expect(readyLine(0, 0, 0, null)).toBe('There are no cards yet.');
});

test('the end of a sitting says how many cards and when the next is due', () => {
  expect(doneLine(1, 0, 2)).toBe('You went through 1 card. Your next card is due in 2 days.');
  expect(doneLine(20, 0, null)).toBe('You went through 20 cards.');
});

test('the end of a sitting says cards are still ready before it names a later day', () => {
  expect(doneLine(20, 4, 2)).toBe('You went through 20 cards. 4 more cards are ready now.');
  expect(doneLine(20, 1, null)).toBe('You went through 20 cards. 1 more card is ready now.');
  expect(deckLabel(24)).toBe('Top drugs: 24 so far');
});

test('a drug name keeps its full size when it fits, and shrinks by its longest word when it does not', () => {
  expect(nameSize('lisinopril', 306, 1)).toBe(36);
  expect(nameSize('metoprolol succinate', 306, 1)).toBe(36);
  expect(nameSize('Singulair', 111, 1)).toBe(18);
  expect(nameSize('Singulair', 306, 2)).toBe(25);
  expect(nameSize('levothyroxine', 60, 3)).toBe(16);
  expect(nameSize('', 306, 1)).toBe(36);
  expect(nameSize('Zestril', 0, 1)).toBe(36);
});

test('a sitting size is 10, 20 or no limit, and anything else is not one', () => {
  expect([sittingLimit('10'), sittingLimit('20'), sittingLimit('all')]).toEqual([10, 20, Number.POSITIVE_INFINITY]);
  expect([sittingLimit('30'), sittingLimit(20), sittingLimit(undefined), sittingLimit(['10'])]).toEqual([null, null, null, null]);
});

test('a deck is drug names or boxed warnings, and each says what it holds', () => {
  expect([toDeck('drugs'), toDeck('boxed'), toDeck('all'), toDeck(undefined)]).toEqual(['drugs', 'boxed', null, null]);
  expect(deckIntro('drugs', 24)).toMatch(/^24 of the top 200 drugs so far\./);
  expect(deckIntro('boxed', 12)).toMatch(/^12 drugs in the deck whose FDA label has a boxed warning\./);
  expect(sittingTitle('drugs', 'generic')).toBe('Top drugs · Generic to brand');
  expect(sittingTitle('boxed', 'generic')).toBe('Boxed warnings');
});

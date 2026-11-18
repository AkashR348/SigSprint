import type { DomainId } from './domains';

// Where a question's answer was confirmed. Rule 7: no source, no question.
export type Source = { title: string; url: string };

export type Question = {
  id: string;
  domain: DomainId;
  stem: string;
  // Exactly four, with one clearly correct.
  choices: readonly [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: string;
  source: Source;
};

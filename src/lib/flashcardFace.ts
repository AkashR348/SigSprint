import type { BoxedWarning } from '@/content/boxedWarnings';
import { stemSource, type DrugCard } from '@/content/drugCards';
import type { Source } from '@/content/questions';

import type { Direction } from './flashcardText';

// The two sides of one flashcard, whatever deck it is from. `phrase` marks an answer that is a
// sentence and not a name, which is drawn smaller.
export type Face = {
  id: string;
  lead: string;
  name: string;
  answerLead: string;
  answer: string;
  // What a screen reader says when the answer is given focus: the question with its answer.
  spoken: string;
  phrase: boolean;
  detail?: string;
  // A caution about the answer itself, drawn under the detail.
  note?: string;
  facts: readonly { label: string; value: string }[];
  trick?: string;
  sources: readonly Source[];
};

/** A drug card asked from the brand name or from the generic name. */
export function drugFace(card: DrugCard, direction: Direction): Face {
  const asked = direction === 'brand' ? card.brand : card.generic;
  const answer = direction === 'brand' ? card.generic : card.brand;
  return {
    id: card.id,
    lead: `What is the ${direction === 'brand' ? 'generic' : 'brand'} name for`,
    name: asked,
    answerLead: `${asked} is`,
    answer,
    spoken: `${asked} is ${answer}`,
    phrase: false,
    facts: [
      { label: 'Class', value: card.drugClass },
      { label: 'Used for', value: card.usedFor },
      { label: 'Watch for', value: card.watchFor },
    ],
    trick: card.trick,
    sources: card.trick === undefined ? [card.source] : [card.source, stemSource],
  };
}

/** A boxed warning card: the drug on the front, its warning on the back. */
export function warningFace(card: BoxedWarning): Face {
  const drug = `${card.brand} (${card.generic})`;
  return {
    id: card.id,
    lead: 'What is the boxed warning for',
    name: drug,
    answerLead: `Boxed warning for ${drug}`,
    answer: card.heading,
    spoken: `${drug}: ${card.heading}`,
    phrase: true,
    detail: card.detail,
    ...(card.note === undefined ? {} : { note: card.note }),
    facts: [],
    sources: [card.source],
  };
}

import type { BoxedWarning } from '@/content/boxedWarnings';
import { stemSource, type DrugCard } from '@/content/drugCards';

import { drugFace, warningFace } from './flashcardFace';

const source = { title: 'Zestril label, DailyMed', url: 'https://dailymed.nlm.nih.gov/x' };
const drug: DrugCard = {
  id: 'drug-lisinopril',
  brand: 'Zestril',
  generic: 'lisinopril',
  drugClass: 'ACE inhibitor',
  usedFor: 'High blood pressure',
  watchFor: 'Cough',
  trick: 'Names ending in -pril are ACE inhibitors.',
  source,
};

test('a drug card asks with one name and answers with the other', () => {
  expect(drugFace(drug, 'brand')).toMatchObject({
    id: 'drug-lisinopril',
    lead: 'What is the generic name for',
    name: 'Zestril',
    answerLead: 'Zestril is',
    answer: 'lisinopril',
    phrase: false,
  });
  expect(drugFace(drug, 'generic')).toMatchObject({ lead: 'What is the brand name for', name: 'lisinopril', answerLead: 'lisinopril is', answer: 'Zestril' });
});

test('a drug card lists its three facts, and cites the stem list only when it has a trick', () => {
  expect(drugFace(drug, 'brand').facts).toEqual([
    { label: 'Class', value: 'ACE inhibitor' },
    { label: 'Used for', value: 'High blood pressure' },
    { label: 'Watch for', value: 'Cough' },
  ]);
  expect(drugFace(drug, 'brand').sources).toEqual([source, stemSource]);
  const plain = drugFace({ ...drug, trick: undefined }, 'brand');
  expect(plain.trick).toBeUndefined();
  expect(plain.sources).toEqual([source]);
});

test('a warning card shows the drug by both names and answers with the warning and its label', () => {
  const card: BoxedWarning = { id: 'boxed-lisinopril', brand: 'Zestril', generic: 'lisinopril', heading: 'Fetal toxicity', detail: 'Stop it when pregnancy is detected.', source };
  expect(warningFace(card)).toEqual({
    id: 'boxed-lisinopril',
    lead: 'What is the boxed warning for',
    name: 'Zestril (lisinopril)',
    answerLead: 'Boxed warning for Zestril (lisinopril)',
    answer: 'Fetal toxicity',
    phrase: true,
    detail: 'Stop it when pregnancy is detected.',
    facts: [],
    sources: [source],
  });
});

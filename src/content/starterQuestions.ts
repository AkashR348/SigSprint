import type { Question, Source } from './questions';

// Each answer was read in the source named beside it (rule 7). Sums use a fact from the source.
const ecfr = (part: string, title: string): Source => ({ title, url: `https://www.ecfr.gov/current/title-21/chapter-II/part-${part}` });
const label = (title: string, setid: string): Source => ({
  title: `${title} label, DailyMed`,
  url: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`,
});

const lipitor = label('Lipitor (atorvastatin calcium) tablets', 'a60cc18b-0631-4cf0-b021-9f52224ece65');
const lisinopril = label('Lisinopril tablets', 'b62815f3-77fc-4074-a28a-918ab5cc32db');
const metformin = label('Metformin hydrochloride tablets', 'a7999fa7-886f-33c7-e053-2995a90aa3f5');
const warfarin = label('Warfarin sodium tablets', '541c9a70-adaf-4ef3-94ba-ad4e70dfa057');
const levothyroxine: Source = {
  title: 'Levothyroxine sodium tablets label, DailyMed',
  url: 'https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=65c8b305-8ffb-4aa5-aca1-f4e4ead71a9c',
};
const amoxicillin: Source = {
  title: 'Amoxicillin for oral suspension label, DailyMed',
  url: 'https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=077f4a65-3cfb-4cb1-99f2-e27ffc5939c0',
};
const humulin = label('Humulin R (insulin human) injection', 'b519bd83-038c-4ec5-a231-a51ec5cc291f');
const part1306 = ecfr('1306', '21 CFR Part 1306, Prescriptions (DEA)');
const ndc: Source = {
  title: 'FDA, National Drug Code Database Background Information',
  url: 'https://www.fda.gov/drugs/development-approval-process-drugs/national-drug-code-database-background-information',
};

export const starterQuestions: readonly Question[] = [
  {
    id: 'med-001',
    domain: 'medications',
    stem: 'What is the generic name of Lipitor?',
    choices: ['Amlodipine', 'Atorvastatin', 'Lisinopril', 'Metformin'],
    answer: 1,
    explanation: 'Lipitor is atorvastatin calcium, an HMG-CoA reductase inhibitor (a statin).',
    source: lipitor,
  },
  {
    id: 'med-002',
    domain: 'medications',
    stem: 'Lisinopril belongs to which drug class?',
    choices: ['HMG-CoA reductase inhibitor (statin)', 'Vitamin K antagonist', 'Angiotensin converting enzyme (ACE) inhibitor', 'Penicillin antibiotic'],
    answer: 2,
    explanation: 'The label describes lisinopril as an angiotensin converting enzyme (ACE) inhibitor, used for high blood pressure, heart failure and after a heart attack.',
    source: lisinopril,
  },
  {
    id: 'med-003',
    domain: 'medications',
    stem: 'The boxed warning on metformin tablets is about which risk?',
    choices: ['Lactic acidosis', 'Bleeding', 'Harm to an unborn baby', 'Use for weight loss'],
    answer: 0,
    explanation: 'The metformin label carries the boxed warning "Lactic acidosis". Bleeding is the boxed warning for warfarin, fetal toxicity for lisinopril, and use for weight loss for levothyroxine.',
    source: metformin,
  },
  {
    id: 'med-004',
    domain: 'medications',
    stem: 'Warfarin belongs to which drug class?',
    choices: ['ACE inhibitor', 'HMG-CoA reductase inhibitor (statin)', 'Penicillin antibiotic', 'Vitamin K antagonist'],
    answer: 3,
    explanation: 'The label describes warfarin as a vitamin K antagonist. Its boxed warning is for bleeding risk.',
    source: warfarin,
  },
  {
    id: 'med-005',
    domain: 'medications',
    stem: 'According to its label, how should levothyroxine tablets be taken?',
    choices: [
      'With the largest meal of the day',
      'Once daily on an empty stomach, one-half to one hour before breakfast',
      'At bedtime with a snack',
      'Twice daily with food',
    ],
    answer: 1,
    explanation: 'The label says to give levothyroxine as a single daily dose, on an empty stomach, one-half to one hour before breakfast.',
    source: levothyroxine,
  },
  {
    id: 'med-006',
    domain: 'medications',
    stem: 'According to its label, after amoxicillin for oral suspension is mixed, any unused portion must be discarded after how many days?',
    choices: ['7 days', '10 days', '14 days', '30 days'],
    answer: 2,
    explanation: 'The label says any unused portion of the reconstituted suspension must be discarded after 14 days. Refrigeration is preferable, but not required.',
    source: amoxicillin,
  },
  {
    id: 'fed-001',
    domain: 'federal',
    stem: 'Under federal rules, how many times may a prescription for a Schedule II controlled substance be refilled?',
    choices: ['It may not be refilled', 'Once', 'Up to 5 times in 6 months', 'As many times as the prescriber writes'],
    answer: 0,
    explanation: '21 CFR 1306.12(a): the refilling of a prescription for a controlled substance listed in Schedule II is prohibited.',
    source: part1306,
  },
  {
    id: 'fed-002',
    domain: 'federal',
    stem: 'Under federal rules, a prescription for a Schedule III or IV controlled substance may be refilled at most:',
    choices: ['2 times within 30 days', '5 times within 12 months', '11 times within 12 months', '5 times within 6 months of the date it was issued'],
    answer: 3,
    explanation: '21 CFR 1306.22(a): it may not be filled or refilled more than six months after the date it was issued, and may not be refilled more than five times.',
    source: {
      title: '21 CFR 1306.22, Refilling of prescriptions (DEA)',
      url: 'https://www.ecfr.gov/current/title-21/chapter-II/part-1306/subject-group-ECFRe4ae2bfb4eae102/section-1306.22',
    },
  },
  {
    id: 'fed-003',
    domain: 'federal',
    stem: 'Which DEA form, or its electronic equivalent, is required to order Schedule II controlled substances?',
    choices: ['DEA Form 41', 'DEA Form 106', 'DEA Form 222', 'DEA Form 224'],
    answer: 2,
    explanation: '21 CFR 1305.03: a DEA Form 222 or its electronic equivalent is required for each distribution of a Schedule I or II controlled substance.',
    source: ecfr('1305', '21 CFR Part 1305, Orders for Schedule I and II Controlled Substances (DEA)'),
  },
  {
    id: 'fed-004',
    domain: 'federal',
    stem: 'Under DEA rules, controlled substance inventories and records must be kept for at least:',
    choices: ['6 months', '2 years', '5 years', '10 years'],
    answer: 1,
    explanation: '21 CFR 1304.04(a): every inventory and other required record must be kept for at least 2 years from its date.',
    source: ecfr('1304', '21 CFR Part 1304, Records and Reports of Registrants (DEA)'),
  },
  {
    id: 'fed-005',
    domain: 'federal',
    stem: 'Under federal rules, what is the most pseudoephedrine base a pharmacy may sell to one purchaser in a single calendar day?',
    choices: ['3.6 grams', '1.2 grams', '7.5 grams', '30 grams'],
    answer: 0,
    explanation: '21 CFR 1314.20(a): a regulated seller may not sell any purchaser more than 3.6 grams of pseudoephedrine base in a single calendar day, however many transactions there are.',
    source: ecfr('1314', '21 CFR Part 1314, Retail Sale of Scheduled Listed Chemical Products (DEA)'),
  },
  {
    id: 'fed-006',
    domain: 'federal',
    stem: 'Under federal rules, which of these must appear on every prescription for a controlled substance?',
    choices: ["The patient's Social Security number", "The patient's diagnosis", "The pharmacy's phone number", "The prescriber's DEA registration number"],
    answer: 3,
    explanation: "21 CFR 1306.05(a): it must bear the patient's full name and address, the drug name, strength, dosage form, quantity, directions, and the practitioner's name, address and registration number.",
    source: part1306,
  },
  {
    id: 'saf-001',
    domain: 'safety',
    stem: 'Writing two look-alike drug names as buPROPion and busPIRone is an example of:',
    choices: ['A boxed warning', 'Tall man lettering', 'A National Drug Code', 'A recall notice'],
    answer: 1,
    explanation: "Tall man lettering uses uppercase letters to help tell look-alike drug names apart. buPROPion and busPIRone are a pair on the FDA's list.",
    source: {
      title: 'FDA Name Differentiation Project',
      url: 'https://www.fda.gov/drugs/medication-errors-related-cder-regulated-drug-products/fda-name-differentiation-project',
    },
  },
  {
    id: 'saf-002',
    domain: 'safety',
    stem: 'Which FDA recall class is for a product with a reasonable probability of causing serious adverse health consequences or death?',
    choices: ['Class I', 'Class II', 'Class III', 'Class IV'],
    answer: 0,
    explanation: 'Class I is the most serious. Class II covers temporary or medically reversible harm, and Class III a product not likely to cause adverse health consequences.',
    source: {
      title: 'FDA, Recalls Background and Definitions',
      url: 'https://www.fda.gov/safety/industry-guidance-recalls/recalls-background-and-definitions',
    },
  },
  {
    id: 'saf-003',
    domain: 'safety',
    stem: "What is the name of the FDA's safety information and adverse event reporting program for medicines?",
    choices: ['iPLEDGE', 'VAERS', 'MedWatch', 'The NDC Directory'],
    answer: 2,
    explanation: 'MedWatch is the FDA Safety Information and Adverse Event Reporting Program. Health professionals can report voluntarily on Form FDA 3500.',
    source: {
      title: 'FDA, MedWatch Forms for FDA Safety Reporting',
      url: 'https://www.fda.gov/safety/medical-product-safety-information/medwatch-forms-fda-safety-reporting',
    },
  },
  {
    id: 'saf-004',
    domain: 'safety',
    stem: 'A patient has a health problem after a vaccine. Which national system, run by CDC and FDA together, takes that report?',
    choices: ['iPLEDGE', 'The NDC Directory', 'MedWatch', 'VAERS'],
    answer: 3,
    explanation: 'The Vaccine Adverse Event Reporting System (VAERS) is co-managed by CDC and FDA. Anyone can submit a report, including patients and healthcare providers.',
    source: { title: 'CDC, About the Vaccine Adverse Event Reporting System (VAERS)', url: 'https://www.cdc.gov/vaccine-safety-systems/vaers/index.html' },
  },
  {
    id: 'saf-005',
    domain: 'safety',
    stem: 'The iPLEDGE program controls the dispensing of which drug?',
    choices: ['Warfarin', 'Isotretinoin', 'Metformin', 'Levothyroxine'],
    answer: 1,
    explanation: 'Isotretinoin causes severe birth defects, so it is dispensed only under the iPLEDGE REMS, whose goal is to reduce the risk of embryo-fetal toxicity.',
    source: {
      title: 'FDA, Isotretinoin Capsule Information',
      url: 'https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/isotretinoin-capsule-information',
    },
  },
  {
    id: 'saf-006',
    domain: 'safety',
    stem: "Under OSHA's Hazard Communication Standard, safety data sheets for hazardous chemicals in the pharmacy must be:",
    choices: [
      'Readily accessible to employees during each work shift',
      "Kept locked in the manager's office",
      'Shown to employees only on written request',
      'Handed to each patient',
    ],
    answer: 0,
    explanation: '29 CFR 1910.1200(g)(8): the employer keeps the safety data sheets in the workplace and makes sure they are readily accessible to employees during each work shift. Electronic access is allowed.',
    source: { title: 'OSHA, 29 CFR 1910.1200 Hazard Communication', url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200' },
  },
  {
    id: 'ord-001',
    domain: 'orderEntry',
    stem: 'What does the first segment of a National Drug Code (NDC) identify?',
    choices: ['The package size', 'The strength and dosage form', 'The labeler', 'The expiration date'],
    answer: 2,
    explanation: 'The first segment is the labeler code, assigned by the FDA. The second is the product code and the third is the package code.',
    source: ndc,
  },
  {
    id: 'ord-002',
    domain: 'orderEntry',
    stem: 'Two bottles hold the same drug, strength and dosage form from the same company: one has 30 tablets and one has 100. Which NDC segment is different?',
    choices: ['The first (labeler code)', 'The second (product code)', 'All three', 'The third (package code)'],
    answer: 3,
    explanation: 'The package code identifies package sizes and types. The labeler and the product (strength, dosage form and formulation) are the same, so the first two segments match.',
    source: ndc,
  },
  {
    id: 'ord-003',
    domain: 'orderEntry',
    stem: 'A prescription is for amoxicillin 500 mg per dose. The pharmacy has amoxicillin suspension 250 mg/5 mL. How many mL is one dose?',
    choices: ['5 mL', '10 mL', '2.5 mL', '20 mL'],
    answer: 1,
    explanation: '500 mg is twice 250 mg, so one dose is twice 5 mL: 10 mL.',
    source: amoxicillin,
  },
  {
    id: 'ord-004',
    domain: 'orderEntry',
    stem: 'A dose of a liquid medicine is 10 mL. How many teaspoons is that?',
    choices: ['2 teaspoons', '1 teaspoon', '3 teaspoons', '5 teaspoons'],
    answer: 0,
    explanation: '1 teaspoon is 5 mL, so 10 mL is 2 teaspoons.',
    source: {
      title: 'FDA, Guidelines for Determining Metric Equivalents of Household Measures',
      url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-guidelines-determining-metric-equivalents-household-measures',
    },
  },
  {
    id: 'ord-005',
    domain: 'orderEntry',
    stem: 'A dose is 30 units of U-100 insulin. What volume is that?',
    choices: ['3 mL', '0.03 mL', '0.3 mL', '30 mL'],
    answer: 2,
    explanation: 'U-100 insulin has 100 units in each mL, so 30 units is 30 ÷ 100 = 0.3 mL.',
    source: humulin,
  },
  {
    id: 'ord-006',
    domain: 'orderEntry',
    stem: 'A child weighs 44 pounds. Using 1 kg = 2.2 pounds, what is the weight in kilograms?',
    choices: ['96.8 kg', '22 kg', '4.4 kg', '20 kg'],
    answer: 3,
    explanation: '44 ÷ 2.2 = 20 kg.',
    source: {
      title: 'NIST, Metric Kitchen: Cooking Measurement Equivalencies',
      url: 'https://www.nist.gov/pml/owm/metric-si/metric-kitchen/metric-kitchen-cooking-measurement-equivalencies',
    },
  },
];

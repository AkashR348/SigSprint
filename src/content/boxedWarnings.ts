import { drugCards } from './drugCards';
import type { Source } from './questions';

// One card for each drug in the deck whose FDA label carries a boxed warning in its Highlights.
// `heading` is the label's own heading, shortened; `detail` is the warning under it, shortened.
export type BoxedWarning = {
  id: string;
  brand: string;
  generic: string;
  heading: string;
  detail: string;
  source: Source;
};

// Brand, generic and label come from the drug's own card, so the two decks cannot disagree.
function warning(drugId: string, heading: string, detail: string): BoxedWarning {
  const drug = drugCards.find((c) => c.id === drugId);
  if (drug === undefined) throw new Error(`No drug card ${drugId}`);
  return { id: drugId.replace(/^drug-/, 'boxed-'), brand: drug.brand, generic: drug.generic, heading, detail, source: drug.source };
}

const fetal =
  'Stop it as soon as pregnancy is detected. Drugs that act directly on the renin-angiotensin system can cause injury and death to the developing fetus.';
const suicidal =
  'Antidepressants increased the risk of suicidal thoughts and behaviors in pediatric and young adult patients. Monitor closely for clinical worsening and for suicidal thoughts and behaviors.';

export const boxedWarnings: readonly BoxedWarning[] = [
  warning('drug-lisinopril', 'Fetal toxicity', fetal),
  warning('drug-losartan', 'Fetal toxicity', fetal),
  warning(
    'drug-clopidogrel',
    'Diminished antiplatelet effect in CYP2C19 poor metabolizers',
    'It works only after conversion to an active metabolite, mainly by CYP2C19. Tests can identify poor metabolizers; consider another platelet P2Y12 inhibitor for them.',
  ),
  warning(
    'drug-apixaban',
    'Stopping early increases thrombotic events; spinal or epidural hematoma',
    'Stopping any oral anticoagulant early raises the risk of thrombotic events. With neuraxial anesthesia or spinal puncture, a spinal or epidural hematoma may cause long-term or permanent paralysis.',
  ),
  warning(
    'drug-metformin',
    'Lactic acidosis',
    'Cases have resulted in death, hypothermia, hypotension and resistant bradyarrhythmias. Risk factors include renal impairment, age over 65, contrast studies, surgery, excessive alcohol intake and hepatic impairment. If it is suspected, stop the drug and treat in a hospital.',
  ),
  warning(
    'drug-levothyroxine',
    'Not for obesity or weight loss',
    'Thyroid hormones should not be used to treat obesity or for weight loss. Doses beyond daily hormonal requirements may produce serious or even life-threatening toxicity.',
  ),
  warning('drug-sertraline', 'Suicidal thoughts and behaviors', suicidal),
  warning('drug-escitalopram', 'Suicidal thoughts and behaviors', suicidal),
  warning(
    'drug-alprazolam',
    'Use with opioids; abuse, misuse and addiction; dependence and withdrawal',
    'With opioids it may cause profound sedation, respiratory depression, coma and death. Abuse, misuse and addiction can lead to overdose or death. Stopping abruptly or cutting the dose quickly may cause life-threatening withdrawal, so it is tapered gradually.',
  ),
  warning(
    'drug-zolpidem',
    'Complex sleep behaviors',
    'Sleep-walking, sleep-driving and other activities while not fully awake may occur and may result in serious injuries, including death. Stop it immediately if one occurs.',
  ),
  warning(
    'drug-montelukast',
    'Serious neuropsychiatric events',
    'Serious neuropsychiatric events have been reported. Stop it immediately if neuropsychiatric symptoms occur. For allergic rhinitis, keep it for patients who did not respond to or cannot take other therapies.',
  ),
  warning(
    'drug-celecoxib',
    'Serious cardiovascular and gastrointestinal events',
    'NSAIDs increase the risk of serious cardiovascular thrombotic events, including heart attack and stroke, which can be fatal. Contraindicated in coronary artery bypass graft (CABG) surgery. NSAIDs also increase the risk of serious GI bleeding, ulceration and perforation, which can be fatal.',
  ),
];

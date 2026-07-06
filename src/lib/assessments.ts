/**
 * The onboarding assessment battery — standardized, public-domain instruments
 * rendered by a single reusable runner and stored as app-owned responses
 * (mobile_assessment_responses), scored client-side. Each maps to a production
 * `profiles.id` so responses reconcile into answer_headers/answers at cutover.
 *
 * Instruments:
 *   • intake  — brief readiness/goals (unscored; sets the tone, low friction)
 *   • gad7    — GAD-7 anxiety (0-21)
 *   • phq9    — PHQ-9 depression (0-27; item 9 flags self-harm risk)
 *   • audit_c — AUDIT-C alcohol use (0-12; substance concern only)
 *
 * Scoring bands and item wording follow the published instruments.
 */

export type AssessmentId = 'intake' | 'gad7' | 'phq9' | 'audit_c' | 'pcl5';

/** When an instrument applies: to everyone, or only when substance use is a
 *  stated concern (primary/secondary problem in the 'substance' category). */
export type Applicability = 'always' | 'substance';

export type AnswerOption = { label: string; value: number };
export type Question = { key: string; prompt: string; options: AnswerOption[] };

export type SeverityBand = { max: number; label: string; tone: 'good' | 'mild' | 'warn' | 'alert' };

export type Instrument = {
  id: AssessmentId;
  name: string;
  shortName: string;
  description: string;
  /** Production profiles.id this reconciles to (null when there's no prod
   *  instrument yet, e.g. PCL-5). */
  profileId: number | null;
  applicability: Applicability;
  /** Part of the day-1 onboarding battery (drives the soft content gate). */
  day1: boolean;
  /** Re-administered monthly for progress tracking (drives the Data-page trends
   *  and the "due for a check-in" prompts). */
  recurring: boolean;
  /** XP awarded for completing it. */
  xp: number;
  estMinutes: number;
  scored: boolean;
  questions: Question[];
  /** Ascending bands by max score; the first whose `max` ≥ score wins. */
  bands?: SeverityBand[];
  /** Extra supportive note shown on the result when severity is warn/alert. */
  elevatedNote?: string;
};

/** Days between monthly re-administrations. */
export const MONTHLY_DAYS = 30;

// The standard GAD-7 / PHQ-9 frequency scale.
const FREQ: AnswerOption[] = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 },
];

// PCL-5 uses a 5-point (0–4) frequency/severity scale.
const FREQ5: AnswerOption[] = [
  { label: 'Not at all', value: 0 },
  { label: 'A little bit', value: 1 },
  { label: 'Moderately', value: 2 },
  { label: 'Quite a bit', value: 3 },
  { label: 'Extremely', value: 4 },
];

const q = (key: string, prompt: string, options: AnswerOption[] = FREQ): Question => ({
  key,
  prompt,
  options,
});

export const INSTRUMENTS: Record<AssessmentId, Instrument> = {
  intake: {
    id: 'intake',
    name: 'Quick intake',
    shortName: 'Intake',
    description: 'A few quick questions to understand where you are and what you want.',
    profileId: 163,
    applicability: 'always',
    day1: true,
    recurring: false,
    xp: 15,
    estMinutes: 1,
    scored: false,
    questions: [
      q('readiness', 'How ready do you feel to make a change right now?', [
        { label: 'Not ready yet', value: 0 },
        { label: 'Thinking about it', value: 1 },
        { label: 'Getting ready', value: 2 },
        { label: 'Taking action', value: 3 },
        { label: 'Maintaining my progress', value: 4 },
      ]),
      q('goal', "What's your main goal right now?", [
        { label: 'Cut back', value: 0 },
        { label: 'Quit entirely', value: 1 },
        { label: 'Understand my patterns', value: 2 },
        { label: 'Support my mental health', value: 3 },
        { label: 'Something else', value: 4 },
      ]),
      q('confidence', 'How confident are you that you can reach it?', [
        { label: 'Not at all', value: 0 },
        { label: 'A little', value: 1 },
        { label: 'Somewhat', value: 2 },
        { label: 'Very', value: 3 },
        { label: 'Completely', value: 4 },
      ]),
    ],
  },
  gad7: {
    id: 'gad7',
    name: 'Anxiety check (GAD-7)',
    shortName: 'GAD-7',
    description: 'Over the last 2 weeks, how often have you been bothered by the following?',
    profileId: 268,
    applicability: 'always',
    day1: true,
    recurring: true,
    xp: 15,
    estMinutes: 2,
    scored: true,
    questions: [
      q('g1', 'Feeling nervous, anxious, or on edge'),
      q('g2', 'Not being able to stop or control worrying'),
      q('g3', 'Worrying too much about different things'),
      q('g4', 'Trouble relaxing'),
      q('g5', 'Being so restless that it is hard to sit still'),
      q('g6', 'Becoming easily annoyed or irritable'),
      q('g7', 'Feeling afraid, as if something awful might happen'),
    ],
    bands: [
      { max: 4, label: 'Minimal anxiety', tone: 'good' },
      { max: 9, label: 'Mild anxiety', tone: 'mild' },
      { max: 14, label: 'Moderate anxiety', tone: 'warn' },
      { max: 21, label: 'Severe anxiety', tone: 'alert' },
    ],
    elevatedNote:
      'Your answers suggest anxiety is weighing on you right now. Consider talking with a coach or clinician — and the breathing and grounding tools in the app can help in the moment.',
  },
  phq9: {
    id: 'phq9',
    name: 'Mood check (PHQ-9)',
    shortName: 'PHQ-9',
    description: 'Over the last 2 weeks, how often have you been bothered by the following?',
    profileId: 269,
    applicability: 'always',
    day1: true,
    recurring: true,
    xp: 15,
    estMinutes: 2,
    scored: true,
    questions: [
      q('p1', 'Little interest or pleasure in doing things'),
      q('p2', 'Feeling down, depressed, or hopeless'),
      q('p3', 'Trouble falling or staying asleep, or sleeping too much'),
      q('p4', 'Feeling tired or having little energy'),
      q('p5', 'Poor appetite or overeating'),
      q('p6', 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down'),
      q('p7', 'Trouble concentrating on things, such as reading or watching television'),
      q('p8', 'Moving or speaking so slowly that others could notice — or being so fidgety/restless that you move around a lot more than usual'),
      q('p9', 'Thoughts that you would be better off dead, or of hurting yourself in some way'),
    ],
    bands: [
      { max: 4, label: 'Minimal', tone: 'good' },
      { max: 9, label: 'Mild', tone: 'mild' },
      { max: 14, label: 'Moderate', tone: 'warn' },
      { max: 19, label: 'Moderately severe', tone: 'alert' },
      { max: 27, label: 'Severe', tone: 'alert' },
    ],
    elevatedNote:
      'If you’re having thoughts of harming yourself, you’re not alone and help is available right now. In the US you can call or text 988 (Suicide & Crisis Lifeline), any time. Please also reach out to your coach or a clinician.',
  },
  audit_c: {
    id: 'audit_c',
    name: 'Alcohol check (AUDIT-C)',
    shortName: 'AUDIT-C',
    description: 'Three quick questions about your alcohol use.',
    profileId: 49,
    applicability: 'substance',
    day1: true,
    recurring: true,
    xp: 15,
    estMinutes: 1,
    scored: true,
    questions: [
      q('a1', 'How often do you have a drink containing alcohol?', [
        { label: 'Never', value: 0 },
        { label: 'Monthly or less', value: 1 },
        { label: '2–4 times a month', value: 2 },
        { label: '2–3 times a week', value: 3 },
        { label: '4+ times a week', value: 4 },
      ]),
      q('a2', 'How many standard drinks do you have on a typical drinking day?', [
        { label: '1 or 2', value: 0 },
        { label: '3 or 4', value: 1 },
        { label: '5 or 6', value: 2 },
        { label: '7 to 9', value: 3 },
        { label: '10 or more', value: 4 },
      ]),
      q('a3', 'How often do you have 6 or more drinks on one occasion?', [
        { label: 'Never', value: 0 },
        { label: 'Less than monthly', value: 1 },
        { label: 'Monthly', value: 2 },
        { label: 'Weekly', value: 3 },
        { label: 'Daily or almost daily', value: 4 },
      ]),
    ],
    bands: [
      { max: 3, label: 'Lower risk', tone: 'good' },
      { max: 6, label: 'Increasing risk', tone: 'mild' },
      { max: 9, label: 'Higher risk', tone: 'warn' },
      { max: 12, label: 'Possible dependence', tone: 'alert' },
    ],
    elevatedNote:
      'Your answers suggest your drinking may be putting your health at risk. This is exactly what SPARx is here to help with — a coach can help you build a plan that fits your life.',
  },
  pcl5: {
    id: 'pcl5',
    name: 'Trauma check (PCL-5)',
    shortName: 'PCL-5',
    description:
      'In the past month, how much were you bothered by the following, in response to a stressful experience?',
    profileId: null, // no prod instrument yet — reconciles to a new profile at cutover
    applicability: 'always',
    day1: false, // NOT part of the day-1 gate — a monthly tracking instrument
    recurring: true,
    xp: 20,
    estMinutes: 4,
    scored: true,
    questions: [
      q('c1', 'Repeated, disturbing, and unwanted memories of the stressful experience', FREQ5),
      q('c2', 'Repeated, disturbing dreams of the stressful experience', FREQ5),
      q('c3', 'Suddenly feeling or acting as if the stressful experience were happening again', FREQ5),
      q('c4', 'Feeling very upset when something reminded you of the stressful experience', FREQ5),
      q('c5', 'Strong physical reactions when reminded (heart pounding, trouble breathing, sweating)', FREQ5),
      q('c6', 'Avoiding memories, thoughts, or feelings related to the experience', FREQ5),
      q('c7', 'Avoiding external reminders (people, places, conversations, activities, objects)', FREQ5),
      q('c8', 'Trouble remembering important parts of the stressful experience', FREQ5),
      q('c9', 'Strong negative beliefs about yourself, other people, or the world', FREQ5),
      q('c10', 'Blaming yourself or someone else for the experience or what happened after', FREQ5),
      q('c11', 'Strong negative feelings such as fear, horror, anger, guilt, or shame', FREQ5),
      q('c12', 'Loss of interest in activities you used to enjoy', FREQ5),
      q('c13', 'Feeling distant or cut off from other people', FREQ5),
      q('c14', 'Trouble experiencing positive feelings', FREQ5),
      q('c15', 'Irritable behavior, angry outbursts, or acting aggressively', FREQ5),
      q('c16', 'Taking too many risks or doing things that could cause you harm', FREQ5),
      q('c17', 'Being “superalert,” watchful, or on guard', FREQ5),
      q('c18', 'Feeling jumpy or easily startled', FREQ5),
      q('c19', 'Having difficulty concentrating', FREQ5),
      q('c20', 'Trouble falling or staying asleep', FREQ5),
    ],
    bands: [
      { max: 20, label: 'Minimal symptoms', tone: 'good' },
      { max: 31, label: 'Some symptoms', tone: 'mild' },
      { max: 45, label: 'Probable PTSD', tone: 'warn' },
      { max: 80, label: 'Severe symptoms', tone: 'alert' },
    ],
    elevatedNote:
      'Your answers point to trauma-related distress. Trauma is treatable, and you don’t have to carry it alone — a coach or clinician can help you find the right support. If you’re in crisis, call or text 988 (US) any time.',
  },
};

/** Battery order (intake first to warm up, screening after). */
export const BATTERY_ORDER: AssessmentId[] = ['intake', 'gad7', 'phq9', 'audit_c', 'pcl5'];

/** The DAY-1 battery — the instruments that gate content until completed. Honors
 *  the substance-only ones; excludes non-day1 (monthly-only) instruments. */
export function applicableBattery(hasSubstanceConcern: boolean): Instrument[] {
  return BATTERY_ORDER.map((id) => INSTRUMENTS[id]).filter(
    (i) => i.day1 && (i.applicability === 'always' || hasSubstanceConcern),
  );
}

/** Recurring instruments applicable to a user (for monthly re-administration). */
export function recurringInstruments(hasSubstanceConcern: boolean): Instrument[] {
  return BATTERY_ORDER.map((id) => INSTRUMENTS[id]).filter(
    (i) => i.recurring && (i.applicability === 'always' || hasSubstanceConcern),
  );
}

/** Which recurring instruments are due for a monthly retake: never taken, or the
 *  last take was ≥ MONTHLY_DAYS ago. `lastTakenAt` maps instrument id → ISO. */
export function monthlyDue(
  instruments: Instrument[],
  lastTakenAt: Record<string, string | undefined>,
  now: Date,
): Instrument[] {
  const cutoff = now.getTime() - MONTHLY_DAYS * 86400000;
  return instruments.filter((i) => {
    const last = lastTakenAt[i.id];
    if (!last) return true;
    const t = new Date(last).getTime();
    return isNaN(t) || t <= cutoff;
  });
}

/** Sum the answered values (only meaningful for scored instruments). */
export function scoreOf(instrument: Instrument, answers: Record<string, number>): number {
  return instrument.questions.reduce((sum, qq) => sum + (answers[qq.key] ?? 0), 0);
}

/** The severity band for a score (null for unscored instruments). */
export function bandFor(instrument: Instrument, score: number): SeverityBand | null {
  if (!instrument.bands) return null;
  return instrument.bands.find((b) => score <= b.max) ?? instrument.bands[instrument.bands.length - 1];
}

/** Whether a PHQ-9 response flags self-harm (item 9 > 0) — surfaces the crisis
 *  note regardless of total score. */
export function phq9SelfHarmFlag(answers: Record<string, number>): boolean {
  return (answers.p9 ?? 0) > 0;
}

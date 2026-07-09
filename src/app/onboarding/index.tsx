import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import type { OnboardingGender, ProblemOption } from '@/api/types';
import { Confetti } from '@/components/confetti';
import { Screen } from '@/components/layout/screen';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useAuth, useFirstName } from '@/lib/auth';
import { useOnboarding } from '@/lib/onboarding';
import { useStore } from '@/lib/store';

/** Welcome bonus for finishing onboarding (runs through the streak multiplier —
 *  a brand-new user has no streak, so it lands as a flat +25). */
const ONBOARD_XP = 25;

const STEPS = ['welcome', 'name', 'dob', 'gender', 'primary', 'secondary', 'details'] as const;
type Step = (typeof STEPS)[number];

const GENDERS: { key: OnboardingGender; label: string }[] = [
  { key: 'male', label: 'Man' },
  { key: 'female', label: 'Woman' },
  { key: 'nonbinary', label: 'Non-binary' },
  { key: 'self', label: 'Prefer to self-describe' },
  { key: 'undisclosed', label: 'Prefer not to say' },
];

const ORIENTATIONS = [
  'Straight',
  'Gay or lesbian',
  'Bisexual',
  'Queer',
  'Asexual',
  'Prefer not to say',
];

const RACES = [
  'American Indian or Alaska Native',
  'Asian',
  'Black or African American',
  'Hispanic or Latino',
  'Middle Eastern or North African',
  'Native Hawaiian or Pacific Islander',
  'White',
  'Multiracial',
  'Prefer not to say',
];

const CATEGORY_LABEL: Record<string, string> = {
  substance: 'Substances',
  behavioral: 'Behaviors & patterns',
  mental_health: 'Mental health',
};
const CATEGORY_ORDER = ['substance', 'behavioral', 'mental_health'];

// --- date helpers ------------------------------------------------------------
function dobToDate(month: string, day: string, year: string): Date | null {
  const mo = Number(month);
  const d = Number(day);
  const y = Number(year);
  if (!mo || !d || !y || year.length !== 4) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  // Reject impossible dates (JS rolls Feb 30 → Mar 2, etc.).
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}
function ageFrom(dt: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dt.getFullYear();
  const m = now.getMonth() - dt.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) age -= 1;
  return age;
}
const toIso = (dt: Date) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

/** Friendly name of the community a new user is matched into, mirroring the
 *  gender/age gate the DB applies (mobile_group_audience_ok). */
function matchLabel(gender: OnboardingGender | null, age: number | null): string {
  const adult = age == null ? true : age >= 18;
  if (!adult) return 'the Teen community';
  if (gender === 'male') return "the Men's community";
  if (gender === 'female') return "the Women's community";
  return 'the Open community';
}

export default function OnboardingScreen() {
  const firstName = useFirstName();
  const { user: authUser, updateName } = useAuth();
  const { markComplete } = useOnboarding();
  const { awardXp } = useStore();

  const problems = useAsync(() => api.onboarding.problems(), []).data ?? [];

  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = STEPS[stepIndex];

  // answers
  const [accepted, setAccepted] = useState(false);
  // Prefill the name from any existing auth metadata (e.g. Google sign-in).
  const [nameFirst, setNameFirst] = useState(() => (authUser?.name?.trim().split(/\s+/)[0] ?? ''));
  const [nameLast, setNameLast] = useState(() => {
    const parts = authUser?.name?.trim().split(/\s+/) ?? [];
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  });
  const fullName = [nameFirst.trim(), nameLast.trim()].filter(Boolean).join(' ');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  // Auto-advance MM → DD → YYYY as each fills (and backspace jumps back).
  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const [primary, setPrimary] = useState<string | null>(null);
  const [gender, setGender] = useState<OnboardingGender | null>(null);
  const [genderSelf, setGenderSelf] = useState('');
  const [orientation, setOrientation] = useState<string | null>(null);
  const [race, setRace] = useState<string | null>(null);
  const [secondary, setSecondary] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [reward, setReward] = useState(0);

  const dob = dobToDate(month, day, year);
  const age = dob ? ageFrom(dob) : null;
  const dobValid = !!dob && age != null && age >= 13 && age <= 100;

  const groupedProblems = useMemo(() => {
    const by: Record<string, ProblemOption[]> = {};
    for (const p of problems) (by[p.category] ??= []).push(p);
    return CATEGORY_ORDER.filter((c) => by[c]?.length).map((c) => ({ category: c, items: by[c] }));
  }, [problems]);

  const canAdvance =
    step === 'welcome'
      ? accepted
      : step === 'name'
      ? nameFirst.trim().length > 0
      : step === 'dob'
        ? dobValid
        : step === 'primary'
          ? primary != null
          : step === 'gender'
            ? gender != null && (gender !== 'self' || genderSelf.trim().length > 0)
            : true; // details + secondary are optional

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    const nowIso = new Date().toISOString();
    // Persist the name to the user's auth identity so it's their display name +
    // avatar initials everywhere (best-effort; the gate still fails open).
    if (fullName) await updateName(fullName).catch(() => {});
    try {
      await api.onboarding.save(
        {
          birthDate: dob ? toIso(dob) : null,
          gender,
          genderSelf: gender === 'self' ? genderSelf.trim() : null,
          orientation,
          race,
          primaryProblem: primary,
          secondaryProblems: secondary,
          acceptedTermsAt: nowIso,
          completedAt: nowIso,
        },
        authUser?.appUserId ?? null,
      );
    } catch {
      // Best-effort — even if the save fails we don't trap the user; the gate
      // fails open, and they can re-enter details later from settings.
    }
    setReward(awardXp(ONBOARD_XP));
    setBusy(false);
    setDone(true);
  };

  const next = () => {
    if (stepIndex === STEPS.length - 1) finish();
    else setStepIndex((s) => s + 1);
  };

  if (done) {
    return (
      <Finish
        reward={reward}
        community={matchLabel(gender, age)}
        onIntroduce={() => {
          // Activation: flip the gate to done AND tell it to land the user in the
          // intro composer. The Shell performs the single redirect (no race), so
          // the "+50 introduce yourself" chain is never dropped.
          markComplete('/feed/new?intro=1');
        }}
        onEnter={() => {
          // Even when they skip the intro post, take them to their matched
          // community first (activation-first) rather than straight to the
          // dashboard — they can reach the dashboard from the tab bar.
          markComplete('/(tabs)/community');
        }}
      />
    );
  }

  return (
    <Screen variant="modal" style={styles.gutter}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          {stepIndex > 0 ? (
            <Pressable onPress={() => setStepIndex((s) => s - 1)} hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={Colors.textMain} />
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
          <View style={styles.stepPill}>
            <Txt variant="caption" color={Colors.orange}>
              Step {stepIndex + 1}/{STEPS.length}
            </Txt>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <ProgressBar
            progress={(stepIndex + 1) / STEPS.length}
            track={Colors.soft}
            fill={Colors.primary}
          />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {step === 'welcome' && (
              <View style={{ gap: Spacing.lg }}>
                <View style={styles.welcomeIcon}>
                  <Ionicons name="sparkles" size={30} color={Colors.white} />
                </View>
                <Txt variant="display">Welcome to SPARx, {firstName} 👋</Txt>
                <Txt variant="body" color={Colors.textSub}>
                  A few quick questions help us tailor your recovery journey — the right
                  community, the right content, and progress tracking that actually fits you. It
                  takes under a minute, and you can skip anything optional.
                </Txt>
                <View style={styles.valueList}>
                  <ValueRow icon="people" text="Match you to a community that fits" />
                  <ValueRow icon="compass" text="Personalize your content & check-ins" />
                  <ValueRow icon="trending-up" text="Track what improves over time" />
                </View>
                <Pressable
                  onPress={() => setAccepted((a) => !a)}
                  style={styles.termsRow}
                  hitSlop={8}>
                  <Ionicons
                    name={accepted ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={accepted ? Colors.primary : Colors.strokeStrong}
                  />
                  <Txt variant="bodySm" color={Colors.textSub} style={{ flex: 1 }}>
                    I agree to SPARx&apos;s Terms of Service and Privacy Policy.
                  </Txt>
                </Pressable>
              </View>
            )}

            {step === 'name' && (
              <View style={{ gap: Spacing.lg }}>
                <StepTitle
                  title="What should we call you?"
                  subtitle="Your name (and initials) show on your posts and profile in the community. First name is enough — a last name is optional."
                />
                <View style={{ gap: Spacing.md }}>
                  <View style={{ gap: Spacing.xs }}>
                    <Txt variant="bodySmMedium">First name</Txt>
                    <TextInput
                      value={nameFirst}
                      onChangeText={setNameFirst}
                      placeholder="Alex"
                      placeholderTextColor={Colors.textSub}
                      style={styles.input}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>
                  <View style={{ gap: Spacing.xs }}>
                    <Txt variant="bodySmMedium">Last name (optional)</Txt>
                    <TextInput
                      value={nameLast}
                      onChangeText={setNameLast}
                      placeholder="Rivera"
                      placeholderTextColor={Colors.textSub}
                      style={styles.input}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>
            )}

            {step === 'dob' && (
              <View style={{ gap: Spacing.lg }}>
                <StepTitle
                  title="When were you born?"
                  subtitle="Your age helps us place you in the right groups. We never show it to others."
                />
                <View style={styles.dobRow}>
                  <DobField
                    ref={monthRef}
                    label="Month"
                    value={month}
                    onChange={setMonth}
                    max={2}
                    placeholder="MM"
                    nextRef={dayRef}
                  />
                  <DobField
                    ref={dayRef}
                    label="Day"
                    value={day}
                    onChange={setDay}
                    max={2}
                    placeholder="DD"
                    nextRef={yearRef}
                    prevRef={monthRef}
                  />
                  <DobField
                    ref={yearRef}
                    label="Year"
                    value={year}
                    onChange={setYear}
                    max={4}
                    placeholder="YYYY"
                    prevRef={dayRef}
                    wide
                  />
                </View>
                {age != null && dobValid && (
                  <Txt variant="bodySm" color={Colors.textSub}>
                    You&apos;re {age} — {age >= 18 ? "you'll get adult groups." : "you'll get teen groups."}
                  </Txt>
                )}
                {month && day && year && !dobValid && (
                  <Txt variant="bodySm" color={Colors.danger}>
                    Please enter a valid date of birth.
                  </Txt>
                )}
              </View>
            )}

            {step === 'primary' && (
              <View style={{ gap: Spacing.lg }}>
                <StepTitle
                  title="What are you working on most?"
                  subtitle="Pick the one that feels most central right now. You can add others next."
                />
                {groupedProblems.map((g) => (
                  <View key={g.category} style={{ gap: Spacing.sm }}>
                    <Txt variant="bodySmBold" color={Colors.textSub}>
                      {CATEGORY_LABEL[g.category] ?? g.category}
                    </Txt>
                    <View style={styles.chips}>
                      {g.items.map((p) => {
                        const on = primary === p.id;
                        return (
                          <Pressable
                            key={p.id}
                            onPress={() => setPrimary(p.id)}
                            style={[styles.chip, on && styles.chipActive]}>
                            <Txt variant="bodySm" color={on ? Colors.white : Colors.textMain}>
                              {p.title}
                            </Txt>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
                {!problems.length && (
                  <Txt variant="bodySm" color={Colors.textSub}>
                    Loading options…
                  </Txt>
                )}
              </View>
            )}

            {step === 'gender' && (
              <View style={{ gap: Spacing.lg }}>
                <StepTitle
                  title="How do you identify?"
                  subtitle="This helps us match you to gender-based communities where they apply."
                />
                <View style={{ gap: Spacing.md }}>
                  {GENDERS.map((gopt) => {
                    const on = gender === gopt.key;
                    return (
                      <Pressable
                        key={gopt.key}
                        onPress={() => setGender(gopt.key)}
                        style={[styles.optionRow, on && styles.optionRowActive]}>
                        <Ionicons
                          name={on ? 'radio-button-on' : 'radio-button-off'}
                          size={22}
                          color={on ? Colors.primary : Colors.strokeStrong}
                        />
                        <Txt variant="bodyMedium" color={on ? Colors.primary : Colors.textMain}>
                          {gopt.label}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
                {gender === 'self' && (
                  <TextInput
                    value={genderSelf}
                    onChangeText={setGenderSelf}
                    placeholder="Describe your gender identity"
                    placeholderTextColor={Colors.textSub}
                    style={styles.input}
                  />
                )}
              </View>
            )}

            {step === 'details' && (
              <View style={{ gap: Spacing.xl }}>
                <StepTitle
                  title="A little more about you"
                  subtitle="All optional — it sharpens your recommendations. Skip anything you'd rather not share."
                />
                <OptionalPicker
                  label="Sexual orientation"
                  options={ORIENTATIONS}
                  value={orientation}
                  onChange={setOrientation}
                />
                <OptionalPicker
                  label="Race / ethnicity"
                  options={RACES}
                  value={race}
                  onChange={setRace}
                />
              </View>
            )}

            {step === 'secondary' && (
              <View style={{ gap: Spacing.lg }}>
                <StepTitle
                  title="Anything else you want to work on?"
                  subtitle="Add as many as you like — or none. This tunes what we surface for you."
                />
                {groupedProblems.map((g) => {
                  const items = g.items.filter((p) => p.id !== primary);
                  if (!items.length) return null;
                  return (
                    <View key={g.category} style={{ gap: Spacing.sm }}>
                      <Txt variant="bodySmBold" color={Colors.textSub}>
                        {CATEGORY_LABEL[g.category] ?? g.category}
                      </Txt>
                      <View style={styles.chips}>
                        {items.map((p) => {
                          const on = secondary.includes(p.id);
                          return (
                            <Pressable
                              key={p.id}
                              onPress={() =>
                                setSecondary((cur) =>
                                  cur.includes(p.id)
                                    ? cur.filter((x) => x !== p.id)
                                    : [...cur, p.id],
                                )
                              }
                              style={[styles.chip, on && styles.chipActive]}>
                              <Txt variant="bodySm" color={on ? Colors.white : Colors.textMain}>
                                {p.title}
                              </Txt>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={
                stepIndex === STEPS.length - 1
                  ? 'Finish'
                  : step === 'details' && !orientation && !race
                    ? 'Skip'
                    : 'Continue'
              }
              variant="primary"
              loading={busy}
              disabled={!canAdvance}
              onPress={next}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}

function ValueRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.valueRow}>
      <View style={styles.valueIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Txt variant="bodyMedium">{text}</Txt>
    </View>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="titleLg">{title}</Txt>
      <Txt variant="bodySm" color={Colors.textSub}>
        {subtitle}
      </Txt>
    </View>
  );
}

const DobField = forwardRef<
  TextInput,
  {
    label: string;
    value: string;
    onChange: (v: string) => void;
    max: number;
    placeholder: string;
    wide?: boolean;
    /** Focus this field once the current one fills (MM→DD→YYYY). */
    nextRef?: React.RefObject<TextInput | null>;
    /** Focus this field when backspacing out of an empty current field. */
    prevRef?: React.RefObject<TextInput | null>;
  }
>(function DobField({ label, value, onChange, max, placeholder, wide, nextRef, prevRef }, ref) {
  return (
    <View style={[styles.dobField, wide && { flex: 1.4 }]}>
      <Txt variant="caption" color={Colors.textSub}>
        {label}
      </Txt>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => {
          const cleaned = t.replace(/[^0-9]/g, '').slice(0, max);
          onChange(cleaned);
          // Advance only while growing to `max`, so editing a full field
          // doesn't keep bouncing focus forward.
          if (cleaned.length === max && cleaned.length > value.length) nextRef?.current?.focus();
        }}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === 'Backspace' && value.length === 0) prevRef?.current?.focus();
        }}
        placeholder={placeholder}
        placeholderTextColor={Colors.strokeStrong}
        keyboardType="number-pad"
        returnKeyType={nextRef ? 'next' : 'done'}
        onSubmitEditing={() => nextRef?.current?.focus()}
        style={styles.dobInput}
      />
    </View>
  );
});

function OptionalPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <View style={{ gap: Spacing.sm }}>
      <Txt variant="bodySmBold" color={Colors.textSub}>
        {label}
      </Txt>
      <View style={styles.chips}>
        {options.map((o) => {
          const on = value === o;
          return (
            <Pressable
              key={o}
              onPress={() => onChange(on ? null : o)}
              style={[styles.chip, on && styles.chipActive]}>
              <Txt variant="bodySm" color={on ? Colors.white : Colors.textMain}>
                {o}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Finish({
  reward,
  community,
  onIntroduce,
  onEnter,
}: {
  reward: number;
  community: string;
  onIntroduce: () => void;
  onEnter: () => void;
}) {
  const firstName = useFirstName();
  return (
    <View style={styles.ackRoot}>
      <Confetti />
      <SafeAreaView style={styles.ackSafe} edges={['top', 'bottom']}>
        <View style={styles.ackCenter}>
          <View style={styles.star}>
            <Ionicons name="checkmark" size={56} color={Colors.primaryDarker} />
          </View>
          <Txt variant="display" color={Colors.white} center style={{ marginTop: Spacing.xl }}>
            You&apos;re all set, {firstName}!
          </Txt>
          <Txt
            variant="body"
            color={Colors.textMutedOnDark}
            center
            style={{ marginTop: Spacing.sm }}>
            We&apos;ve matched you to {community}. Your journey starts now.
          </Txt>

          {reward > 0 && (
            <View style={styles.reward}>
              <Txt variant="display" color={Colors.orange}>
                +{reward}
              </Txt>
              <Txt variant="caption" color={Colors.textMutedOnDark}>
                welcome points
              </Txt>
            </View>
          )}

          {/* Activation nudge: introducing yourself is the single strongest
              predictor of sticking around, so we reward it big and make it the
              primary action. */}
          <View style={styles.introCard}>
            <Ionicons name="hand-left" size={22} color={Colors.orange} />
            <Txt variant="bodySm" color={Colors.textOnDark} center>
              Say hi in {community} and earn an extra{' '}
              <Txt variant="bodySmBold" color={Colors.orange}>
                +50 XP
              </Txt>
              .
            </Txt>
          </View>

          <View style={styles.ackButtonWrap}>
            <Button
              title="Introduce yourself  ·  +50 XP"
              variant="primary"
              iconLeft="chatbubbles"
              onPress={onIntroduce}
            />
            <View style={{ height: Spacing.md }} />
            <Button title="Maybe later" variant="white" onPress={onEnter} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  gutter: { backgroundColor: Colors.screen },
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  stepPill: {
    backgroundColor: Colors.highlight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  progressWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  body: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxl },
  welcomeIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueList: { gap: Spacing.md },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  valueIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.screen,
  },
  dobRow: { flexDirection: 'row', gap: Spacing.md },
  dobField: { flex: 1, gap: 6 },
  dobInput: {
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textMain,
    fontSize: 18,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    backgroundColor: Colors.screen,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
  },
  optionRowActive: { borderColor: Colors.primary, backgroundColor: 'rgba(22,104,144,0.06)' },
  input: {
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    color: Colors.textMain,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  footer: { padding: Spacing.lg },
  // finish / celebration
  ackRoot: { flex: 1, backgroundColor: Colors.primaryDarker },
  ackSafe: { flex: 1, paddingHorizontal: Spacing.lg },
  ackCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  star: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.star,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reward: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
  },
  introCard: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(255,157,75,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,157,75,0.35)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  ackButtonWrap: { marginTop: Spacing.xxl, width: '100%', maxWidth: 300, alignSelf: 'center' },
});

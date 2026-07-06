import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/confetti';
import { ProgressBar } from '@/components/ui/progress-bar';
import { RankMovement } from '@/components/ui/rank-movement';
import { Screen } from '@/components/layout/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { useXpAward, type XpMovement } from '@/lib/xp-award';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useAssessmentGate } from '@/lib/assessment-gate';
import {
  INSTRUMENTS,
  type AssessmentId,
  type SeverityBand,
  bandFor,
  phq9SelfHarmFlag,
  scoreOf,
} from '@/lib/assessments';
import { useStore } from '@/lib/store';

const TONE_COLOR: Record<SeverityBand['tone'], string> = {
  good: Colors.success,
  mild: Colors.primary,
  warn: Colors.orange,
  alert: Colors.danger,
};

type Result = {
  score: number | null;
  band: SeverityBand | null;
  earned: number;
  completesBattery: boolean;
  crisis: boolean;
  movement: XpMovement | null;
};

export default function AssessmentRunner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { awardBonus } = useStore();
  const award = useXpAward();
  const gate = useAssessmentGate();

  const instrument = id && id in INSTRUMENTS ? INSTRUMENTS[id as AssessmentId] : null;

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  if (!instrument) {
    // Unknown instrument — bounce back to the hub.
    return (
      <Screen variant="modal" style={styles.gutter}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <ScreenHeader title="Back" onBack={() => router.replace('/assessments')} />
          <View style={styles.center}>
            <Txt variant="body" color={Colors.textSub}>
              That assessment isn&apos;t available.
            </Txt>
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  const answeredCount = instrument.questions.filter((q) => answers[q.key] != null).length;
  const complete = answeredCount === instrument.questions.length;

  const wasPending = gate.pending.some((p) => p.id === instrument.id);
  const isDue = wasPending || gate.monthlyDue.some((m) => m.id === instrument.id);
  const completesBattery = wasPending && gate.pending.length === 1;

  const submit = async () => {
    if (busy || !complete) return;
    setBusy(true);
    const score = instrument.scored ? scoreOf(instrument, answers) : null;
    const band = instrument.scored && score != null ? bandFor(instrument, score) : null;
    const crisis = instrument.id === 'phq9' && phq9SelfHarmFlag(answers);
    await api.assessments
      .save(
        {
          instrument: instrument.id,
          profileId: instrument.profileId,
          score,
          severity: band?.label ?? null,
          answers,
        },
        user?.appUserId ?? null,
      )
      .catch(() => {});
    // Award XP only on first completion (not on retakes), plus a one-time bonus
    // for finishing the whole battery.
    let earned = 0;
    if (isDue) earned += awardBonus(instrument.xp);
    if (completesBattery) earned += awardBonus(50);
    const movement = earned > 0 ? await award({ source: 'assessment', refId: instrument.id, points: earned }) : null;
    gate.refresh();
    setBusy(false);
    setResult({ score, band, earned, completesBattery, crisis, movement });
  };

  if (result) {
    return (
      <ResultView
        instrument={instrument}
        result={result}
        onContinue={() => {
          if (result.completesBattery) router.replace('/');
          else router.replace('/assessments');
        }}
      />
    );
  }

  return (
    <Screen variant="modal" style={styles.gutter}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Assessments" onBack={() => router.replace('/assessments')} />
        <View style={styles.titleWrap}>
          <Txt variant="titleLg">{instrument.name}</Txt>
          <Txt variant="bodySm" color={Colors.textSub}>
            {instrument.description}
          </Txt>
          <View style={{ marginTop: Spacing.sm }}>
            <ProgressBar
              progress={answeredCount / instrument.questions.length}
              track={Colors.soft}
              fill={Colors.primary}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {instrument.questions.map((q, qi) => (
            <View key={q.key} style={styles.qCard}>
              <Txt variant="bodyMedium">
                {qi + 1}. {q.prompt}
              </Txt>
              <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
                {q.options.map((o) => {
                  const on = answers[q.key] === o.value;
                  return (
                    <Pressable
                      key={o.label}
                      onPress={() => setAnswers((a) => ({ ...a, [q.key]: o.value }))}
                      style={[styles.optionRow, on && styles.optionRowActive]}>
                      <Ionicons
                        name={on ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={on ? Colors.primary : Colors.strokeStrong}
                      />
                      <Txt variant="bodySm" color={on ? Colors.primary : Colors.textMain}>
                        {o.label}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={complete ? 'Submit' : `${answeredCount}/${instrument.questions.length} answered`}
            variant="primary"
            loading={busy}
            disabled={!complete}
            onPress={submit}
          />
        </View>
      </SafeAreaView>
    </Screen>
  );
}

function ResultView({
  instrument,
  result,
  onContinue,
}: {
  instrument: (typeof INSTRUMENTS)[AssessmentId];
  result: Result;
  onContinue: () => void;
}) {
  const tone = result.band?.tone ?? 'good';
  const color = TONE_COLOR[tone];
  const showNote = result.crisis || tone === 'warn' || tone === 'alert';
  return (
    <View style={styles.resultRoot}>
      {result.completesBattery && <Confetti />}
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.resultBody} showsVerticalScrollIndicator={false}>
          <View style={[styles.resultBadge, { backgroundColor: `${color}22`, borderColor: color }]}>
            <Ionicons
              name={tone === 'good' ? 'checkmark-circle' : 'information-circle'}
              size={40}
              color={color}
            />
          </View>

          <Txt variant="titleLg" center>
            {instrument.scored ? instrument.shortName + ' complete' : 'Thanks for sharing'}
          </Txt>

          {instrument.scored && result.band ? (
            <>
              <Txt variant="display" color={color} center>
                {result.score}
              </Txt>
              <Txt variant="titleSm" color={color} center>
                {result.band.label}
              </Txt>
            </>
          ) : (
            <Txt variant="body" color={Colors.textSub} center>
              Your answers help us tailor your plan. There&apos;s no score here — just a clearer
              picture of where you are.
            </Txt>
          )}

          {showNote && instrument.elevatedNote ? (
            <View style={[styles.noteCard, result.crisis && styles.noteCrisis]}>
              <Txt variant="bodySm" color={Colors.textMain}>
                {instrument.elevatedNote}
              </Txt>
            </View>
          ) : null}

          {result.earned > 0 ? (
            <View style={styles.xpPill}>
              <Ionicons name="sparkles" size={16} color={Colors.orange} />
              <Txt variant="bodySmBold" color={Colors.orange}>
                +{result.earned} XP
              </Txt>
            </View>
          ) : null}

          {result.earned > 0 ? <RankMovement movement={result.movement} tone="light" /> : null}

          {result.completesBattery ? (
            <Txt variant="bodySm" color={Colors.textSub} center>
              That&apos;s the whole set — nicely done. Everything&apos;s unlocked, and we&apos;ll
              check back monthly to track your progress.
            </Txt>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title={result.completesBattery ? 'Enter SPARx' : 'Continue'}
            variant="primary"
            onPress={onContinue}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  gutter: { backgroundColor: Colors.screen },
  safe: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: 4 },
  body: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  qCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: Spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  optionRowActive: { borderColor: Colors.primary, backgroundColor: 'rgba(22,104,144,0.06)' },
  footer: { padding: Spacing.lg },
  // result
  resultRoot: { flex: 1, backgroundColor: Colors.white },
  resultBody: { padding: Spacing.xl, gap: Spacing.md, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  resultBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCard: {
    backgroundColor: Colors.highlight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.highlightBorder,
    padding: Spacing.lg,
    alignSelf: 'stretch',
  },
  noteCrisis: { backgroundColor: 'rgba(223,28,65,0.06)', borderColor: 'rgba(223,28,65,0.35)' },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.highlight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});

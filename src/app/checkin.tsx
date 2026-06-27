import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/confetti';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { negativeEmotions, positiveEmotions, user } from '@/data/content';
import { recordCheckin, type CheckinResult } from '@/lib/checkin';

const TOTAL = 5;

export default function CheckinScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<CheckinResult | null>(null);

  // answers
  const [mood, setMood] = useState(50);
  const [positive, setPositive] = useState<string[]>([]);
  const [negative, setNegative] = useState<string[]>([]);
  const [behavior, setBehavior] = useState<'yes' | 'no' | null>(null);
  const [affirmation, setAffirmation] = useState('');

  const finish = async () => {
    const r = await recordCheckin();
    setResult(r);
  };

  const canAdvance =
    step === 0 ? true :
    step === 1 ? positive.length > 0 :
    step === 2 ? negative.length > 0 :
    step === 3 ? behavior !== null :
    affirmation.trim().length > 0;

  if (result) {
    return <Acknowledgement result={result} onDone={() => router.dismissTo('/')} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.dismissTo('/')} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.textMain} />
        </Pressable>
        <View style={styles.stepPill}>
          <Txt variant="caption" color={Colors.orange}>
            Step {step + 1}/{TOTAL}
          </Txt>
        </View>
      </View>

      <View style={styles.titleWrap}>
        <Txt variant="titleLg">Daily check-in</Txt>
        <Txt variant="bodySm" color={Colors.textSub}>
          Share how you&apos;re doing today — it only takes a minute and keeps your streak alive.
        </Txt>
        <View style={{ marginTop: Spacing.sm }}>
          <ProgressBar progress={(step + 1) / TOTAL} track={Colors.soft} fill={Colors.primary} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <>
              <Question text="How are you feeling today?" />
              <View style={styles.sliderWrap}>
                <View style={[styles.tooltip, { left: `${mood}%` }]}>
                  <Txt variant="bodySmBold">{Math.round(mood)}</Txt>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={mood}
                  onValueChange={setMood}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={Colors.soft}
                  thumbTintColor={Colors.primary}
                />
                <View style={styles.scaleRow}>
                  <Txt variant="caption" color={Colors.textSub}>0/Bad</Txt>
                  <Txt variant="caption" color={Colors.textSub}>100/Great</Txt>
                </View>
              </View>
            </>
          )}

          {step === 1 && (
            <EmotionPicker
              question="What positive emotion are you feeling?"
              none="I don't feel any particular positive emotion"
              options={positiveEmotions}
              selected={positive}
              onChange={setPositive}
            />
          )}

          {step === 2 && (
            <EmotionPicker
              question="What negative emotion are you feeling?"
              none="I don't feel any negative emotion"
              options={negativeEmotions}
              selected={negative}
              onChange={setNegative}
            />
          )}

          {step === 3 && (
            <>
              <Question
                text={`Over the past day, did you ${user.struggle.verb} or engage in your compulsive behavior?`}
              />
              <View style={{ gap: Spacing.md }}>
                {(['no', 'yes'] as const).map((v) => {
                  const active = behavior === v;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => setBehavior(v)}
                      style={[styles.yesno, active && styles.yesnoActive]}>
                      <Ionicons
                        name={v === 'no' ? 'checkmark-circle' : 'alert-circle'}
                        size={24}
                        color={active ? Colors.primary : Colors.strokeStrong}
                      />
                      <Txt variant="bodyMedium" color={active ? Colors.primary : Colors.textMain}>
                        {v === 'no' ? 'No, I stayed on track' : 'Yes, it happened'}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
              <Txt variant="caption" color={Colors.textSub} center>
                No judgement here — honesty is what helps you grow.
              </Txt>
            </>
          )}

          {step === 4 && (
            <>
              <Question text="Write a quick positive affirmation and check in." />
              <TextInput
                value={affirmation}
                onChangeText={setAffirmation}
                placeholder="I am doing my best, and that is enough."
                placeholderTextColor={Colors.textSub}
                style={styles.input}
                multiline
              />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 && (
            <View style={{ flex: 1 }}>
              <Button title="Back" variant="secondary" iconLeft="chevron-back" onPress={() => setStep((s) => s - 1)} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Button
              title={step === TOTAL - 1 ? 'Complete check-in' : 'Next'}
              variant="primary"
              disabled={!canAdvance}
              onPress={() => (step === TOTAL - 1 ? finish() : setStep((s) => s + 1))}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Question({ text }: { text: string }) {
  return (
    <View style={styles.questionWrap}>
      <View style={styles.helloPill}>
        <Txt variant="caption" color={Colors.white}>
          Hello {user.name}
        </Txt>
      </View>
      <View style={styles.questionCard}>
        <Txt variant="titleSm">{text}</Txt>
      </View>
    </View>
  );
}

function EmotionPicker({
  question,
  none,
  options,
  selected,
  onChange,
}: {
  question: string;
  none: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (e: string) => {
    if (e === none) {
      onChange(selected.includes(none) ? [] : [none]);
      return;
    }
    const withoutNone = selected.filter((s) => s !== none);
    onChange(
      withoutNone.includes(e) ? withoutNone.filter((s) => s !== e) : [...withoutNone, e],
    );
  };
  return (
    <>
      <Question text={question} />
      <View style={styles.chips}>
        {[none, ...options].map((e) => {
          const active = selected.includes(e);
          return (
            <Pressable
              key={e}
              onPress={() => toggle(e)}
              style={[styles.chip, active && styles.chipActive]}>
              <Txt variant="bodySm" color={active ? Colors.white : Colors.textMain}>
                {e}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function Acknowledgement({ result, onDone }: { result: CheckinResult; onDone: () => void }) {
  return (
    <View style={styles.ackRoot}>
      <Confetti />
      <SafeAreaView style={styles.ackSafe} edges={['top', 'bottom']}>
        <View style={styles.ackCenter}>
          <View style={styles.star}>
            <Ionicons name="star" size={56} color={Colors.primaryDarker} />
          </View>
          <Txt variant="display" color={Colors.white} center style={{ marginTop: Spacing.xl }}>
            Check-in complete!
          </Txt>
          <Txt variant="body" color={Colors.textMutedOnDark} center style={{ marginTop: Spacing.sm }}>
            You showed up for yourself today. That&apos;s what counts.
          </Txt>

          <View style={styles.rewards}>
            <View style={styles.reward}>
              <Txt variant="display" color={Colors.orange}>
                +{result.pointsEarned}
              </Txt>
              <Txt variant="caption" color={Colors.textMutedOnDark}>
                points
              </Txt>
            </View>
            <View style={styles.rewardDivider} />
            <View style={styles.reward}>
              <Txt variant="display" color={Colors.orange}>
                {result.streak}🔥
              </Txt>
              <Txt variant="caption" color={Colors.textMutedOnDark}>
                day streak
              </Txt>
            </View>
          </View>

          {result.streak < 7 ? (
            <Txt variant="bodySm" color={Colors.tealLight} center style={{ marginTop: Spacing.lg }}>
              Keep it going — a 7-day streak earns 10 points a day!
            </Txt>
          ) : (
            <Txt variant="bodySm" color={Colors.tealLight} center style={{ marginTop: Spacing.lg }}>
              You&apos;re maxing your streak bonus. Incredible consistency. 🌟
            </Txt>
          )}
        </View>
        <Button title="Continue" variant="white" onPress={onDone} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
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
  titleWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: 4 },
  body: { padding: Spacing.lg, gap: Spacing.xl },
  questionWrap: { gap: 0 },
  helloPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    marginBottom: -14,
    marginLeft: Spacing.md,
    zIndex: 1,
  },
  questionCard: {
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  sliderWrap: { gap: Spacing.sm, paddingTop: Spacing.xl },
  tooltip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginLeft: -16,
  },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
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
  yesno: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
  },
  yesnoActive: { borderColor: Colors.primary, backgroundColor: 'rgba(22,104,144,0.06)' },
  input: {
    minHeight: 120,
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    color: Colors.textMain,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  footer: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
  // acknowledgement
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
  rewards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
  },
  reward: { alignItems: 'center' },
  rewardDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
});

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
import { Image } from 'expo-image';

import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/confetti';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  negativeEmotions,
  positiveEmotions,
  recommendedVideos,
  user,
  type VideoItem,
} from '@/data/content';
import { recordCheckin, type CheckinResult } from '@/lib/checkin';
import { useStore } from '@/lib/store';

const TOTAL = 5;

export default function CheckinScreen() {
  const router = useRouter();
  const { addCheckin } = useStore();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // answers
  const [mood, setMood] = useState(50);
  const [positive, setPositive] = useState<string[]>([]);
  const [negative, setNegative] = useState<string[]>([]);
  const [behavior, setBehavior] = useState<'yes' | 'no' | null>(null);
  const [amount, setAmount] = useState<'less' | 'same' | 'more' | null>(null);
  const [count, setCount] = useState('');
  const [affirmation, setAffirmation] = useState('');

  const finish = async () => {
    addCheckin({
      date: new Date().toISOString().slice(0, 10),
      mood,
      positive,
      negative,
      behavior,
      amount,
      count,
      affirmation,
    });
    const r = await recordCheckin();
    setResult(r);
  };

  const behaviorAnswered =
    behavior === 'no' || (behavior === 'yes' && amount !== null && count.trim().length > 0);

  const canAdvance =
    step === 0 ? true :
    step === 1 ? positive.length > 0 :
    step === 2 ? negative.length > 0 :
    step === 3 ? behaviorAnswered :
    affirmation.trim().length > 0;

  if (result && showSummary) {
    return (
      <CheckinSummary
        mood={mood}
        positive={positive}
        negative={negative}
        behavior={behavior}
        onDone={() => router.dismissTo('/')}
      />
    );
  }

  if (result) {
    return <Acknowledgement result={result} onDone={() => setShowSummary(true)} />;
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
                      onPress={() => {
                        setBehavior(v);
                        if (v === 'no') {
                          setAmount(null);
                          setCount('');
                        }
                      }}
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

              {/* Fold-out follow-ups when it happened */}
              {behavior === 'yes' && (
                <View style={styles.followUp}>
                  <View style={{ gap: Spacing.md }}>
                    <Txt variant="bodyMedium">Compared to usual, was it…</Txt>
                    <View style={{ gap: Spacing.sm }}>
                      {(['less', 'same', 'more'] as const).map((a) => {
                        const on = amount === a;
                        return (
                          <Pressable
                            key={a}
                            onPress={() => setAmount(a)}
                            style={[styles.amountRow, on && styles.yesnoActive]}>
                            <Ionicons
                              name={on ? 'radio-button-on' : 'radio-button-off'}
                              size={20}
                              color={on ? Colors.primary : Colors.strokeStrong}
                            />
                            <Txt variant="bodyMedium" color={on ? Colors.primary : Colors.textMain}>
                              {a === 'less' ? 'Less than usual' : a === 'same' ? 'Same as usual' : 'More than usual'}
                            </Txt>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ gap: Spacing.sm }}>
                    <Txt variant="bodyMedium">How many times?</Txt>
                    <TextInput
                      value={count}
                      onChangeText={(t) => setCount(t.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 2"
                      placeholderTextColor={Colors.textSub}
                      keyboardType="number-pad"
                      style={styles.countInput}
                    />
                  </View>
                </View>
              )}

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

function joinNatural(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** Build an encouraging + directive summary from the check-in answers. */
function buildSummary(a: {
  mood: number;
  positive: string[];
  negative: string[];
  behavior: 'yes' | 'no' | null;
}) {
  const real = (list: string[]) => list.filter((e) => !e.toLowerCase().startsWith("i don't"));
  const pos = real(a.positive);
  const neg = real(a.negative);
  const moodGood = a.mood >= 60;
  const moodLow = a.mood <= 35;
  const focus = neg[0] ?? (moodLow ? 'Low Energy' : 'Stress');

  const posPhrase = pos.length
    ? `you're experiencing ${joinNatural(pos.map((p) => p.toLowerCase()))}`
    : "you're showing up for yourself";
  const negPhrase = neg.length
    ? `, even amidst some ${joinNatural(neg.map((n) => n.toLowerCase()))}`
    : '';
  const moodPhrase = moodGood
    ? 'your elevated check-in score indicating a generally good day compared to your usual pattern'
    : moodLow
      ? 'today reading a little heavier than your usual — worth being gentle with yourself about'
      : "your score holding steady around your usual baseline";
  const behaviorPhrase =
    a.behavior === 'no'
      ? ' Staying on track today is a real win — notice what helped.'
      : a.behavior === 'yes'
        ? " It happened today, and that's information, not failure — let's look at what was going on around it."
        : '';

  const headline = `It's uplifting to see that ${posPhrase}${negPhrase}. Your recent activity levels and reflections suggest you're managing well overall, with ${moodPhrase}.${behaviorPhrase}`;
  const question = `How might you use the Breathing Techniques or the Mindful Moments tools in Hero to help transform your ${
    pos[0]?.toLowerCase() ?? 'energy'
  } into a sense of calm and reduce ${focus.toLowerCase()} throughout your day?`;

  return { headline, focus, question };
}

function SummaryVideo({ video }: { video: VideoItem }) {
  return (
    <View style={styles.vCard}>
      <View style={styles.vThumbWrap}>
        <Image source={{ uri: video.image }} style={styles.vThumb} contentFit="cover" />
        <View style={styles.vPlay}>
          <Ionicons name="play" size={16} color={Colors.white} />
        </View>
        <View style={styles.vDuration}>
          <Txt variant="caption" color={Colors.white}>
            {video.duration}
          </Txt>
        </View>
      </View>
      <View style={styles.vMetaRow}>
        <View style={styles.stars}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Ionicons key={i} name={i < 3 ? 'star' : 'star-outline'} size={13} color={Colors.orange} />
          ))}
        </View>
        <Ionicons name="bookmark-outline" size={16} color={Colors.primary} />
      </View>
      <Txt variant="caption" color={Colors.textMain} numberOfLines={2}>
        {video.title}
      </Txt>
    </View>
  );
}

function CheckinSummary({
  mood,
  positive,
  negative,
  behavior,
  onDone,
}: {
  mood: number;
  positive: string[];
  negative: string[];
  behavior: 'yes' | 'no' | null;
  onDone: () => void;
}) {
  const { headline, focus, question } = buildSummary({ mood, positive, negative, behavior });
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onDone} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.textMain} />
        </Pressable>
        <View style={styles.stepPill}>
          <Txt variant="caption" color={Colors.orange}>
            Summary
          </Txt>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.summaryBody} showsVerticalScrollIndicator={false}>
        <Txt variant="titleLg">Nice work, {user.name} 🌱</Txt>
        <View style={styles.summaryCard}>
          <Txt variant="body" color={Colors.textMain}>
            {headline}
          </Txt>
        </View>

        <Txt variant="bodyMedium">
          Based on your inputs, we&apos;d recommend these videos to help you with your {focus}:
        </Txt>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.md, paddingVertical: Spacing.xs }}>
          {recommendedVideos.map((v) => (
            <SummaryVideo key={v.id} video={v} />
          ))}
        </ScrollView>

        <View style={styles.questionBlock}>
          <Txt variant="bodyMedium" color={Colors.textMain}>
            {question}
          </Txt>
        </View>
      </ScrollView>

      <View style={styles.summaryFooter}>
        <Button title="Done" variant="primary" onPress={onDone} />
      </View>
    </SafeAreaView>
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
  followUp: {
    gap: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.highlightBorder,
    paddingLeft: Spacing.lg,
    marginLeft: Spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  countInput: {
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textMain,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.stroke,
    width: 120,
  },
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
  // check-in summary
  summaryBody: { padding: Spacing.lg, gap: Spacing.lg },
  summaryCard: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.highlightBorder,
    borderStyle: 'dashed',
    paddingVertical: Spacing.lg,
  },
  questionBlock: {
    borderTopWidth: 1,
    borderColor: Colors.stroke,
    borderStyle: 'dashed',
    paddingTop: Spacing.lg,
    marginTop: Spacing.sm,
  },
  summaryFooter: { padding: Spacing.lg },
  vCard: { width: 180, gap: Spacing.sm },
  vThumbWrap: {
    width: 180,
    height: 110,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vThumb: { width: '100%', height: '100%' },
  vPlay: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vDuration: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stars: { flexDirection: 'row', gap: 1 },
});

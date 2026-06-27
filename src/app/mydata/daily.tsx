import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { dailyAssessment } from '@/data/content';

export default function DailyAssessment() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const q = dailyAssessment[step];
  const selected = answers[q?.id];
  const isLast = step === dailyAssessment.length - 1;

  if (done) {
    return (
      <View style={styles.successRoot}>
        <SafeAreaView style={styles.successSafe} edges={['top', 'bottom']}>
          <View style={styles.successCenter}>
            <View style={styles.star}>
              <Ionicons name="star" size={52} color={Colors.primaryDarker} />
            </View>
            <Txt variant="titleLg" color={Colors.white} center style={{ marginTop: Spacing.xl }}>
              Check-in complete!
            </Txt>
            <Txt variant="body" color={Colors.textMutedOnDark} center style={{ marginTop: Spacing.sm }}>
              You earned 20 points and kept your 6-day streak alive. 🔥
            </Txt>
          </View>
          <View style={{ gap: Spacing.md }}>
            <Button title="View my data" variant="secondary" onPress={() => router.back()} />
            <Button title="Go Home" variant="white" onPress={() => router.dismissTo('/')} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" />
      <View style={styles.progressWrap}>
        <ProgressBar
          progress={(step + 1) / dailyAssessment.length}
          track={Colors.soft}
          fill={Colors.primary}
        />
        <Txt variant="caption" color={Colors.textSub} style={{ marginTop: Spacing.sm }}>
          Question {step + 1} of {dailyAssessment.length}
        </Txt>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Txt variant="title">{q.prompt}</Txt>
        <View style={{ gap: Spacing.md }}>
          {q.options.map((opt) => {
            const active = selected === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                style={[styles.option, active && styles.optionActive]}>
                <Txt variant="bodyMedium" color={active ? Colors.primary : Colors.textMain}>
                  {opt}
                </Txt>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? Colors.primary : Colors.strokeStrong}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isLast ? 'Finish check-in' : 'Next'}
          variant="primary"
          disabled={!selected}
          onPress={() => (isLast ? setDone(true) : setStep((s) => s + 1))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  progressWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  body: { padding: Spacing.lg, gap: Spacing.xl },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  optionActive: { borderColor: Colors.primary, backgroundColor: 'rgba(22,104,144,0.06)' },
  footer: { padding: Spacing.lg },
  successRoot: { flex: 1, backgroundColor: Colors.primaryDarker },
  successSafe: { flex: 1, paddingHorizontal: Spacing.lg },
  successCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  star: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.star,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * ScoreView — the result screen for a scored worksheet (e.g. the expanded ACE
 * questionnaire). Deliberately calm: the celebration already happened; this is
 * the reflective moment. Gentle framing FIRST, then the number, then the
 * band's supportive note. Every completion is stored as a dated
 * mobile_assessment_responses row, so scores can be compared over time.
 */
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { ScoreBand, SheetScoring } from '@/lib/exercise-scores';

const TONE_COLOR: Record<ScoreBand['tone'], string> = {
  good: Colors.success,
  mild: Colors.primary,
  warn: Colors.orange,
  alert: Colors.danger,
};

export function ExerciseScoreView({
  scoring,
  band,
  score,
  max,
  onReview,
  onClose,
}: {
  scoring: SheetScoring;
  band: ScoreBand;
  score: number;
  max: number;
  onReview: () => void;
  onClose: () => void;
}) {
  const color = TONE_COLOR[band.tone];
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: color }]}>
          <Ionicons name="leaf" size={36} color={color} />
        </View>
        <Txt variant="titleLg" center>
          Your {scoring.name} result
        </Txt>

        <View style={styles.framingCard}>
          <Txt variant="bodySm" color={Colors.textSub}>
            {scoring.framing}
          </Txt>
        </View>

        <Txt variant="display" color={color} center>
          {score}
        </Txt>
        <Txt variant="caption" color={Colors.textSub} center>
          out of {max}
        </Txt>
        <Txt variant="titleSm" color={color} center>
          {band.label}
        </Txt>

        <View style={styles.noteCard}>
          <Txt variant="bodySm" color={Colors.textMain}>
            {band.note}
          </Txt>
        </View>

        <Txt variant="caption" color={Colors.textSub} center>
          Saved to your history — retake it any time to see how things change.
        </Txt>
      </ScrollView>
      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Button title="Review answers" variant="secondary" onPress={onReview} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Continue" variant="primary" onPress={onClose} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  body: {
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  framingCard: {
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignSelf: 'stretch',
  },
  noteCard: {
    backgroundColor: Colors.highlight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.highlightBorder,
    padding: Spacing.lg,
    alignSelf: 'stretch',
  },
  footer: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
});

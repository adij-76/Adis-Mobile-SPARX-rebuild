import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { wheelCategories, wheelScore } from '@/data/content';

export default function AssessmentSummary() {
  const sorted = wheelCategories
    .map((c) => ({ ...c, score: wheelScore(c) }))
    .sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 2);
  const focus = sorted.slice(-2);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Assessment summary" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card style={{ gap: Spacing.md }}>
          <Txt variant="titleSm">Where you're thriving</Txt>
          {top.map((a) => (
            <View key={a.id} style={styles.row}>
              <Ionicons name="trending-up" size={18} color={Colors.success} />
              <Txt variant="bodyMedium" style={{ flex: 1 }}>
                {a.label}
              </Txt>
              <Txt variant="bodySmBold" color={a.color}>
                {a.score}/100
              </Txt>
            </View>
          ))}
        </Card>

        <Card style={{ gap: Spacing.md }}>
          <Txt variant="titleSm">Areas to focus on</Txt>
          {focus.map((a) => (
            <View key={a.id} style={styles.row}>
              <Ionicons name="flag-outline" size={18} color={Colors.orange} />
              <Txt variant="bodyMedium" style={{ flex: 1 }}>
                {a.label}
              </Txt>
              <Txt variant="bodySmBold" color={a.color}>
                {a.score}/100
              </Txt>
            </View>
          ))}
        </Card>

        <Card style={{ gap: Spacing.sm }}>
          <Txt variant="titleSm">Coach's note</Txt>
          <Txt variant="body" color={Colors.textSub}>
            You&apos;ve shown real consistency with your daily check-ins. Your mood and cravings are
            trending in the right direction. Consider setting one small, specific goal for your
            lowest-scoring area this week.
          </Txt>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});

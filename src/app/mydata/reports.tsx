import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { api } from '@/api';
import { Colors, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useStore, type CheckinEntry } from '@/lib/store';

type ReportCard = { id: string; title: string; date: string; summary: string };

const real = (arr: string[]) => arr.filter((e) => !e.toLowerCase().startsWith("i don't"));

/** Build personalized report cards from the user's saved check-ins. */
function buildReports(checkins: CheckinEntry[]): ReportCard[] {
  if (checkins.length === 0) return [];
  const recent = checkins.slice(0, 7);
  const avgMood = Math.round(recent.reduce((s, c) => s + c.mood, 0) / recent.length);

  const tally = (pick: (c: CheckinEntry) => string[]) => {
    const counts: Record<string, number> = {};
    recent.forEach((c) => real(pick(c)).forEach((e) => (counts[e] = (counts[e] ?? 0) + 1)));
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const topPos = tally((c) => c.positive);
  const topNeg = tally((c) => c.negative);
  const behaviorDays = recent.filter((c) => c.behavior === 'yes').length;
  const latest = checkins[0];

  const weekSummary =
    `Across your last ${recent.length} check-in${recent.length > 1 ? 's' : ''}, your average mood was ${avgMood}/100.` +
    (topPos ? ` You most often felt ${topPos.toLowerCase()}.` : '') +
    (topNeg ? ` ${topNeg} came up most among the harder feelings.` : '') +
    (behaviorDays
      ? ` You flagged your behavior on ${behaviorDays} day${behaviorDays > 1 ? 's' : ''} — that honesty is the work.`
      : ' You stayed on track every day you logged. 💪');

  const latestSummary =
    `Mood ${latest.mood}/100.` +
    (real(latest.positive).length ? ` Positive: ${real(latest.positive).join(', ')}.` : '') +
    (real(latest.negative).length ? ` Working through: ${real(latest.negative).join(', ')}.` : '') +
    (latest.affirmation ? ` “${latest.affirmation}”` : '');

  return [
    { id: 'gen-week', title: 'Your recent check-ins', date: `Updated ${latest.date}`, summary: weekSummary },
    { id: 'gen-latest', title: 'Latest check-in', date: latest.date, summary: latestSummary },
  ];
}

export default function Reports() {
  const { checkins } = useStore();
  const generated = buildReports(checkins);
  const reports = useAsync(() => api.insights.reports(), []).data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Personalised reports" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {generated.length === 0 ? (
          <Card style={{ gap: Spacing.sm }}>
            <Txt variant="bodyMedium">No personalised reports yet</Txt>
            <Txt variant="bodySm" color={Colors.textSub}>
              Complete a daily check-in and your reports will build here from your real mood,
              emotions, and progress.
            </Txt>
          </Card>
        ) : null}

        {[...generated, ...reports].map((r) => (
          <Card key={r.id} style={{ gap: Spacing.sm }}>
            <View style={styles.head}>
              <View style={styles.icon}>
                <Ionicons name="document-text" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyMedium">{r.title}</Txt>
                <Txt variant="caption" color={Colors.textSub}>
                  {r.date}
                </Txt>
              </View>
            </View>
            <Txt variant="bodySm" color={Colors.textSub}>
              {r.summary}
            </Txt>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(22,104,144,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

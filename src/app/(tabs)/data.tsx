import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/layout/screen';
import { Card } from '@/components/ui/card';
import { MetricTrend } from '@/components/ui/metric-trend';
import { Txt } from '@/components/ui/text';
import { api } from '@/api';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useStore } from '@/lib/store';
import { buildTrendSeries } from '@/lib/trend';

export default function DataScreen() {
  const router = useRouter();
  const { checkins } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = checkins.some((c) => c.date === today);
  const wheelAreas = useAsync(() => api.insights.wheelAreas(), []).data ?? [];
  const reports = useAsync(() => api.insights.reports(), []).data ?? [];
  const useTracking = useAsync(() => api.insights.useTracking(), []).data ?? [];
  // How much: total amount used per period (0 on clean days). Sum, not average,
  // so a couple of uses in a month don't round away to nothing.
  const useAmountSeries = buildTrendSeries(
    useTracking.filter((p) => p.amount != null).map((p) => ({ at: p.at, value: p.amount as number })),
    { aggregate: 'sum' },
  );
  // How often: share of days with any use, as a percentage per period.
  const daysUsedSeries = buildTrendSeries(
    useTracking.map((p) => ({ at: p.at, value: p.used ? 100 : 0 })),
    { aggregate: 'avg', includeRecent: false },
  );
  const assessments = useAsync(() => api.insights.assessments(), []).data ?? [];
  const scored = wheelAreas.map((c) => ({ ...c, score: c.current }));
  const balance = scored.length
    ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length)
    : 0;

  return (
    <Screen style={styles.root}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 2 }}>
          <Txt variant="titleLg">My Data</Txt>
          <Txt variant="bodySm" color={Colors.textSub}>
            Track your progress and check-ins over time
          </Txt>
        </View>
        {/* Wheel of Life summary */}
        <Pressable onPress={() => router.push('/mydata/wheel')}>
          <Card style={{ gap: Spacing.lg }}>
            <View style={styles.cardHead}>
              <Txt variant="titleSm">Wheel of Life</Txt>
              <View style={styles.balancePill}>
                <Txt variant="caption" color={Colors.white}>
                  {balance}% balance
                </Txt>
              </View>
            </View>
            {scored.slice(0, 4).map((a) => (
              <View key={a.id} style={styles.areaRow}>
                <Ionicons name={a.icon as never} size={18} color={a.color} />
                <Txt variant="bodySm" style={{ width: 130 }} numberOfLines={1}>
                  {a.short}
                </Txt>
                <View style={styles.track}>
                  <View
                    style={[styles.fill, { width: `${a.score}%`, backgroundColor: a.color }]}
                  />
                </View>
                <Txt variant="bodySmBold" color={Colors.textSub}>
                  {a.score}
                </Txt>
              </View>
            ))}
            <Txt variant="bodySmMedium" color={Colors.primary}>
              View full wheel →
            </Txt>
          </Card>
        </Pressable>

        {/* Substance use — how much (total uses per period). */}
        {useAmountSeries.length > 0 && (
          <Card style={{ gap: Spacing.lg }}>
            <View style={styles.cardHead}>
              <Txt variant="titleSm">Substance use</Txt>
              <Txt variant="caption" color={Colors.textSub}>
                total uses · lower is better
              </Txt>
            </View>
            <MetricTrend series={useAmountSeries} higherIsBetter={false} accent={Colors.primary} />
          </Card>
        )}

        {/* Substance use — how often (share of days with any use). */}
        {daysUsedSeries.length > 0 && (
          <Card style={{ gap: Spacing.lg }}>
            <View style={styles.cardHead}>
              <Txt variant="titleSm">Days used</Txt>
              <Txt variant="caption" color={Colors.textSub}>
                % of days · lower is better
              </Txt>
            </View>
            <MetricTrend series={daysUsedSeries} unit="%" higherIsBetter={false} accent={Colors.primary} />
          </Card>
        )}

        {/* Daily check-in — compact row; shows a done state once completed today. */}
        <Pressable onPress={() => router.push('/checkin')} style={styles.checkinRow}>
          <Ionicons
            name={checkedInToday ? 'checkmark-circle' : 'clipboard-outline'}
            size={20}
            color={checkedInToday ? Colors.success : Colors.primary}
          />
          <Txt variant="bodySmMedium" style={{ flex: 1 }}>
            {checkedInToday ? 'Checked in today' : 'Daily check-in'}
          </Txt>
          {!checkedInToday && <Ionicons name="chevron-forward" size={18} color={Colors.textSub} />}
        </Pressable>

        {/* Assessments taken */}
        {assessments.length > 0 && (
          <View style={{ gap: Spacing.md }}>
            <Txt variant="titleSm">Assessments</Txt>
            {assessments.map((a) => (
              <Card key={a.id} style={styles.assessRow}>
                <View style={styles.assessIcon}>
                  <Ionicons name="clipboard-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyMedium" numberOfLines={1}>
                    {a.name}
                  </Txt>
                  {a.takenAt ? (
                    <Txt variant="caption" color={Colors.textSub}>
                      {String(a.takenAt).slice(0, 10)}
                    </Txt>
                  ) : null}
                </View>
                {a.score != null ? (
                  <View style={styles.scorePill}>
                    <Txt variant="bodySmBold" color={Colors.primary}>
                      {a.score}
                    </Txt>
                  </View>
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                )}
              </Card>
            ))}
          </View>
        )}

        {/* Quick links */}
        <View style={styles.quick}>
          <Pressable style={styles.quickItem} onPress={() => router.push('/mydata/leaderboard')}>
            <Ionicons name="trophy" size={22} color={Colors.orange} />
            <Txt variant="bodySmMedium">Leaderboard</Txt>
          </Pressable>
          <Pressable style={styles.quickItem} onPress={() => router.push('/mydata/reports')}>
            <Ionicons name="document-text" size={22} color={Colors.primary} />
            <Txt variant="bodySmMedium">Reports</Txt>
          </Pressable>
        </View>

        {/* Reports preview */}
        <View style={styles.sectionHead}>
          <Txt variant="titleSm">Personalised reports</Txt>
          <Pressable onPress={() => router.push('/mydata/reports')}>
            <Txt variant="bodySmMedium" color={Colors.primary}>
              See all
            </Txt>
          </Pressable>
        </View>
        {reports.map((r) => (
          <Card key={r.id} style={{ gap: 4 }}>
            <Txt variant="bodyMedium">{r.title}</Txt>
            <Txt variant="caption" color={Colors.textSub}>
              {r.date}
            </Txt>
            <Txt variant="bodySm" color={Colors.textSub} numberOfLines={2}>
              {r.summary}
            </Txt>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balancePill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  track: { flex: 1, height: 8, borderRadius: Radius.pill, backgroundColor: Colors.soft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  checkinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  assessRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  assessIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(22,104,144,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePill: {
    minWidth: 36,
    alignItems: 'center',
    backgroundColor: 'rgba(22,104,144,0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  quick: { flexDirection: 'row', gap: Spacing.lg },
  quickItem: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

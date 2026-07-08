import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/layout/screen';
import { Card } from '@/components/ui/card';
import { SourceBadge } from '@/components/ui/source-badge';
import { MetricTrend } from '@/components/ui/metric-trend';
import { Txt } from '@/components/ui/text';
import { api } from '@/api';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { INSTRUMENTS, type AssessmentId } from '@/lib/assessments';
import { SHEET_SCORING } from '@/lib/exercise-scores';
import { useStore } from '@/lib/store';
import { todayLocal } from '@/lib/checkin';
import { buildTrendSeries } from '@/lib/trend';

export default function DataScreen() {
  const router = useRouter();
  const { checkins, hasUnsyncedCheckins } = useStore();
  const today = todayLocal();
  const checkedInToday = checkins.some((c) => c.date === today);
  const wheelQuery = useAsync(() => api.insights.wheelAreas(), []);
  const wheelAreas = wheelQuery.data ?? [];
  const reportsQ = useAsync(() => api.insights.reports(), []);
  const reports = reportsQ.data ?? [];
  const useTrackingQ = useAsync(() => api.insights.useTracking(), []);
  const useTracking = useTrackingQ.data ?? [];
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
  const assessmentsQ = useAsync(() => api.insights.assessments(), []);
  const assessments = assessmentsQ.data ?? [];

  // App-owned assessment history → a score trend for EVERY scored instrument:
  // the standard battery (GAD-7, PHQ-9, AUDIT-C, PCL-5) AND worksheet scores
  // (ACE, …). Lower is better for these, so a drop reads green. A trend card
  // only appears once there are at least TWO takes — one point isn't a
  // comparison. Oldest→newest is handled by buildTrendSeries.
  const myAssessmentsQ = useAsync(() => api.assessments.list(), []);
  const myAssessments = myAssessmentsQ.data ?? [];
  const assessmentTrends = useMemo(() => {
    const byInst = new Map<string, { at: string; value: number }[]>();
    for (const r of myAssessments) {
      if (r.score == null) continue;
      const arr = byInst.get(r.instrument) ?? [];
      arr.push({ at: r.takenAt, value: r.score });
      byInst.set(r.instrument, arr);
    }
    const nameOf = (id: string) =>
      INSTRUMENTS[id as AssessmentId]?.name ??
      SHEET_SCORING.find((s) => s.instrument === id)?.name ??
      id.toUpperCase();
    return [...byInst.entries()]
      .filter(([, pts]) => pts.length >= 2)
      .map(([id, pts]) => ({ id, name: nameOf(id), series: buildTrendSeries(pts) }))
      .filter((t) => t.series.length > 0);
  }, [myAssessments]);

  // Weekly points rank for the leaderboard banner teaser (most "contest"-like).
  const weeklyBoardQ = useAsync(() => api.insights.leaderboard('points', 'week'), []);
  const weeklyBoard = weeklyBoardQ.data ?? [];
  const myRank = weeklyBoard.find((e) => e.you)?.rank ?? null;
  const scored = wheelAreas.map((c) => ({ ...c, score: c.current }));
  const balance = scored.length
    ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length)
    : 0;

  // Pull-to-refresh: reload every metric source on this screen (F-M1).
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        wheelQuery.reload(),
        reportsQ.reload(),
        useTrackingQ.reload(),
        assessmentsQ.reload(),
        myAssessmentsQ.reload(),
        weeklyBoardQ.reload(),
      ]);
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen style={styles.root}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }>
        <View style={{ gap: 2 }}>
          <Txt variant="titleLg">My Data</Txt>
          <Txt variant="bodySm" color={Colors.textSub}>
            Track your progress and check-ins over time
          </Txt>
          {hasUnsyncedCheckins && (
            <View style={styles.syncNote}>
              <Ionicons name="cloud-offline-outline" size={14} color={Colors.textSub} />
              <Txt variant="caption" color={Colors.textSub}>
                A check-in hasn&apos;t synced yet — we&apos;ll retry automatically.
              </Txt>
            </View>
          )}
          <SourceBadge />
        </View>

        {/* Leaderboard — prominent, full-width banner up top */}
        <Pressable style={styles.lbBanner} onPress={() => router.push('/mydata/leaderboard')}>
          <View style={styles.lbIcon}>
            <Ionicons name="trophy" size={26} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyMedium" color={Colors.white}>
              Leaderboard
            </Txt>
            <Txt variant="bodySm" color="rgba(255,255,255,0.9)">
              {myRank ? `You're #${myRank} this week — keep climbing` : 'See how you rank this week'}
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={22} color={Colors.white} />
        </Pressable>

        {/* Wheel of Life summary */}
        <Pressable onPress={() => router.push('/mydata/wheel')}>
          <Card style={{ gap: Spacing.lg }}>
            <View style={styles.cardHead}>
              <Txt variant="titleSm">Wheel of Life</Txt>
              <View style={styles.balancePill}>
                <Txt variant="caption" color={Colors.white}>
                  {/* Don't flash a fabricated "0% balance" while loading — show a
                      muted placeholder until the real scores arrive (F-M6). */}
                  {wheelQuery.loading && scored.length === 0 ? '— balance' : `${balance}% balance`}
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

        {/* Substance use — how much (total amount used per period). */}
        {useAmountSeries.length > 0 && (
          <Card style={{ gap: Spacing.lg }}>
            <View style={styles.cardHead}>
              <Txt variant="titleSm">Amount</Txt>
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
              <Txt variant="titleSm">% days used</Txt>
              <Txt variant="caption" color={Colors.textSub}>
                share of days · lower is better
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

        {/* Assessment trends (app-owned battery history) */}
        {assessmentTrends.length > 0 && (
          <View style={{ gap: Spacing.lg }}>
            <Txt variant="titleSm">Assessment trends</Txt>
            {assessmentTrends.map((t) => (
              <View key={t.id} style={{ gap: Spacing.sm }}>
                <Txt variant="bodyMedium">{t.name}</Txt>
                <MetricTrend series={t.series} higherIsBetter={false} accent={Colors.primary} />
              </View>
            ))}
          </View>
        )}

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
  syncNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 },
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
  lbBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.orange,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  lbIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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

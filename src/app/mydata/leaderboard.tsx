import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Avatar } from '@/components/ui/avatar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Segmented } from '@/components/ui/segmented';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import type { LeaderboardPeriod } from '@/api';

const MEDAL = ['#E8B923', '#9AA4B2', '#CD7F32'];

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'all', label: 'All-time' },
  { key: 'month', label: 'This month' },
  { key: 'week', label: 'This week' },
];

const SUBTITLE: Record<LeaderboardPeriod, string> = {
  all: 'Top members of all time',
  month: 'Top movers over the last 30 days',
  week: 'Top movers over the last 7 days',
};

export default function Leaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const { data, loading } = useAsync(() => api.insights.leaderboard(period), [period]);
  const leaderboard = data ?? [];
  const me = leaderboard.find((e) => e.you);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Leaderboard" />
      <View style={styles.controls}>
        <Segmented<LeaderboardPeriod> options={PERIODS} value={period} onChange={setPeriod} />
        <Txt variant="bodySm" color={Colors.textSub}>
          {SUBTITLE[period]}
        </Txt>
      </View>
      <FlatList
        data={leaderboard}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: Spacing.xxl }}>
              No points earned {period === 'week' ? 'in the last 7 days' : period === 'month' ? 'in the last 30 days' : 'yet'}.
            </Txt>
          )
        }
        ListFooterComponent={
          me && me.rank > 3 ? (
            <View style={styles.youFooter}>
              <Txt variant="caption" color={Colors.textSub}>
                You&apos;re #{me.rank} with {me.points.toLocaleString()} pts
              </Txt>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.row, item.you && styles.youRow]}>
            <Txt
              variant="titleSm"
              color={item.rank <= 3 ? MEDAL[item.rank - 1] : Colors.textSub}
              style={styles.rank}>
              {item.rank}
            </Txt>
            <Avatar uri={item.avatar} name={item.name} size={40} />
            <Txt variant="bodyMedium" style={{ flex: 1 }} color={item.you ? Colors.primary : Colors.textMain}>
              {item.name}
            </Txt>
            <Txt variant="bodySmBold" color={Colors.primary}>
              {item.points.toLocaleString()} pts
            </Txt>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  controls: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm },
  list: { padding: Spacing.lg, gap: Spacing.sm, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  youRow: { borderColor: Colors.highlightBorder, backgroundColor: Colors.highlight },
  rank: { width: 24, textAlign: 'center' },
  youFooter: { alignItems: 'center', paddingTop: Spacing.lg },
});

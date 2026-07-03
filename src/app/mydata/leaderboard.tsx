import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Avatar } from '@/components/ui/avatar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Segmented } from '@/components/ui/segmented';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import type { LeaderboardBoard, LeaderboardPeriod } from '@/api';

const MEDAL = ['#E8B923', '#9AA4B2', '#CD7F32'];

type Board = { key: LeaderboardBoard; label: string; unit: string; streak?: boolean };
const BOARDS: Board[] = [
  { key: 'points', label: 'Points', unit: 'pts' },
  { key: 'streak', label: 'Streak', unit: 'days', streak: true },
  { key: 'lessons', label: 'Lessons', unit: 'lessons' },
  { key: 'workshops', label: 'Workshops', unit: 'workshops' },
  { key: 'community', label: 'Community', unit: 'posts' },
  { key: 'videos', label: 'Videos', unit: 'videos' },
  { key: 'checkins', label: 'Check-ins', unit: 'check-ins' },
];

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'all', label: 'All-time' },
  { key: 'month', label: '30 days' },
  { key: 'week', label: '7 days' },
];

const PERIOD_WORD: Record<LeaderboardPeriod, string> = {
  all: 'of all time',
  month: 'over the last 30 days',
  week: 'over the last 7 days',
};

/** "1,840 pts" · "12-day streak" · "23 lessons". */
function formatValue(value: number, board: Board): string {
  if (board.streak) return `${value}-day streak`;
  return `${value.toLocaleString()} ${board.unit}`;
}

export default function Leaderboard() {
  const [boardKey, setBoardKey] = useState<LeaderboardBoard>('points');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const board = BOARDS.find((b) => b.key === boardKey)!;

  const { data, loading } = useAsync(() => api.insights.leaderboard(boardKey, period), [boardKey, period]);
  const rows = data ?? [];
  const me = rows.find((e) => e.you);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Leaderboard" />

      <View style={styles.controls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.boardRow}>
          {BOARDS.map((b) => {
            const on = b.key === boardKey;
            return (
              <Pressable
                key={b.key}
                onPress={() => setBoardKey(b.key)}
                style={[styles.chip, on && styles.chipOn]}>
                <Txt variant="bodySmMedium" color={on ? Colors.white : Colors.textSub}>
                  {b.label}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.padded}>
          <Segmented<LeaderboardPeriod> options={PERIODS} value={period} onChange={setPeriod} />
          <Txt variant="bodySm" color={Colors.textSub}>
            {board.streak ? 'Longest check-in streak ' : `Top for ${board.label.toLowerCase()} `}
            {PERIOD_WORD[period]}
          </Txt>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: Spacing.xxl }}>
              Nothing here yet {period === 'all' ? '' : PERIOD_WORD[period]} — be the first on the board.
            </Txt>
          )
        }
        ListFooterComponent={
          me && me.rank > 3 ? (
            <View style={styles.youFooter}>
              <Txt variant="caption" color={Colors.textSub}>
                You&apos;re #{me.rank} — {formatValue(me.points, board)}
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
              {formatValue(item.points, board)}
            </Txt>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  controls: { paddingTop: Spacing.md, gap: Spacing.sm },
  padded: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  boardRow: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.soft,
  },
  chipOn: { backgroundColor: Colors.primary },
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

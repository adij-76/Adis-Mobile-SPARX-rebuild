import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import type { LeaderboardEntry } from '@/data/content';

const MEDAL = ['#F5C542', '#C7CDD6', '#CD8B52']; // gold · silver · bronze
type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** The XP board is served by the app-owned ledger (mobile_xp_events) rather than
 *  the production points RPC, so it reflects the same XP the app awards + the
 *  celebrations reference. */
type BoardKey = LeaderboardBoard | 'xp';

type Board = {
  key: BoardKey;
  label: string;
  unit: string;
  streak?: boolean;
  icon: IconName;
  colors: [string, string]; // gradient
};

const BOARDS: Board[] = [
  { key: 'xp', label: 'XP', unit: 'XP', icon: 'sparkles', colors: ['#FF9D4B', '#F0453B'] },
  { key: 'points', label: 'Points', unit: 'pts', icon: 'star', colors: ['#FFB84D', '#FF8A3D'] },
  { key: 'streak', label: 'Streak', unit: 'days', streak: true, icon: 'flame', colors: ['#FF7A59', '#F0453B'] },
  { key: 'lessons', label: 'Lessons', unit: 'lessons', icon: 'school', colors: ['#2E8BB0', '#166890'] },
  { key: 'workshops', label: 'Workshops', unit: 'workshops', icon: 'color-palette', colors: ['#9B7BFF', '#7A5AF8'] },
  { key: 'community', label: 'Community', unit: 'posts', icon: 'chatbubbles', colors: ['#5BB8D4', '#2F9BC0'] },
  { key: 'videos', label: 'Videos', unit: 'videos', icon: 'play-circle', colors: ['#F472B6', '#E0489A'] },
  { key: 'checkins', label: 'Check-ins', unit: 'check-ins', icon: 'checkmark-done-circle', colors: ['#54D6A6', '#38C793'] },
];

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'all', label: 'All-time' },
  { key: 'month', label: '30 days' },
  { key: 'week', label: '7 days' },
];

const PERIOD_WORD: Record<LeaderboardPeriod, string> = {
  all: 'all-time',
  month: 'last 30 days',
  week: 'last 7 days',
};

/** "1,840 pts" · "12-day streak" · "23 lessons". */
function formatValue(value: number, board: Board): string {
  if (board.streak) return `${value}-day streak`;
  return `${value.toLocaleString()} ${board.unit}`;
}

export default function Leaderboard() {
  const [boardKey, setBoardKey] = useState<BoardKey>('xp');
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const board = BOARDS.find((b) => b.key === boardKey)!;

  const { data, loading } = useAsync(
    () =>
      boardKey === 'xp'
        ? api.xp.leaderboard(period)
        : api.insights.leaderboard(boardKey as LeaderboardBoard, period),
    [boardKey, period],
  );
  const rows = data ?? [];
  const me = rows.find((e) => e.you);
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Leaderboard" />

      {/* Board switcher — icon chips, tinted by the active board */}
      <View style={styles.controls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.boardScroll}
          contentContainerStyle={styles.boardRow}>
          {BOARDS.map((b) => {
            const on = b.key === boardKey;
            return (
              <Pressable
                key={b.key}
                onPress={() => setBoardKey(b.key)}
                style={[styles.chip, on && { backgroundColor: b.colors[1] }]}>
                <Ionicons name={b.icon} size={15} color={on ? Colors.white : Colors.textSub} />
                <Txt variant="bodySmMedium" color={on ? Colors.white : Colors.textSub}>
                  {b.label}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.periodWrap}>
          <Segmented<LeaderboardPeriod> options={PERIODS} value={period} onChange={setPeriod} />
        </View>
      </View>

      <FlatList
        data={rest}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          top3.length > 0 ? <Hero board={board} period={period} top3={top3} /> : null
        }
        ListEmptyComponent={
          loading || top3.length > 0 ? null : (
            <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: Spacing.xxl }}>
              Nothing here yet — be the first on the board.
            </Txt>
          )
        }
        renderItem={({ item }) => <Row item={item} board={board} />}
      />

      {/* Pinned "your rank" bar when you're off the podium and below the fold */}
      {me && me.rank > 3 && (
        <View style={[styles.youBar, { borderColor: board.colors[1] }]}>
          <View style={[styles.youRank, { backgroundColor: board.colors[1] }]}>
            <Txt variant="bodySmBold" color={Colors.white}>
              #{me.rank}
            </Txt>
          </View>
          <Avatar uri={me.avatar} name={me.name} size={36} />
          <Txt variant="bodyMedium" style={{ flex: 1 }}>
            You
          </Txt>
          <Txt variant="bodySmBold" color={board.colors[1]}>
            {formatValue(me.points, board)}
          </Txt>
        </View>
      )}
    </SafeAreaView>
  );
}

/** Gradient hero with the top-3 podium. */
function Hero({ board, period, top3 }: { board: Board; period: LeaderboardPeriod; top3: LeaderboardEntry[] }) {
  // Visual order: 2nd, 1st, 3rd (winner centre, tallest).
  const order = [top3[1], top3[0], top3[2]].filter(Boolean) as LeaderboardEntry[];
  return (
    <View style={styles.heroWrap}>
      <LinearGradient
        colors={[board.colors[0], board.colors[1]]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.hero}>
        {/* Depth + texture: translucent "bokeh" spheres, a top sheen and a
            bottom shade — all clipped to the rounded card by overflow:hidden. */}
        <View pointerEvents="none" style={[styles.blob, styles.blobTL]} />
        <View pointerEvents="none" style={[styles.blob, styles.blobBR]} />
        <View pointerEvents="none" style={[styles.blob, styles.blobSm]} />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          style={styles.sheen}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']}
          style={styles.shade}
        />

        <View style={styles.heroHead}>
          <Ionicons name={board.icon} size={18} color={Colors.white} />
          <Txt variant="bodySmBold" color={Colors.white}>
            {board.streak ? 'Longest streaks' : `Top ${board.label.toLowerCase()}`} · {PERIOD_WORD[period]}
          </Txt>
        </View>

        <View style={styles.podium}>
        {order.map((e) => {
          const place = e.rank; // 1 | 2 | 3
          const medal = MEDAL[place - 1];
          const pedH = place === 1 ? 78 : place === 2 ? 56 : 44;
          const avatarSize = place === 1 ? 68 : 56;
          return (
            <View key={e.id} style={styles.podCol}>
              {place === 1 && <Ionicons name="star" size={20} color={medal} style={{ marginBottom: 2 }} />}
              <Avatar
                uri={e.avatar}
                name={e.name}
                size={avatarSize}
                style={{ borderWidth: 3, borderColor: medal }}
              />
              <Txt variant="bodySmBold" color={Colors.white} numberOfLines={1} style={styles.podName}>
                {e.you ? 'You' : e.name}
              </Txt>
              <Txt variant="caption" color="rgba(255,255,255,0.9)" numberOfLines={1}>
                {formatValue(e.points, board)}
              </Txt>
              <View style={[styles.pedestal, { height: pedH }]}>
                <Txt variant="titleLg" color="rgba(255,255,255,0.9)">
                  {place}
                </Txt>
              </View>
            </View>
          );
        })}
        </View>
      </LinearGradient>
    </View>
  );
}

function Row({ item, board }: { item: LeaderboardEntry; board: Board }) {
  return (
    <View style={[styles.row, item.you && { borderColor: board.colors[1], backgroundColor: Colors.highlight }]}>
      <Txt variant="titleSm" color={Colors.textSub} style={styles.rank}>
        {item.rank}
      </Txt>
      <Avatar uri={item.avatar} name={item.name} size={40} />
      <Txt variant="bodyMedium" style={{ flex: 1 }} color={item.you ? board.colors[1] : Colors.textMain}>
        {item.you ? 'You' : item.name}
      </Txt>
      <View style={[styles.scorePill, { backgroundColor: `${board.colors[1]}1A` }]}>
        <Txt variant="bodySmBold" color={board.colors[1]}>
          {formatValue(item.points, board)}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  controls: {},
  boardScroll: { flexGrow: 0 },
  boardRow: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.soft,
  },
  periodWrap: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm, flexGrow: 1 },

  heroWrap: {
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    // lift the card off the background for depth
    shadowColor: '#3A1E00',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  hero: {
    borderRadius: Radius.lg,
    overflow: 'hidden', // clip the texture layers to the rounded card
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  blob: { position: 'absolute', borderRadius: 999 },
  blobTL: { top: -36, left: -24, width: 150, height: 150, backgroundColor: 'rgba(255,255,255,0.16)' },
  blobBR: { bottom: -50, right: -34, width: 200, height: 200, backgroundColor: 'rgba(0,0,0,0.10)' },
  blobSm: { top: 24, right: 44, width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.12)' },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 72 },
  shade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 110 },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: Spacing.sm },
  podCol: { flex: 1, alignItems: 'center', gap: 3 },
  podName: { maxWidth: '100%', marginTop: 6 },
  pedestal: {
    width: '86%',
    marginTop: 4,
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Spacing.sm,
  },

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
  rank: { width: 24, textAlign: 'center' },
  scorePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  youBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
  },
  youRank: {
    minWidth: 34,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

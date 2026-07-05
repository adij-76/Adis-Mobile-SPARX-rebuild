import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { XpMovement } from '@/lib/xp-award';

const PERIOD_LABEL: Record<XpMovement['period'], string> = {
  today: 'today',
  week: 'this week',
  month: 'this month',
  all: 'all-time',
};

/**
 * The leaderboard-movement line shown on every completion celebration. Renders
 * nothing until a rank is known (so a backend blip just hides it, never blocks
 * the reward). `tone` matches the surface — dark celebration screens vs. light.
 */
export function RankMovement({
  movement,
  tone = 'dark',
}: {
  movement: XpMovement | null;
  tone?: 'dark' | 'light';
}) {
  if (!movement || movement.rank == null) return null;
  const when = PERIOD_LABEL[movement.period];
  const climbed = movement.moved > 0;
  const text = climbed
    ? `You climbed ${movement.moved} spot${movement.moved > 1 ? 's' : ''} — now #${movement.rank} ${when}`
    : `You're #${movement.rank}${movement.totalPlayers ? ` of ${movement.totalPlayers}` : ''} ${when}`;
  const bg = tone === 'dark' ? 'rgba(255,255,255,0.1)' : Colors.highlight;
  const fg = tone === 'dark' ? Colors.white : Colors.textMain;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Ionicons name="trophy" size={16} color={Colors.orange} />
      <Txt variant="bodySmBold" color={fg}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});

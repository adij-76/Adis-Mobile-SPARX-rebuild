import { View, StyleSheet } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { STREAK_MILESTONES } from '@/lib/streaks';
import { useStore } from '@/lib/store';

/**
 * Earned streak badges with numeric indicators — e.g. a 7-day badge you've hit
 * ×10 next to a 30-day badge you've only reached ×2. Shows only milestones the
 * user has actually reached; renders nothing until the first one lands.
 */
export function StreakBadges() {
  const { streakBadges } = useStore();
  const earned = STREAK_MILESTONES.filter((m) => (streakBadges[String(m.days)] ?? 0) > 0);
  if (earned.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Txt variant="bodySmBold" style={{ marginBottom: Spacing.sm }}>
        Streak badges
      </Txt>
      <View style={styles.row}>
        {earned.map((m) => {
          const count = streakBadges[String(m.days)] ?? 0;
          return (
            <View key={m.days} style={styles.badge}>
              <Txt variant="titleSm">{m.emoji}</Txt>
              <Txt variant="caption" color={Colors.textSub}>
                {m.label}
              </Txt>
              {count > 1 && (
                <View style={styles.count}>
                  <Txt variant="caption" color={Colors.white}>
                    ×{count}
                  </Txt>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 66,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.soft,
  },
  count: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
});

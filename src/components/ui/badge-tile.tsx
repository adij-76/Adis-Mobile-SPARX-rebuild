import { View, StyleSheet } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { BadgeDef } from '@/lib/badges';

/** A single badge, earned (colour + emoji + ×N) or locked (greyed + hint). */
export function BadgeTile({ badge, count }: { badge: BadgeDef; count: number }) {
  const earned = count > 0;
  return (
    <View style={[styles.tile, earned ? styles.earned : styles.locked]}>
      <Txt variant="titleLg" style={!earned && styles.dim}>
        {badge.emoji}
      </Txt>
      <Txt variant="caption" color={earned ? Colors.textMain : Colors.textSub} center numberOfLines={2}>
        {badge.title}
      </Txt>
      {!earned ? (
        <Txt variant="caption" color={Colors.textSub} center numberOfLines={2} style={styles.hint}>
          {badge.hint}
        </Txt>
      ) : null}
      {earned && badge.kind === 'repeat' && count > 1 ? (
        <View style={styles.count}>
          <Txt variant="caption" color={Colors.white}>
            ×{count}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 104,
    minHeight: 104,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  earned: { backgroundColor: Colors.highlight, borderWidth: 1, borderColor: Colors.highlightBorder },
  locked: { backgroundColor: Colors.soft, borderWidth: 1, borderColor: Colors.stroke },
  dim: { opacity: 0.4 },
  hint: { fontSize: 10, lineHeight: 13 },
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

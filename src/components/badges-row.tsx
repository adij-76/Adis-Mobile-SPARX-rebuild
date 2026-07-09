import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BadgeTile } from '@/components/ui/badge-tile';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { useBadges } from '@/hooks/use-badges';

/** A compact strip of the user's top earned badges with a link to the full
 *  Achievements screen. Shows a gentle nudge when none are earned yet. */
export function BadgesRow() {
  const router = useRouter();
  const { earned, all } = useBadges();
  // Show the highest-count earned badges first, capped at 3.
  const top = [...earned].sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Txt variant="bodySmBold">Achievements</Txt>
        <Pressable
          onPress={() => router.push('/achievements')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="See all achievements">
          <Txt variant="bodySmMedium" color={Colors.primary}>
            See all ({earned.length}/{all.length})
          </Txt>
        </Pressable>
      </View>

      {top.length === 0 ? (
        <Pressable style={styles.empty} onPress={() => router.push('/achievements')}>
          <Ionicons name="ribbon-outline" size={20} color={Colors.textSub} />
          <Txt variant="bodySm" color={Colors.textSub} style={{ flex: 1 }}>
            No badges yet — check in, learn, and connect to start earning them.
          </Txt>
        </Pressable>
      ) : (
        <View style={styles.row}>
          {top.map((b) => (
            <BadgeTile key={b.def.id} badge={b.def} count={b.count} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm, marginTop: Spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  empty: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});

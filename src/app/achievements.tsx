import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { BadgeTile } from '@/components/ui/badge-tile';
import { useBadges } from '@/hooks/use-badges';
import { CATEGORY_LABEL, type BadgeCategory } from '@/lib/badges';

const ORDER: BadgeCategory[] = ['streaks', 'recovery', 'learning', 'community', 'profile'];

export default function Achievements() {
  const { all } = useBadges();
  const earnedCount = all.filter((b) => b.count > 0).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle="Achievements" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Txt variant="titleLg" color={Colors.primary}>
            {earnedCount}/{all.length}
          </Txt>
          <Txt variant="bodySm" color={Colors.textSub}>
            badges earned — keep going to unlock the rest.
          </Txt>
        </View>

        {ORDER.map((cat) => {
          const items = all.filter((b) => b.def.category === cat);
          if (!items.length) return null;
          // Earned first, then locked.
          const sorted = [...items].sort((a, b) => (b.count > 0 ? 1 : 0) - (a.count > 0 ? 1 : 0));
          return (
            <View key={cat} style={{ gap: Spacing.md }}>
              <Txt variant="bodySmBold" color={Colors.textSub}>
                {CATEGORY_LABEL[cat].toUpperCase()}
              </Txt>
              <View style={styles.grid}>
                {sorted.map((b) => (
                  <BadgeTile key={b.def.id} badge={b.def} count={b.count} />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.xl },
  summary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});

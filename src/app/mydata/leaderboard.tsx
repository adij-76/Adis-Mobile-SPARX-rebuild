import { Image } from 'expo-image';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { leaderboard } from '@/data/content';

const MEDAL = ['#E8B923', '#9AA4B2', '#CD7F32'];

export default function Leaderboard() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Leaderboard" />
      <FlatList
        data={leaderboard}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.row, item.you && styles.youRow]}>
            <Txt
              variant="titleSm"
              color={item.rank <= 3 ? MEDAL[item.rank - 1] : Colors.textSub}
              style={styles.rank}>
              {item.rank}
            </Txt>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
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
  list: { padding: Spacing.lg, gap: Spacing.sm },
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
  youRow: { borderColor: Colors.primary, backgroundColor: 'rgba(22,104,144,0.06)' },
  rank: { width: 24, textAlign: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.soft },
});

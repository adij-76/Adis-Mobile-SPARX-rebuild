import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { quotes } from '@/data/content';

const PAIRS: [string, string][] = [
  ['#4A2B6B', '#2D2350'],
  ['#10243A', '#1C3B55'],
  ['#3A2A5A', '#166890'],
  ['#0A3653', '#00314E'],
];

export default function QuotesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Daily Quotes" />
      <FlatList
        data={quotes}
        keyExtractor={(q) => q.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <LinearGradient
            colors={PAIRS[index % PAIRS.length]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}>
            <Ionicons name="chatbox-ellipses-outline" size={22} color={Colors.tealLight} />
            <Txt variant="titleSm" color={Colors.white}>
              “{item.text}”
            </Txt>
            <View style={styles.row}>
              <Txt variant="bodySm" color={Colors.textMutedOnDark}>
                — {item.author}
              </Txt>
              <View style={styles.icons}>
                <Pressable hitSlop={8}>
                  <Ionicons name="heart-outline" size={20} color={Colors.white} />
                </Pressable>
                <Pressable hitSlop={8}>
                  <Ionicons name="share-social-outline" size={20} color={Colors.white} />
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  list: { padding: Spacing.lg, gap: Spacing.lg },
  card: { borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icons: { flexDirection: 'row', gap: Spacing.md },
});

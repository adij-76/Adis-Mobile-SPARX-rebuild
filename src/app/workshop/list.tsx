import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WorkshopList } from '@/components/workshop-list';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

export default function WorkshopListScreen() {
  const router = useRouter();
  const { cat } = useLocalSearchParams<{ cat?: string }>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
          <Txt variant="bodyMedium">Back</Txt>
        </Pressable>
        <Txt variant="titleLg">{cat ?? 'Workshop'}</Txt>
        {cat ? (
          <Txt variant="bodySm" color={Colors.textSub}>
            Browse {cat.toLowerCase()} for you
          </Txt>
        ) : null}
      </View>
      <WorkshopList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});

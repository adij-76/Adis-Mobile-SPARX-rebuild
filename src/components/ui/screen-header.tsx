import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

export type ScreenHeaderProps = {
  title?: string;
  /** Render a large title below the back row (matches the design's big headers). */
  largeTitle?: string;
  right?: ReactNode;
  onBack?: () => void;
};

/** Shared back-header used across stack screens. */
export function ScreenHeader({ title, largeTitle, right, onBack }: ScreenHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={onBack ?? (() => router.back())}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
          {title ? <Txt variant="bodyMedium">{title}</Txt> : null}
        </Pressable>
        {right}
      </View>
      {largeTitle ? (
        <Txt variant="titleLg" style={{ marginTop: Spacing.sm }}>
          {largeTitle}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});

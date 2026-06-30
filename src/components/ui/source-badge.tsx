import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { api } from '@/api';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

/** "● Live · Supabase" / "● Sample data" indicator showing which backend is
 *  serving the current screen. A development aid only — hidden in production
 *  builds (the shipped app), so users never see backend wording. */
export function SourceBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  if (!__DEV__) return null;
  const live = api.backend === 'supabase';
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.dot, { backgroundColor: live ? Colors.success : Colors.textSub }]} />
      <Txt variant="caption" color={Colors.textSub}>
        {live ? 'Live · Supabase' : 'Sample data'}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

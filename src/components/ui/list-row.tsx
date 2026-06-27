import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

export type ListRowProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
  showChevron?: boolean;
  right?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
};

/** Generic settings / menu row used across Profile and other lists. */
export function ListRow({
  icon,
  label,
  value,
  danger,
  showChevron = true,
  right,
  onPress,
  divider = true,
}: ListRowProps) {
  const color = danger ? Colors.danger : Colors.textMain;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divider && styles.divider,
        pressed && onPress && { backgroundColor: Colors.screen },
      ]}>
      {icon ? (
        <Ionicons name={icon} size={22} color={danger ? Colors.danger : Colors.primary} />
      ) : null}
      <Txt variant="bodyMedium" color={color} style={{ flex: 1 }}>
        {label}
      </Txt>
      {value ? (
        <Txt variant="bodySm" color={Colors.textSub}>
          {value}
        </Txt>
      ) : null}
      {right}
      {showChevron && !right && !danger ? (
        <Ionicons name="chevron-forward" size={18} color={Colors.textSub} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: Colors.stroke },
});

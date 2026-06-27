import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export type SegmentedProps<T extends string> = {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  /** 'pill' = rounded pills (meetings), 'inset' = boxed inset (home tabs) */
  variant?: 'pill' | 'inset';
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant = 'pill',
}: SegmentedProps<T>) {
  const inset = variant === 'inset';
  return (
    <View style={[styles.row, inset && styles.inset]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.item,
              inset ? styles.itemInset : styles.itemPill,
              active && (inset ? styles.activeInset : styles.activePill),
            ]}>
            <Txt variant="bodySmMedium" color={active ? Colors.white : Colors.textSub}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  inset: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: 4,
    gap: 4,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemPill: { paddingVertical: Spacing.sm, borderRadius: Radius.pill, backgroundColor: Colors.soft },
  itemInset: { paddingVertical: Spacing.sm, borderRadius: Radius.sm },
  activePill: { backgroundColor: Colors.primary },
  activeInset: { backgroundColor: Colors.primaryDark },
});

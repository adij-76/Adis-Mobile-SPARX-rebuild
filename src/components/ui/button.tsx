import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
} from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Txt } from '@/components/ui/text';

type Variant = 'primary' | 'secondary' | 'white' | 'outline' | 'ghost';
type Size = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
};

const BG: Record<Variant, string> = {
  primary: Colors.orange,
  secondary: Colors.lightBlue,
  white: Colors.white,
  outline: 'transparent',
  ghost: 'transparent',
};

const FG: Record<Variant, string> = {
  primary: Colors.white,
  secondary: Colors.white,
  white: Colors.primaryDark,
  outline: Colors.primary,
  ghost: Colors.primary,
};

export function Button({
  title,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  iconLeft,
  iconRight,
  fullWidth = true,
  ...rest
}: ButtonProps) {
  const fg = FG[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: BG[variant] },
        variant === 'outline' && styles.outline,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {iconLeft ? <Ionicons name={iconLeft} size={18} color={fg} /> : null}
          <Txt style={[Typography.bodySmBold, { color: fg }]}>{title}</Txt>
          {iconRight ? <Ionicons name={iconRight} size={18} color={fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  fullWidth: { alignSelf: 'stretch' },
  outline: { borderWidth: 1, borderColor: Colors.stroke },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});

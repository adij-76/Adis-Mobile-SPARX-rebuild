import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Layout } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';

type ScreenProps = {
  children: ReactNode;
  /** The screen's root style (background, flex). Applied to the outer fill. */
  style?: StyleProp<ViewStyle>;
  /**
   * Sets the centered column width on desktop: `app` (default, wider, for the
   * primary tab screens) or `modal` (narrower, for focused stack/detail flows).
   * The persistent sidebar lives outside the content area, so neither pads for it.
   */
  variant?: 'app' | 'modal';
  /** Override the centered column width (defaults per variant). */
  maxWidth?: number;
};

/**
 * Responsive page wrapper. On phone/tablet it's a transparent passthrough
 * (`flex: 1` + the screen's own style), so mobile layout is unchanged. On
 * desktop it centers content in a max-width column within the content area
 * (right of the persistent sidebar), with the background filling the gutters.
 */
export function Screen({ children, style, variant = 'app', maxWidth }: ScreenProps) {
  const { isDesktop } = useBreakpoint();

  if (!isDesktop) {
    return <View style={[styles.fill, style]}>{children}</View>;
  }

  const colMax = maxWidth ?? (variant === 'app' ? Layout.contentMax : Layout.modalMax);

  return (
    <View style={[styles.fill, style]}>
      <View style={[styles.column, { maxWidth: colMax }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { flex: 1, width: '100%', alignSelf: 'center' },
});

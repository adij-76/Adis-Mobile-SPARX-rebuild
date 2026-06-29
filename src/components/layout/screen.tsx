import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Layout } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';

type ScreenProps = {
  children: ReactNode;
  /** The screen's root style (background, flex). Applied to the outer fill. */
  style?: StyleProp<ViewStyle>;
  /**
   * `app` (default) — a tab screen sharing the window with the sidebar, so it
   * clears the sidebar width. `modal` — a pushed stack/modal screen that covers
   * the window (no sidebar), centered in a narrower column.
   */
  variant?: 'app' | 'modal';
  /** Override the centered column width (defaults per variant). */
  maxWidth?: number;
};

/**
 * Responsive page wrapper. On phone/tablet it's a transparent passthrough
 * (`flex: 1` + the screen's own style), so mobile layout is unchanged. On
 * desktop it centers content in a max-width column — clearing the sidebar for
 * `app` screens — with the screen background filling the gutters.
 */
export function Screen({ children, style, variant = 'app', maxWidth }: ScreenProps) {
  const { isDesktop } = useBreakpoint();

  if (!isDesktop) {
    return <View style={[styles.fill, style]}>{children}</View>;
  }

  const paddingLeft = variant === 'app' ? Layout.sidebarWidth : 0;
  const colMax = maxWidth ?? (variant === 'app' ? Layout.contentMax : Layout.modalMax);

  return (
    <View style={[styles.fill, style, { paddingLeft }]}>
      <View style={[styles.column, { maxWidth: colMax }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { flex: 1, width: '100%', alignSelf: 'center' },
});

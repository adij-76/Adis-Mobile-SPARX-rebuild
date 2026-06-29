import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Layout } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';

type ScreenProps = {
  children: ReactNode;
  /** The screen's root style (background, flex). Applied to the outer fill. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Responsive page wrapper. On phone/tablet it's a transparent passthrough
 * (`flex: 1` + the screen's own style), so mobile layout is unchanged. On
 * desktop it clears the fixed sidebar and centers content in a max-width
 * column, with the screen background filling the gutters.
 */
export function Screen({ children, style }: ScreenProps) {
  const { isDesktop } = useBreakpoint();

  if (!isDesktop) {
    return <View style={[styles.fill, style]}>{children}</View>;
  }

  return (
    <View style={[styles.fill, style, styles.desktopFill]}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  desktopFill: { paddingLeft: Layout.sidebarWidth },
  column: { flex: 1, width: '100%', maxWidth: Layout.contentMax, alignSelf: 'center' },
});

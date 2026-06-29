import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, Layout, Radius, Spacing } from '@/constants/theme';

type NavItem = { href: string; label: string; icon: keyof typeof Ionicons.glyphMap };

/** Primary nav, mirrors the bottom tab set. `href` matches the (tabs) routes. */
const NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/data', label: 'My Data', icon: 'stats-chart' },
  { href: '/sparky', label: 'Sparky AI', icon: 'sparkles' },
  { href: '/community', label: 'Community', icon: 'people' },
  { href: '/lessons', label: 'My Lessons', icon: 'book' },
];

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname.startsWith(href);

/**
 * Fixed left sidebar shown only on desktop (rendered by the tabs layout as an
 * overlay; the bottom tab bar is hidden at that breakpoint). Uses Expo Router's
 * own routing hooks, so it stays decoupled from React Navigation internals.
 */
export function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const NavRow = ({ href, label, icon }: NavItem) => {
    const active = isActive(pathname, href);
    return (
      <Pressable
        onPress={() => router.push(href as never)}
        style={[styles.item, active && styles.itemActive]}
        accessibilityRole="link"
        accessibilityState={{ selected: active }}>
        <Ionicons name={icon} size={20} color={active ? Colors.white : 'rgba(255,255,255,0.7)'} />
        <Txt variant="bodyMedium" color={active ? Colors.white : 'rgba(255,255,255,0.7)'}>
          {label}
        </Txt>
      </Pressable>
    );
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="flame" size={20} color={Colors.white} />
        </View>
        <Txt variant="titleSm" color={Colors.white}>
          IGNTD
        </Txt>
      </View>

      <View style={styles.nav}>
        {NAV.map((item) => (
          <NavRow key={item.href} {...item} />
        ))}
      </View>

      <NavRow href="/profile" label="Profile" icon="person-circle-outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: Layout.sidebarWidth,
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: { flex: 1, gap: Spacing.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  itemActive: { backgroundColor: 'rgba(255,255,255,0.14)' },
});

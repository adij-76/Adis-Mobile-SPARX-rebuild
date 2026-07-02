import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Shadow } from '@/constants/theme';

type Item = { href: string; icon: keyof typeof Ionicons.glyphMap; sparky?: boolean };

/** Mirrors the phone tab bar in (tabs)/_layout, in the same order. */
const ITEMS: Item[] = [
  { href: '/', icon: 'home' },
  { href: '/data', icon: 'stats-chart' },
  { href: '/sparky', icon: 'sparkles', sparky: true },
  { href: '/community', icon: 'people' },
  { href: '/lessons', icon: 'book' },
];

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname.startsWith(href);

/**
 * Persistent bottom navigation for pushed (non-tab) screens.
 *
 * The tab bar from (tabs)/_layout only exists inside the tab navigator; screens
 * pushed on top of it (My Data → Wheel, a lesson, settings, …) cover it entirely,
 * which is how users got stranded with only a back arrow. The root layout renders
 * this bar on those screens so every page keeps a one-tap route back into the app.
 * It navigates via Expo Router's own hooks (like DesktopSidebar), so a tap
 * dismisses the pushed screen and lands on the chosen section.
 */
export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        if (item.sparky) {
          return (
            <Pressable
              key={item.href}
              onPress={() => router.navigate(item.href as never)}
              style={styles.slot}
              accessibilityRole="button"
              accessibilityLabel="Sparky AI">
              <View style={styles.sparkWrap}>
                <LinearGradient
                  colors={active ? ['#FFB879', '#FF9D4B'] : ['#FF9D4B', '#166890']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sparkCircle}>
                  <Ionicons name="sparkles" size={26} color={Colors.white} />
                </LinearGradient>
              </View>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={item.href}
            onPress={() => router.navigate(item.href as never)}
            style={styles.slot}
            accessibilityRole="link"
            accessibilityState={{ selected: active }}>
            <Ionicons
              name={item.icon}
              size={24}
              color={active ? Colors.white : 'rgba(255,255,255,0.55)'}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    paddingTop: 6,
  },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 52 },
  sparkWrap: { alignItems: 'center', justifyContent: 'center' },
  sparkCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    borderWidth: 3,
    borderColor: Colors.primaryDark,
    ...Shadow.card,
  },
});

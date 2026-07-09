import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { user } from '@/data/content';
import { useAuth } from '@/lib/auth';
import { todayLocal } from '@/lib/checkin';
import { useStore } from '@/lib/store';

export type AppHeaderProps = {
  /** Force the unread dot on the bell. When omitted, the dot is driven by real
   *  state (an outstanding daily check-in) instead of being always-on. */
  hasNotifications?: boolean;
};

/** Secondary quick-jumps that live behind the "⋯" menu. These are useful from any
 *  tab but aren't primary comms (bell/messages) or safety (help), and they're
 *  otherwise buried (reachable from only one screen). Account/settings live on
 *  the Profile screen behind the avatar, so they deliberately stay out of here. */
const MENU: { label: string; icon: keyof typeof Ionicons.glyphMap; route: string }[] = [
  { label: 'Saved', icon: 'bookmark-outline', route: '/favorites' },
  { label: 'Achievements', icon: 'trophy-outline', route: '/achievements' },
  { label: 'Meetings', icon: 'calendar-outline', route: '/meetings' },
  { label: 'Leaderboard', icon: 'podium-outline', route: '/mydata/leaderboard' },
];

/**
 * Global app header used across all tabs for consistency: avatar + greeting on
 * the left; on the right the primary actions stay visible (help / bell / chat)
 * and everything secondary folds into a "⋯" menu.
 */
export function AppHeader({ hasNotifications }: AppHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const { checkins, isNotifDismissed } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const firstName = (authUser?.name?.trim() || authUser?.email?.split('@')[0] || 'there').split(' ')[0];
  // Real unread signal (replaces the always-on dot): today's check-in is still
  // outstanding and its reminder hasn't been dismissed. Callers can still force
  // the dot via the prop.
  const today = todayLocal();
  const checkinOutstanding =
    !checkins.some((c) => c.date === today) && !isNotifDismissed(`checkin-${today}`);
  const showDot = hasNotifications ?? checkinOutstanding;

  const go = (route: string) => {
    setMenuOpen(false);
    router.push(route as never);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <Pressable
          style={styles.left}
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile">
          <Image source={{ uri: authUser?.avatarUrl ?? user.avatar }} style={styles.avatar} />
          <Txt variant="titleSm" color={Colors.white} numberOfLines={1} style={{ flexShrink: 1 }}>
            Hello {firstName} 👋
          </Txt>
        </Pressable>
        <View style={styles.icons}>
          {/* Always-reachable crisis/safety affordance (audit F-H3). Kept the same
              compact size as the other icons, but filled in the orange CTA colour
              (with a solid medkit glyph) so it reads clearly as "get help now"
              instead of blending into the row. */}
          <IconBtn
            name="medkit"
            label="Get help — crisis and support resources"
            emphasis
            onPress={() => router.push('/crisis')}
          />
          <IconBtn
            name="notifications-outline"
            label="Notifications"
            dot={showDot}
            onPress={() => router.push('/notifications')}
          />
          <IconBtn name="chatbubbles-outline" label="Messages" onPress={() => router.push('/feed/messages')} />
          <IconBtn name="ellipsis-horizontal" label="More" onPress={() => setMenuOpen(true)} />
        </View>
      </View>

      {/* Overflow menu: secondary quick-jumps. A light dropdown anchored under the
          icon row; tapping the backdrop or an item closes it. */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuCard, { top: insets.top + 54 }]}>
            {MENU.map((item, i) => (
              <Pressable
                key={item.route}
                style={[styles.menuRow, i < MENU.length - 1 && styles.menuDivider]}
                onPress={() => go(item.route)}
                accessibilityRole="button"
                accessibilityLabel={item.label}>
                <Ionicons name={item.icon} size={20} color={Colors.primary} />
                <Txt variant="bodyMedium" color={Colors.textMain}>
                  {item.label}
                </Txt>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function IconBtn({
  name,
  label,
  dot,
  emphasis,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  dot?: boolean;
  /** Fill the button in the CTA colour to make it stand out (crisis/help). */
  emphasis?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={[styles.iconBtn, emphasis && styles.iconBtnEmphasis]}
      hitSlop={8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Ionicons name={name} size={20} color={Colors.white} />
      {dot ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: Colors.primaryDark },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexShrink: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.blue600 },
  icons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  iconBtnEmphasis: {
    backgroundColor: Colors.orange,
    // A subtle ring so it still reads on lighter backdrops.
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  menuBackdrop: { flex: 1, backgroundColor: 'transparent' },
  menuCard: {
    position: 'absolute',
    right: Spacing.lg,
    minWidth: 200,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    paddingVertical: Spacing.xs,
    ...Shadow.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: Colors.stroke },
});

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { user } from '@/data/content';
import { useAuth } from '@/lib/auth';

export type AppHeaderProps = {
  /** Show the unread dot on the bell. */
  hasNotifications?: boolean;
};

/**
 * Global app header used across all tabs for consistency:
 * avatar + greeting on the left, bell / chat / bookmark on the right.
 */
export function AppHeader({ hasNotifications = true }: AppHeaderProps) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const firstName = (authUser?.name?.trim() || authUser?.email?.split('@')[0] || 'there').split(' ')[0];
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
          {/* Always-reachable crisis/safety affordance (audit F-H3). */}
          <Pressable
            style={styles.help}
            hitSlop={8}
            onPress={() => router.push('/crisis')}
            accessibilityRole="button"
            accessibilityLabel="Get help now — crisis and support resources">
            <Ionicons name="heart" size={14} color={Colors.white} />
            <Txt variant="caption" color={Colors.white}>
              Get help
            </Txt>
          </Pressable>
          <IconBtn
            name="notifications-outline"
            label="Notifications"
            dot={hasNotifications}
            onPress={() => router.push('/notifications')}
          />
          <IconBtn name="chatbubbles-outline" label="Messages" onPress={() => router.push('/feed/messages')} />
          <IconBtn name="bookmark-outline" label="Saved" onPress={() => router.push('/favorites')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function IconBtn({
  name,
  label,
  dot,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  dot?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.iconBtn}
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
  help: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(214,69,69,0.9)',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
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
});

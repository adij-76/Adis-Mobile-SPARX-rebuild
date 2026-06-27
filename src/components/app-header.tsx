import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { user } from '@/data/content';

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
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <Pressable
          style={styles.left}
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile">
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <Txt variant="titleSm" color={Colors.white}>
            Hello {user.name} 👋
          </Txt>
        </Pressable>
        <View style={styles.icons}>
          <IconBtn name="notifications-outline" dot={hasNotifications} onPress={() => router.push('/notifications')} />
          <IconBtn name="chatbubbles-outline" onPress={() => router.push('/feed/messages')} />
          <IconBtn name="bookmark-outline" onPress={() => router.push('/favorites')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function IconBtn({
  name,
  dot,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  dot?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.iconBtn} hitSlop={8} onPress={onPress}>
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
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.blue600 },
  icons: { flexDirection: 'row', gap: Spacing.sm },
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

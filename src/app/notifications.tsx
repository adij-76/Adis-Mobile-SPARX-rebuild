import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/layout/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useStore } from '@/lib/store';

type Notif = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  body: string;
  time: string;
  /** Where tapping this notification takes the user. */
  route: string;
  unread?: boolean;
};

const NOTIFS: Notif[] = [
  { id: 'n1', icon: 'calendar', color: '#166890', title: 'Meeting starting soon', body: 'Your onboarding call starts in 30 minutes.', time: '25m', route: '/meetings', unread: true },
  { id: 'n2', icon: 'flame', color: '#FF9D4B', title: 'Keep your streak alive', body: "You haven't done today's check-in yet.", time: '2h', route: '/(tabs)/data', unread: true },
  { id: 'n3', icon: 'heart', color: '#DF1C41', title: 'Maya liked your post', body: '“Day 30 today. The mornings are finally…”', time: '5h', route: '/(tabs)/community' },
  { id: 'n4', icon: 'school', color: '#38C793', title: 'New workshop available', body: 'A fresh workshop just landed — explore the latest.', time: '1d', route: '/workshop/list' },
  { id: 'n5', icon: 'trophy', color: '#C7D66D', title: 'You moved up the leaderboard', body: "You're now #3 this week. Nice work!", time: '2d', route: '/mydata/leaderboard' },
];

export default function Notifications() {
  const router = useRouter();
  const { isNotifRead, markNotifRead, markAllNotifsRead } = useStore();
  const anyUnread = NOTIFS.some((n) => n.unread && !isNotifRead(n.id));

  const open = (n: Notif) => {
    markNotifRead(n.id);
    router.push(n.route as never);
  };

  return (
    <Screen variant="modal" style={styles.safe}>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Notifications" />
      <FlatList
        data={NOTIFS}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          anyUnread ? (
            <Pressable
              style={styles.markAll}
              onPress={() => markAllNotifsRead(NOTIFS.map((n) => n.id))}>
              <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
              <Txt variant="bodySmMedium" color={Colors.primary}>
                Mark all as read
              </Txt>
            </Pressable>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item }) => {
          const unread = !!item.unread && !isNotifRead(item.id);
          return (
            <Pressable
              style={[styles.row, unread && styles.unread]}
              onPress={() => open(item)}>
              <View style={[styles.icon, { backgroundColor: `${item.color}22` }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="bodySmBold">{item.title}</Txt>
                <Txt variant="bodySm" color={Colors.textSub} numberOfLines={2}>
                  {item.body}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Txt variant="caption" color={Colors.textSub}>
                  {item.time}
                </Txt>
                {unread ? <View style={styles.dot} /> : <Ionicons name="chevron-forward" size={16} color={Colors.textSub} />}
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  list: { padding: Spacing.lg },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  unread: { borderColor: Colors.highlightBorder, backgroundColor: Colors.highlight },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.orange },
});

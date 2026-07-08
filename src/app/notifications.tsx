import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Screen } from '@/components/layout/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/lib/auth';
import { todayLocal } from '@/lib/checkin';
import { deviceTz, formatOccurrence, joinOpen, nextOccurrence, parseMeetLengthMin } from '@/lib/groups';
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

/** Compact "time until" label for the right column ("25m", "3h", "2d", "now"). */
function compactUntil(inst: Date): string {
  const ms = inst.getTime() - Date.now();
  if (ms <= 0) return 'now';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export default function Notifications() {
  const router = useRouter();
  const { user } = useAuth();
  const userTz = user?.timeZone || deviceTz();
  const { checkins, isNotifRead, markNotifRead, markAllNotifsRead, isNotifDismissed, dismissNotif, clearNotifs } =
    useStore();
  const groups = useAsync(() => api.groups.list(), []).data ?? [];

  // Real meeting reminders: the next occurrence of each signed-up group, soonest
  // first. "Unread" (highlighted) when it's within 24h; a live meeting says join.
  const meetingNotifs = useMemo<Notif[]>(() => {
    const now = Date.now();
    return groups
      .filter((g) => g.signedUp)
      .map((g) => {
        const lengthMin = parseMeetLengthMin(g.meetLengthChar);
        const inst = nextOccurrence({
          meetDay: g.meetDay,
          title: g.title,
          meetTimeChar: g.meetTimeChar,
          lengthMin,
          sourceTz: g.sourceTz,
        });
        return inst ? { g, inst, lengthMin } : null;
      })
      .filter((x): x is { g: (typeof groups)[number]; inst: Date; lengthMin: number } => !!x)
      .sort((a, b) => a.inst.getTime() - b.inst.getTime())
      .map(({ g, inst, lengthMin }) => {
        const live = joinOpen(inst, lengthMin);
        const when = formatOccurrence(inst, userTz);
        const soon = inst.getTime() - now < 24 * 3600 * 1000;
        return {
          // Occurrence-dated so dismissing this week's reminder doesn't hide the
          // next one for a recurring group.
          id: `mtg-${g.id}-${inst.toISOString().slice(0, 10)}`,
          icon: 'calendar' as const,
          color: '#166890',
          title: live ? `${g.title} is live now` : g.title,
          body: live
            ? `With ${g.coachName} — tap to join on Zoom.`
            : `With ${g.coachName} · ${when.full}`,
          time: compactUntil(inst),
          route: '/meetings',
          unread: live || soon,
        } satisfies Notif;
      });
  }, [groups, userTz]);

  // A REAL, derived reminder — shown only when today's check-in isn't done yet.
  // Date-scoped id so dismissing today's doesn't suppress tomorrow's.
  const today = todayLocal();
  const checkinReminder = useMemo<Notif[]>(() => {
    if (checkins.some((c) => c.date === today)) return [];
    return [
      {
        id: `checkin-${today}`,
        icon: 'flame',
        color: '#FF9D4B',
        title: 'Keep your streak alive',
        body: "You haven't done today's check-in yet.",
        time: 'today',
        route: '/checkin',
        unread: true,
      },
    ];
  }, [checkins, today]);

  // Dismissed notifications are filtered out entirely (cleared → gone).
  const notifs = useMemo(
    () => [...checkinReminder, ...meetingNotifs].filter((n) => !isNotifDismissed(n.id)),
    [checkinReminder, meetingNotifs, isNotifDismissed],
  );
  const anyUnread = notifs.some((n) => n.unread && !isNotifRead(n.id));

  const open = (n: Notif) => {
    markNotifRead(n.id);
    router.push(n.route as never);
  };

  return (
    <Screen variant="modal" style={styles.safe}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Back" largeTitle="Notifications" />
        <FlatList
          data={notifs}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            notifs.length ? (
              <View style={styles.actions}>
                {anyUnread ? (
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => markAllNotifsRead(notifs.map((n) => n.id))}
                    accessibilityRole="button"
                    accessibilityLabel="Mark all as read">
                    <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
                    <Txt variant="bodySmMedium" color={Colors.primary}>
                      Mark all read
                    </Txt>
                  </Pressable>
                ) : (
                  <View />
                )}
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => clearNotifs(notifs.map((n) => n.id))}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all notifications">
                  <Ionicons name="trash-outline" size={16} color={Colors.textSub} />
                  <Txt variant="bodySmMedium" color={Colors.textSub}>
                    Clear all
                  </Txt>
                </Pressable>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={32} color={Colors.textSub} />
              <Txt variant="bodyMedium" color={Colors.textMain} center style={{ marginTop: Spacing.md }}>
                You're all caught up
              </Txt>
              <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: 4 }}>
                New reminders and updates will show up here.
              </Txt>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          renderItem={({ item }) => {
            const unread = !!item.unread && !isNotifRead(item.id);
            return (
              <Pressable style={[styles.row, unread && styles.unread]} onPress={() => open(item)}>
                <View style={[styles.icon, { backgroundColor: `${item.color}22` }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="bodySmBold" numberOfLines={2}>
                    {item.title}
                  </Txt>
                  <Txt variant="bodySm" color={Colors.textSub} numberOfLines={2}>
                    {item.body}
                  </Txt>
                  <Txt variant="caption" color={Colors.textSub}>
                    {item.time}
                  </Txt>
                </View>
                <View style={styles.rowRight}>
                  {unread ? <View style={styles.dot} /> : null}
                  <Pressable
                    onPress={() => dismissNotif(item.id)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss notification">
                    <Ionicons name="close" size={18} color={Colors.textSub} />
                  </Pressable>
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
  rowRight: { alignItems: 'center', gap: Spacing.sm, paddingLeft: Spacing.xs },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  empty: { alignItems: 'center', paddingTop: 48 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.orange },
});

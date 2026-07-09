import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, type Connection } from '@/api';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useOnline } from '@/lib/presence';
import { useStore } from '@/lib/store';

export type UserProfileTarget = {
  /** Production users.id — needed for stats + messaging. Null for seed authors. */
  userId: string | null;
  name: string;
  avatar: string;
};

type Stats = { rank: number | null; streak: number | null };

/**
 * A tap-a-member quick profile: avatar, name, live-online status, public stats
 * (streak + weekly rank — the same data the leaderboard already makes public;
 * NO clinical info), and Message / Block actions. Reachable from post authors
 * and other member touchpoints.
 */
export function UserProfileSheet({
  target,
  onClose,
}: {
  target: UserProfileTarget | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { blockAuthor } = useStore();
  const online = useOnline(target?.userId ?? null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  // undefined = still loading; null = no connection yet.
  const [conn, setConn] = useState<Connection | null | undefined>(undefined);
  const [connBusy, setConnBusy] = useState(false);

  const userId = target?.userId ?? null;
  useEffect(() => {
    if (!userId) {
      setStats(null);
      setConn(undefined);
      return;
    }
    let alive = true;
    setLoading(true);
    setConn(undefined);
    // Reuse the public leaderboards (no clinical data): weekly points → rank,
    // all-time streak board → streak length. Absent = user has no ranked
    // activity yet, so we just omit that stat. Also load our connection state.
    Promise.all([
      api.insights.leaderboard('points', 'week').catch(() => []),
      api.insights.leaderboard('streak', 'all').catch(() => []),
      api.connections.list().catch(() => []),
    ])
      .then(([points, streaks, conns]) => {
        if (!alive) return;
        const rank = points.find((e) => e.id === userId)?.rank ?? null;
        const streak = streaks.find((e) => e.id === userId)?.points ?? null;
        setStats({ rank, streak });
        setConn(conns.find((c) => c.userId === userId) ?? null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId]);

  const connect = async () => {
    if (!userId || connBusy) return;
    setConnBusy(true);
    try {
      await api.connections.request(userId);
      setConn({ id: 'pending', status: 'pending', direction: 'outgoing', userId, name: target!.name, avatar: target!.avatar, createdAt: null });
    } catch {
      /* leave the button so they can retry */
    } finally {
      setConnBusy(false);
    }
  };

  const acceptConn = async () => {
    if (!conn || connBusy) return;
    setConnBusy(true);
    try {
      await api.connections.respond(conn.id, true);
      setConn({ ...conn, status: 'accepted' });
    } catch {
      /* ignore */
    } finally {
      setConnBusy(false);
    }
  };

  const message = () => {
    if (!userId || !target) return; // no id → can't DM (seed/legacy author); button disabled
    const { name, avatar } = target;
    onClose();
    // Open the thread addressed to this member; the chat screen finds-or-creates
    // the 1:1 conversation from `peer`, so it never dead-ends on the list.
    router.push(
      `/feed/chat?peer=${userId}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`,
    );
  };

  const block = () => {
    if (target) blockAuthor(target.name);
    onClose();
  };

  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetWrap} onPress={(e) => e.stopPropagation?.()}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              {target ? (
                <>
                  <View style={styles.avatarWrap}>
                    <Avatar uri={target.avatar} name={target.name} size={72} />
                    {online ? <View style={styles.onlineDot} /> : null}
                  </View>
                  <Txt variant="titleSm" center>
                    {target.name}
                  </Txt>
                  {online ? (
                    <View style={styles.onlineRow}>
                      <View style={styles.onlineDotSm} />
                      <Txt variant="caption" color={Colors.success}>
                        Online now
                      </Txt>
                    </View>
                  ) : null}

                  {loading ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
                  ) : stats && (stats.streak != null || stats.rank != null) ? (
                    <View style={styles.stats}>
                      {stats.streak != null ? (
                        <Stat icon="flame" color={Colors.orange} label="day streak" value={String(stats.streak)} />
                      ) : null}
                      {stats.rank != null ? (
                        <Stat icon="trophy" color={Colors.primary} label="this week" value={`#${stats.rank}`} />
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.actions}>
                    {conn?.status === 'accepted' ? (
                      <View style={styles.connected}>
                        <Ionicons name="people" size={18} color={Colors.success} />
                        <Txt variant="bodySmMedium" color={Colors.success}>
                          Connected
                        </Txt>
                      </View>
                    ) : conn?.status === 'pending' && conn.direction === 'incoming' ? (
                      <Button title="Accept connection" variant="primary" iconLeft="person-add-outline" loading={connBusy} onPress={acceptConn} />
                    ) : conn?.status === 'pending' && conn.direction === 'outgoing' ? (
                      <Button title="Request sent" variant="outline" iconLeft="hourglass-outline" disabled onPress={() => {}} />
                    ) : conn === undefined ? null : (
                      <Button title="Connect" variant="primary" iconLeft="person-add-outline" loading={connBusy} onPress={connect} />
                    )}
                    <Button title="Message" variant={conn?.status === 'accepted' ? 'primary' : 'outline'} iconLeft="chatbubble-ellipses-outline" disabled={!userId} onPress={message} />
                    <Button title="Block" variant="ghost" iconLeft="ban-outline" onPress={block} />
                  </View>
                </>
              ) : null}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Stat({ icon, color, label, value }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={22} color={color} />
      <Txt variant="titleSm">{value}</Txt>
      <Txt variant="caption" color={Colors.textSub}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.stroke, marginBottom: Spacing.md },
  avatarWrap: { position: 'relative' },
  onlineDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDotSm: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  stats: { flexDirection: 'row', gap: Spacing.xl, marginVertical: Spacing.md },
  stat: { alignItems: 'center', gap: 2 },
  actions: { alignSelf: 'stretch', gap: Spacing.sm },
  connected: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm },
});

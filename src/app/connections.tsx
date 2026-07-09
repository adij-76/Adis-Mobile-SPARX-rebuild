import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, type Connection } from '@/api';
import { AsyncBoundary } from '@/components/ui/async-boundary';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';

/** Member connections ("allies"): accept incoming requests, see who you're
 *  connected with, and message them. */
export default function Connections() {
  const router = useRouter();
  const query = useAsync(() => api.connections.list(), []);
  // Optimistic status overrides so a row updates instantly on accept/decline.
  const [overrides, setOverrides] = useState<Record<string, Connection['status']>>({});

  const respond = async (c: Connection, accept: boolean) => {
    setOverrides((o) => ({ ...o, [c.id]: accept ? 'accepted' : 'declined' }));
    await api.connections.respond(c.id, accept).catch(() => {
      setOverrides((o) => ({ ...o, [c.id]: 'pending' })); // revert on failure
    });
  };

  const message = (c: Connection) => {
    // The chat screen finds-or-creates the 1:1 thread from `peer`.
    router.push(
      `/feed/chat?peer=${c.userId}&name=${encodeURIComponent(c.name)}&avatar=${encodeURIComponent(c.avatar)}`,
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle="Connections" />
      <AsyncBoundary
        query={query}
        errorLabel="your connections"
        empty={{
          icon: 'people-outline',
          text: 'No connections yet. Tap a member’s name in the community to send a connection request.',
        }}>
        {(all: Connection[]) => {
          const withStatus = all.map((c) => ({ ...c, status: overrides[c.id] ?? c.status }));
          const incoming = withStatus.filter((c) => c.direction === 'incoming' && c.status === 'pending');
          const allies = withStatus.filter((c) => c.status === 'accepted');
          const outgoing = withStatus.filter((c) => c.direction === 'outgoing' && c.status === 'pending');

          return (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              {incoming.length > 0 && (
                <Section title="Requests">
                  {incoming.map((c) => (
                    <Row key={c.id} c={c}>
                      <Button title="Accept" variant="primary" fullWidth={false} onPress={() => respond(c, true)} />
                      <Button title="Decline" variant="ghost" fullWidth={false} onPress={() => respond(c, false)} />
                    </Row>
                  ))}
                </Section>
              )}

              <Section title={`Allies${allies.length ? ` (${allies.length})` : ''}`}>
                {allies.length === 0 ? (
                  <Txt variant="bodySm" color={Colors.textSub}>
                    Accepted connections show up here.
                  </Txt>
                ) : (
                  allies.map((c) => (
                    <Row key={c.id} c={c}>
                      <Button title="Message" variant="outline" fullWidth={false} onPress={() => message(c)} />
                    </Row>
                  ))
                )}
              </Section>

              {outgoing.length > 0 && (
                <Section title="Pending">
                  {outgoing.map((c) => (
                    <Row key={c.id} c={c}>
                      <View style={styles.pending}>
                        <Ionicons name="hourglass-outline" size={16} color={Colors.textSub} />
                        <Txt variant="caption" color={Colors.textSub}>
                          Requested
                        </Txt>
                      </View>
                    </Row>
                  ))}
                </Section>
              )}
            </ScrollView>
          );
        }}
      </AsyncBoundary>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Spacing.sm }}>
      <Txt variant="bodySmBold" color={Colors.textSub}>
        {title.toUpperCase()}
      </Txt>
      {children}
    </View>
  );
}

function Row({ c, children }: { c: Connection; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Avatar uri={c.avatar} name={c.name} size={40} />
      <Txt variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
        {c.name}
      </Txt>
      <View style={styles.rowActions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

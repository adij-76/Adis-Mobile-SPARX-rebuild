import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { GroupCard } from '@/components/ui/group-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/lib/auth';
import { deviceTz, nextOccurrence, parseMeetLengthMin } from '@/lib/groups';

export default function BookGroup() {
  const { user } = useAuth();
  const userTz = user?.timeZone || deviceTz();
  const { data, loading, error, reload } = useAsync(() => api.groups.list(), []);
  // Optimistic sign-up overrides so the card flips instantly before the refetch.
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useFocusEffect(useCallback(() => void reload(), [])); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const base = (data ?? []).map((g) =>
      override[g.id] != null ? { ...g, signedUp: override[g.id] } : g,
    );
    // Sort by next occurrence (soonest first); groups without a parseable time last.
    const next = (g: (typeof base)[number]) =>
      nextOccurrence({
        meetDay: g.meetDay,
        title: g.title,
        meetTimeChar: g.meetTimeChar,
        lengthMin: parseMeetLengthMin(g.meetLengthChar),
        sourceTz: g.sourceTz,
      })?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return [...base].sort((a, b) => next(a) - next(b));
  }, [data, override]);

  const toggle = (id: string, on: boolean) => {
    setOverride((o) => ({ ...o, [id]: on }));
    setBusy((b) => ({ ...b, [id]: true }));
    api.groups
      .setSignup(id, on, user?.appUserId ?? null)
      .catch(() => setOverride((o) => ({ ...o, [id]: !on }))) // revert on failure
      .finally(() => {
        setBusy((b) => ({ ...b, [id]: false }));
        reload();
      });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle="Book a group" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Txt variant="body" color={Colors.textSub}>
          Live coaching groups you can join. Times are shown in your time zone. Sign up and the Zoom
          link appears about an hour before it starts.
        </Txt>

        {error && !data ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={44} color={Colors.strokeStrong} />
            <Txt variant="bodyMedium" center>
              Couldn&apos;t load groups
            </Txt>
            <Txt variant="bodySm" color={Colors.textSub} center>
              {error.message}
            </Txt>
            <Button title="Try again" variant="outline" onPress={reload} />
          </View>
        ) : loading && !data ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
        ) : groups.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={44} color={Colors.strokeStrong} />
            <Txt variant="bodyMedium" center>
              No groups available yet
            </Txt>
            <Txt variant="bodySm" color={Colors.textSub} center>
              Your plan doesn&apos;t include any coaching groups right now. Check your subscription or
              reach out to your coach.
            </Txt>
          </View>
        ) : (
          groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              userTz={userTz}
              busy={busy[g.id]}
              onToggleSignup={(on) => toggle(g.id, on)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  empty: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.xxl * 2, paddingHorizontal: Spacing.lg },
});

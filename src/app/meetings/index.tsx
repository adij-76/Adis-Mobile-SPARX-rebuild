import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { AsyncBoundary } from '@/components/ui/async-boundary';
import { GroupCard } from '@/components/ui/group-card';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { type MeetingStatus } from '@/data/content';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/lib/auth';
import { useGoBack } from '@/hooks/use-go-back';
import { deviceTz, nextOccurrence, parseMeetLengthMin } from '@/lib/groups';

const TABS: { key: MeetingStatus; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'canceled', label: 'Canceled' },
];

const EMPTY_COPY: Record<MeetingStatus, string> = {
  upcoming: "You haven't signed up for any groups yet. Tap Book a group to join one.",
  past: 'Your past sessions will show up here.',
  canceled: 'Groups you cancel will show up here.',
};

export default function ManageMeetings() {
  const goBack = useGoBack();
  const { user } = useAuth();
  const userTz = user?.timeZone || deviceTz();
  const params = useLocalSearchParams<{ tab?: MeetingStatus }>();
  const [tab, setTab] = useState<MeetingStatus>(params.tab ?? 'upcoming');

  const groupsQuery = useAsync(() => api.groups.list(), []);
  const groupData = groupsQuery.data;
  const reloadGroups = groupsQuery.reload;
  useFocusEffect(useCallback(() => void reloadGroups(), [])); // eslint-disable-line react-hooks/exhaustive-deps

  // Signed-up groups, soonest occurrence first. (Past/Canceled aren't tracked for
  // recurring groups yet, so those tabs are honestly empty — no placeholders.)
  const myGroups = useMemo(() => {
    const next = (g: NonNullable<typeof groupData>[number]) =>
      nextOccurrence({
        meetDay: g.meetDay,
        title: g.title,
        meetTimeChar: g.meetTimeChar,
        lengthMin: parseMeetLengthMin(g.meetLengthChar),
        sourceTz: g.sourceTz,
      })?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return (groupData ?? []).filter((g) => g.signedUp).sort((a, b) => next(a) - next(b));
  }, [groupData]);

  const cancelGroup = (id: string) => {
    api.groups.setSignup(id, false, user?.appUserId ?? null).catch(() => {}).finally(() => reloadGroups());
  };

  const data = tab === 'upcoming' ? myGroups : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
          <Txt variant="bodyMedium">Back</Txt>
        </Pressable>
        <Txt variant="titleLg">Manage meetings</Txt>
      </View>

      <View style={styles.segment}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}>
              <Txt variant="bodySmMedium" color={active ? Colors.white : Colors.textSub}>
                {t.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <AsyncBoundary query={groupsQuery} errorLabel="your groups">
        {() => (
          <FlatList
            data={data}
            keyExtractor={(g) => g.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
            ListEmptyComponent={
              <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: Spacing.xxl, paddingHorizontal: Spacing.lg }}>
                {EMPTY_COPY[tab]}
              </Txt>
            }
            renderItem={({ item }) => (
              <GroupCard
                group={item}
                userTz={userTz}
                onToggleSignup={(on) => !on && cancelGroup(item.id)}
              />
            )}
          />
        )}
      </AsyncBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  segment: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.soft,
  },
  segmentItemActive: { backgroundColor: Colors.primary },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, flexGrow: 1 },
});

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { meetings, type MeetingStatus } from '@/data/content';
import { useStore } from '@/lib/store';

const TABS: { key: MeetingStatus; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'canceled', label: 'Canceled' },
];

export default function ManageMeetings() {
  const router = useRouter();
  const { bookings, isBooked } = useStore();
  const params = useLocalSearchParams<{ tab?: MeetingStatus }>();
  const [tab, setTab] = useState<MeetingStatus>(params.tab ?? 'upcoming');

  // Booked sessions show at the top of Upcoming.
  const data =
    tab === 'upcoming'
      ? [...bookings, ...meetings.filter((m) => m.status === 'upcoming')]
      : meetings.filter((m) => m.status === tab);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
          <Txt variant="bodyMedium">Back</Txt>
        </Pressable>
        <Txt variant="titleLg">Manage meeting</Txt>
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

      <FlatList
        data={data}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: Spacing.xxl }}>
            No {tab} meetings.
          </Txt>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(`/meetings/${item.id}`)}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={16} color={Colors.white} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.metaRow}>
                <Txt variant="bodySmBold" color={Colors.primary}>
                  {item.time}
                </Txt>
                {item.startsIn && (
                  <Txt variant="caption" color={Colors.orange}>
                    ⏱ {item.startsIn}
                  </Txt>
                )}
              </View>
              <Txt variant="bodyMedium">{item.title}</Txt>
              <Txt variant="caption" color={Colors.primary}>
                Meeting with {item.host}
              </Txt>
              {(item.id.startsWith('b') || isBooked(item.id)) && (
                <Txt variant="caption" color={Colors.success}>
                  ✓ Booked
                </Txt>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSub} />
          </Pressable>
        )}
      />
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
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  divider: { height: 1, backgroundColor: Colors.stroke, marginVertical: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});

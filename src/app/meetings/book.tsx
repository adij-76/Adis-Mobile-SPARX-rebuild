import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/api';
import { useAsync } from '@/hooks/use-async';
import { useStore } from '@/lib/store';

const DAYS = [
  { key: 'mon', d: 'Mon', n: '22' },
  { key: 'tue', d: 'Tue', n: '23' },
  { key: 'wed', d: 'Wed', n: '24' },
  { key: 'thu', d: 'Thu', n: '25' },
  { key: 'fri', d: 'Fri', n: '26' },
];
const SLOTS = ['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM'];

export default function BookMeeting() {
  const router = useRouter();
  const { addBooking } = useStore();
  const { paid } = useLocalSearchParams<{ paid?: string }>();
  const isPaid = paid === '1';
  const [day, setDay] = useState('wed');
  const [slot, setSlot] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const coach = useAsync(() => api.meetings.coach(), []).data;

  const confirm = () => {
    if (!coach) return;
    const d = DAYS.find((x) => x.key === day);
    addBooking({
      id: `b${Date.now()}`,
      time: `${d?.d} ${d?.n} July · ${slot}`,
      date: `${d?.d} ${d?.n} July, 2024`,
      title: isPaid ? '1:1 Coaching session' : 'Group coaching session',
      host: 'SPARx Coach',
      status: 'upcoming',
      description:
        "Your booked session. You'll get a Zoom link and a reminder before it starts.",
      via: 'Video Meeting via Zoom call',
      coach,
    });
    setDone(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle={isPaid ? 'Book a group (Paid)' : 'Book a group'} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Txt variant="body" color={Colors.textSub}>
          Pick a day and time that works for you. You&apos;ll get a Zoom link and a reminder before
          the session.
        </Txt>

        <Txt variant="titleSm">Select a day</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {DAYS.map((d) => {
            const active = d.key === day;
            return (
              <Pressable
                key={d.key}
                onPress={() => setDay(d.key)}
                style={[styles.dayChip, active && styles.dayChipActive]}>
                <Txt variant="caption" color={active ? Colors.white : Colors.textSub}>
                  {d.d}
                </Txt>
                <Txt variant="titleSm" color={active ? Colors.white : Colors.textMain}>
                  {d.n}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        <Txt variant="titleSm">Available times</Txt>
        <View style={styles.slots}>
          {SLOTS.map((s) => {
            const active = s === slot;
            return (
              <Pressable
                key={s}
                onPress={() => setSlot(s)}
                style={[styles.slot, active && styles.slotActive]}>
                <Txt variant="bodySmMedium" color={active ? Colors.white : Colors.textMain}>
                  {s}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        {isPaid && (
          <View style={styles.priceCard}>
            <Txt variant="bodyMedium">Session fee</Txt>
            <Txt variant="title" color={Colors.primary}>
              $49.00
            </Txt>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isPaid ? 'Pay & Book' : 'Book session'}
          variant="primary"
          disabled={!slot}
          onPress={confirm}
        />
      </View>

      <Modal visible={done} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.icon}>
              <Ionicons name="checkmark" size={36} color={Colors.white} />
            </View>
            <Txt variant="title" center>
              You&apos;re booked!
            </Txt>
            <Txt variant="bodySm" color={Colors.textSub} center>
              Your session is confirmed for {DAYS.find((d) => d.key === day)?.d} at {slot}. Check
              your upcoming meetings for details.
            </Txt>
            <Button
              title="Done"
              variant="primary"
              onPress={() => {
                setDone(false);
                router.dismissTo('/meetings');
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  chipRow: { gap: Spacing.sm, paddingVertical: 2 },
  dayChip: {
    width: 56,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    alignItems: 'center',
    gap: 2,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  slot: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  slotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  footer: { padding: Spacing.lg },
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
});

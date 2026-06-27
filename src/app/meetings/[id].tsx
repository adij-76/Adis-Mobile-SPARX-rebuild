import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { meetings } from '@/data/content';

export default function MeetingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booked, setBooked] = useState(false);

  const meeting = meetings.find((m) => m.id === id) ?? meetings[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        <Txt variant="titleLg">{meeting.title}</Txt>
        <Txt variant="body" color={Colors.textSub}>
          {meeting.description}
        </Txt>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <View>
            <Txt variant="bodySmBold" color={Colors.primary}>
              {meeting.time}
            </Txt>
            {meeting.date && <Txt variant="bodyMedium">{meeting.date}</Txt>}
          </View>
        </View>
        <View style={styles.separator} />

        <View style={styles.infoRow}>
          <Ionicons name="videocam" size={20} color={Colors.primary} />
          <Txt variant="bodyMedium" color={Colors.textSub}>
            {meeting.via}
          </Txt>
        </View>
        <View style={styles.separator} />

        <Txt variant="title">About coach</Txt>
        <View style={styles.coachRow}>
          <Image source={{ uri: meeting.coach.avatar }} style={styles.coachAvatar} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodySmBold">{meeting.coach.name}</Txt>
            <Txt variant="caption" color={Colors.textSub}>
              {meeting.coach.role}
            </Txt>
          </View>
        </View>
        <Txt variant="body" color={Colors.textSub}>
          {meeting.coach.bio}
        </Txt>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Book Meeting" variant="primary" onPress={() => setBooked(true)} />
      </View>

      <Modal visible={booked} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="checkmark" size={36} color={Colors.white} />
            </View>
            <Txt variant="title" center>
              Meeting booked!
            </Txt>
            <Txt variant="bodySm" color={Colors.textSub} center>
              You&apos;ll get a reminder before it starts. See it under your upcoming meetings.
            </Txt>
            <Button
              title="Done"
              variant="primary"
              onPress={() => {
                setBooked(false);
                router.back();
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
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  separator: { height: 1, backgroundColor: Colors.stroke },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  coachAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.soft },
  footer: { padding: Spacing.lg },
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';

// 1:1 sessions are scheduled + paid (Stripe) through Acuity — one scheduling
// page where the user picks the coach + time. So the coach cards below are
// informational and a single CTA opens the scheduler.
const ACUITY_URL = 'https://app.acuityscheduling.com/schedule/566decb5/?categories[]=Sparx%20Sessions';

type CoachInfo = { name: string; role: string; blurb: string };

const COACHES: CoachInfo[] = [
  {
    name: 'Adi Jaffe',
    role: 'Founder · Recovery & Hypnosis',
    blurb: 'Deep-dive 1:1s on the psychology of change, cravings, and building a life you don’t want to escape.',
  },
  {
    name: 'Fred',
    role: 'Hero Code Coach',
    blurb: 'Accountability and structure — work the Hero Code levels one-on-one and stay on track.',
  },
  {
    name: 'Belle',
    role: 'Mindfulness & Gratitude',
    blurb: 'Grounding, meditation, and gratitude practices tailored to where you are right now.',
  },
  {
    name: 'Christine',
    role: 'Recovery Coach',
    blurb: 'A supportive space to talk through challenges and set your next concrete steps.',
  },
];

export default function BookCoach() {
  // Pull coach avatars from the groups (coach resolved via sds_user_id → users)
  // where the name matches; the Avatar falls back to initials otherwise.
  const groups = useAsync(() => api.groups.list(), []).data ?? [];
  const avatarFor = (name: string) =>
    groups.find((g) => g.coachName.trim().toLowerCase() === name.toLowerCase())?.coachAvatar || '';

  const book = () => {
    if (/^https?:\/\//i.test(ACUITY_URL)) Linking.openURL(ACUITY_URL);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" largeTitle="Book a 1:1 session" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Txt variant="body" color={Colors.textSub}>
          Private one-on-one coaching. Book a session and you’ll pick your coach and a time on the next
          screen — scheduling and payment are handled securely through our scheduler.
        </Txt>

        <Txt variant="titleSm">Your coaches</Txt>
        {COACHES.map((c) => (
          <View key={c.name} style={styles.card}>
            <View style={styles.head}>
              <Avatar uri={avatarFor(c.name)} name={c.name} size={52} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyMedium">{c.name}</Txt>
                <Txt variant="caption" color={Colors.primary}>
                  {c.role}
                </Txt>
              </View>
            </View>
            <Txt variant="bodySm" color={Colors.textSub}>
              {c.blurb}
            </Txt>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Book a session" variant="primary" iconLeft="calendar" onPress={book} />
        <View style={styles.secure}>
          <Ionicons name="lock-closed" size={12} color={Colors.textSub} />
          <Txt variant="caption" color={Colors.textSub}>
            Secure scheduling & payment via Acuity
          </Txt>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.md },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  footer: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.stroke,
    backgroundColor: Colors.white,
  },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
});

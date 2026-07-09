import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  formatOccurrence,
  joinOpen,
  nextOccurrence,
  parseMeetLengthMin,
  untilLabel,
} from '@/lib/groups';
import type { Group } from '@/api';

export type GroupCardProps = {
  group: Group;
  /** The viewer's IANA time zone — schedule is shown in this zone. */
  userTz: string;
  onToggleSignup: (on: boolean) => void;
  busy?: boolean;
};

/** A coaching group: coach, next occurrence in the viewer's zone, sign-up, and
 *  (once signed up, within ~1h of start) the Zoom join button. */
export function GroupCard({ group, userTz, onToggleSignup, busy }: GroupCardProps) {
  const lengthMin = parseMeetLengthMin(group.meetLengthChar);
  const inst = nextOccurrence({
    meetDay: group.meetDay,
    title: group.title,
    meetTimeChar: group.meetTimeChar,
    lengthMin,
    sourceTz: group.sourceTz,
  });
  const when = inst ? formatOccurrence(inst, userTz) : null;
  const canJoin = !!inst && group.signedUp && !!group.joinUrl && joinOpen(inst, lengthMin);

  const join = () => {
    const url = group.joinUrl;
    if (url && /^https?:\/\//i.test(url)) Linking.openURL(url);
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Avatar uri={group.coachAvatar} name={group.coachName} size={44} />
        <View style={{ flex: 1 }}>
          <Txt variant="bodyMedium" numberOfLines={2}>
            {group.title}
          </Txt>
          <Txt variant="caption" color={Colors.textSub}>
            with {group.coachName}
          </Txt>
        </View>
      </View>

      <View style={styles.when}>
        <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
        {when ? (
          <Txt variant="bodySmMedium" color={Colors.primary}>
            {when.full}
            <Txt variant="caption" color={Colors.textSub}>
              {'  '}· {untilLabel(inst as Date)}
            </Txt>
          </Txt>
        ) : (
          <Txt variant="bodySmMedium" color={Colors.textSub}>
            {group.meetDay || 'Weekly'} · {group.meetTimeChar}
          </Txt>
        )}
      </View>

      {group.description ? (
        <Txt variant="bodySm" color={Colors.textSub} numberOfLines={3}>
          {group.description}
        </Txt>
      ) : null}

      {group.signedUp ? (
        <View style={{ gap: Spacing.sm }}>
          {canJoin ? (
            <Pressable style={styles.joinBtn} onPress={join}>
              <Ionicons name="videocam" size={18} color={Colors.white} />
              <Txt variant="bodyMedium" color={Colors.white}>
                Join Zoom
              </Txt>
            </Pressable>
          ) : (
            <View style={styles.hint}>
              <Ionicons name="lock-closed-outline" size={14} color={Colors.textSub} />
              <Txt variant="caption" color={Colors.textSub}>
                Join link opens about an hour before the meeting.
              </Txt>
            </View>
          )}
          <View style={styles.signedRow}>
            <View style={styles.signedTag}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Txt variant="caption" color={Colors.success}>
                Signed up
              </Txt>
            </View>
            <Pressable onPress={() => onToggleSignup(false)} disabled={busy} hitSlop={8}>
              <Txt variant="caption" color={Colors.textSub}>
                Cancel
              </Txt>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={[styles.signupBtn, busy && { opacity: 0.6 }]}
          onPress={() => onToggleSignup(true)}
          disabled={busy}>
          <Txt variant="bodyMedium" color={Colors.white}>
            Sign up
          </Txt>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  when: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  signedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  signedTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signupBtn: {
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

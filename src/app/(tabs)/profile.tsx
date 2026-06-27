import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { user } from '@/data/content';

type Stat = { label: string; value: string };
const STATS: Stat[] = [
  { label: 'Workshops', value: '12' },
  { label: 'Day streak', value: '6' },
  { label: 'Points', value: '480' },
];

type Row = { icon: keyof typeof Ionicons.glyphMap; label: string; danger?: boolean };
const ROWS: Row[] = [
  { icon: 'person-outline', label: 'Account' },
  { icon: 'notifications-outline', label: 'Notifications' },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Security' },
  { icon: 'card-outline', label: 'Subscription' },
  { icon: 'help-circle-outline', label: 'Help & Support' },
  { icon: 'log-out-outline', label: 'Log out', danger: true },
];

export default function ProfileScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <Txt variant="title" color={Colors.white}>
            {user.name} Joseph
          </Txt>
          <Txt variant="bodySm" color={Colors.textMutedOnDark}>
            okei@example.com
          </Txt>
          <Pressable style={styles.editBtn}>
            <Ionicons name="create-outline" size={16} color={Colors.white} />
            <Txt variant="bodySmMedium" color={Colors.white}>
              Edit profile
            </Txt>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Card style={styles.stats}>
          {STATS.map((s, i) => (
            <View key={s.label} style={[styles.stat, i < STATS.length - 1 && styles.statDivider]}>
              <Txt variant="titleLg" color={Colors.primary}>
                {s.value}
              </Txt>
              <Txt variant="caption" color={Colors.textSub}>
                {s.label}
              </Txt>
            </View>
          ))}
        </Card>

        <Card padded={false} style={styles.list}>
          {ROWS.map((r, i) => (
            <Pressable
              key={r.label}
              style={({ pressed }) => [
                styles.row,
                i < ROWS.length - 1 && styles.rowDivider,
                pressed && { backgroundColor: Colors.screen },
              ]}>
              <Ionicons
                name={r.icon}
                size={22}
                color={r.danger ? Colors.danger : Colors.primary}
              />
              <Txt
                variant="bodyMedium"
                color={r.danger ? Colors.danger : Colors.textMain}
                style={{ flex: 1 }}>
                {r.label}
              </Txt>
              {!r.danger && (
                <Ionicons name="chevron-forward" size={18} color={Colors.textSub} />
              )}
            </Pressable>
          ))}
        </Card>

        <Txt variant="caption" color={Colors.textSub} center>
          IGNTD · v1.0.0
        </Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  headerSafe: { backgroundColor: Colors.primaryDark },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.blue600,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  stats: { flexDirection: 'row', paddingVertical: Spacing.lg },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { borderRightWidth: 1, borderRightColor: Colors.stroke },
  list: { overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.stroke },
});

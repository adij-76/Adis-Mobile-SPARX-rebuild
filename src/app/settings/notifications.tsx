import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

const ITEMS = [
  { key: 'daily', label: 'Daily check-in reminder', desc: 'A nudge to log your daily assessment' },
  { key: 'meetings', label: 'Meeting reminders', desc: 'Before your booked sessions start' },
  { key: 'community', label: 'Community activity', desc: 'Replies and reactions to your posts' },
  { key: 'lessons', label: 'New lessons & workshops', desc: 'When fresh content is published' },
  { key: 'streak', label: 'Streak alerts', desc: "Don't lose your streak" },
];

export default function NotificationSettings() {
  const [on, setOn] = useState<Record<string, boolean>>({
    daily: true,
    meetings: true,
    community: false,
    lessons: true,
    streak: true,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Notifications" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {ITEMS.map((it, i) => (
            <View key={it.key} style={[styles.row, i < ITEMS.length - 1 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyMedium">{it.label}</Txt>
                <Txt variant="caption" color={Colors.textSub}>
                  {it.desc}
                </Txt>
              </View>
              <Switch
                value={on[it.key]}
                onValueChange={(v) => setOn((s) => ({ ...s, [it.key]: v }))}
                trackColor={{ true: Colors.primary, false: Colors.strokeStrong }}
                thumbColor={Colors.white}
              />
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: Colors.stroke },
});

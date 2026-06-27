import { Ionicons } from '@expo/vector-icons';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Notif = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
};

const NOTIFS: Notif[] = [
  { id: 'n1', icon: 'calendar', color: '#166890', title: 'Meeting starting soon', body: 'Your onboarding call starts in 30 minutes.', time: '25m', unread: true },
  { id: 'n2', icon: 'flame', color: '#FF9D4B', title: 'Keep your streak alive', body: "You haven't done today's check-in yet.", time: '2h', unread: true },
  { id: 'n3', icon: 'heart', color: '#DF1C41', title: 'Maya liked your post', body: '“Day 30 today. The mornings are finally…”', time: '5h' },
  { id: 'n4', icon: 'school', color: '#38C793', title: 'New workshop available', body: 'Master your belief with Dr. Bruce Lipton.', time: '1d' },
  { id: 'n5', icon: 'trophy', color: '#C7D66D', title: 'You moved up the leaderboard', body: "You're now #3 this week. Nice work!", time: '2d' },
];

export default function Notifications() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Notifications" />
      <FlatList
        data={NOTIFS}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={[styles.row, item.unread && styles.unread]}>
            <View style={[styles.icon, { backgroundColor: `${item.color}22` }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="bodySmBold">{item.title}</Txt>
              <Txt variant="bodySm" color={Colors.textSub} numberOfLines={2}>
                {item.body}
              </Txt>
            </View>
            <Txt variant="caption" color={Colors.textSub}>
              {item.time}
            </Txt>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  list: { padding: Spacing.lg },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  unread: { borderColor: Colors.highlightBorder, backgroundColor: Colors.highlight },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

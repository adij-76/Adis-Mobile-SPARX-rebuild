import { Image } from 'expo-image';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

type Thread = {
  id: string;
  name: string;
  avatar: string;
  last: string;
  time: string;
  unread?: number;
};

const THREADS: Thread[] = [
  { id: 't1', name: 'Adi Jaffe (Coach)', avatar: 'https://i.pravatar.cc/80?img=68', last: 'Proud of your progress this week — keep going!', time: '2m', unread: 2 },
  { id: 't2', name: 'Helping Hands', avatar: 'https://i.pravatar.cc/80?img=5', last: 'Maya: The mornings really do get easier 💙', time: '1h' },
  { id: 't3', name: 'James K.', avatar: 'https://i.pravatar.cc/80?img=12', last: 'Thanks for the support yesterday 🙏', time: '3h' },
  { id: 't4', name: 'Daily Mindfulness', avatar: 'https://i.pravatar.cc/80?img=45', last: 'New breathing exercise posted', time: '1d' },
];

export default function Messages() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Messages" />
      <FlatList
        data={THREADS}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <View style={styles.top}>
                <Txt variant="bodySmBold">{item.name}</Txt>
                <Txt variant="caption" color={Colors.textSub}>
                  {item.time}
                </Txt>
              </View>
              <Txt variant="bodySm" color={Colors.textSub} numberOfLines={1}>
                {item.last}
              </Txt>
            </View>
            {item.unread ? (
              <View style={styles.badge}>
                <Txt variant="caption" color={Colors.white}>
                  {item.unread}
                </Txt>
              </View>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  list: { padding: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.stroke },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.soft },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

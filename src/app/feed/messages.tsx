import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { chatId, useStore } from '@/lib/store';

type Thread = {
  id: string;
  name: string;
  avatar: string;
  last: string;
  time: string;
  unread?: number;
};

const SEED_THREADS: Thread[] = [
  { id: chatId('Adi Jaffe (Coach)'), name: 'Adi Jaffe (Coach)', avatar: 'https://i.pravatar.cc/80?img=68', last: 'Proud of your progress this week — keep going!', time: '2m', unread: 2 },
  { id: chatId('Helping Hands'), name: 'Helping Hands', avatar: 'https://i.pravatar.cc/80?img=5', last: 'Maya: The mornings really do get easier 💙', time: '1h' },
  { id: chatId('James K.'), name: 'James K.', avatar: 'https://i.pravatar.cc/80?img=12', last: 'Thanks for the support yesterday 🙏', time: '3h' },
  { id: chatId('Daily Mindfulness'), name: 'Daily Mindfulness', avatar: 'https://i.pravatar.cc/80?img=45', last: 'New breathing exercise posted', time: '1d' },
];

export default function Messages() {
  const router = useRouter();
  const { chatThreads } = useStore();

  // Threads the user has actually started (newest first), then the seed list,
  // de-duped by id so a started conversation replaces its seed row.
  const started: Thread[] = chatThreads().map((t) => ({
    id: t.id,
    name: t.name,
    avatar: t.avatar,
    last: t.messages.length ? t.messages[t.messages.length - 1].text : 'Say hi 👋',
    time: 'now',
  }));
  const startedIds = new Set(started.map((t) => t.id));
  const threads = [...started, ...SEED_THREADS.filter((t) => !startedIds.has(t.id))];

  const open = (t: Thread) =>
    router.push(
      `/feed/chat?id=${t.id}&name=${encodeURIComponent(t.name)}&avatar=${encodeURIComponent(t.avatar)}`,
    );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Messages" />
      <FlatList
        data={threads}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => open(item)}>
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
          </Pressable>
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

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { AsyncBoundary } from '@/components/ui/async-boundary';
import { Avatar } from '@/components/ui/avatar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import type { Thread } from '@/api';

export default function Messages() {
  const router = useRouter();
  const threadsQuery = useAsync(() => api.messages.threads(), []);

  // Refetch when returning to the list (a sent message / new reply changes it).
  useFocusEffect(useCallback(() => void threadsQuery.reload(), [])); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (t: Thread) =>
    router.push({
      pathname: '/feed/chat',
      params: {
        id: t.conversationId,
        name: t.name,
        avatar: t.avatar,
        group: t.isGroup ? '1' : '',
        peer: t.peerId ?? '',
      },
    });

  const newMessage = () => router.push('/feed/people');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Back"
        largeTitle="Messages"
        right={
          <Pressable onPress={newMessage} hitSlop={12} accessibilityLabel="New message" style={styles.compose}>
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
          </Pressable>
        }
      />
      <AsyncBoundary query={threadsQuery} errorLabel="messages">
        {(threads) => (
          <FlatList
            data={threads}
            keyExtractor={(t) => t.conversationId}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={44} color={Colors.strokeStrong} />
                <Txt variant="bodyMedium" center>
                  No messages yet
                </Txt>
                <Txt variant="bodySm" color={Colors.textSub} center>
                  Start a conversation with your coach or a community member.
                </Txt>
                <Pressable onPress={newMessage} style={styles.emptyBtn}>
                  <Txt variant="bodySmBold" color={Colors.white}>
                    New message
                  </Txt>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => open(item)}>
                {item.isGroup ? (
                  <View style={styles.groupIcon}>
                    <Ionicons name="people" size={22} color={Colors.primary} />
                  </View>
                ) : (
                  <Avatar uri={item.avatar} name={item.name} size={48} />
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.top}>
                    <Txt variant="bodySmBold" numberOfLines={1} style={{ flex: 1 }}>
                      {item.name}
                    </Txt>
                    <Txt variant="caption" color={Colors.textSub}>
                      {item.time}
                    </Txt>
                  </View>
                  <Txt variant="bodySm" color={item.unread ? Colors.textMain : Colors.textSub} numberOfLines={1}>
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
        )}
      </AsyncBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  compose: { padding: Spacing.xs },
  list: { padding: Spacing.lg, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: Colors.stroke },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingTop: Spacing.xxl * 2 },
  emptyBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
});

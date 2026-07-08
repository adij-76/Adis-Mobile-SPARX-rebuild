import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/ui/post-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useStore } from '@/lib/store';

/** A single community "room": the feed filtered to one channel, with a compose
 *  shortcut that pre-selects this channel. */
export default function CommunityRoom() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isHidden } = useStore();

  const communities = useAsync(() => api.community.communities(), []).data ?? [];
  const channel = communities.find((c) => c.id === id);
  const feed = useAsync(() => api.posts.feed(id), [id]);
  useFocusEffect(useCallback(() => void feed.reload(), [id])); // eslint-disable-line react-hooks/exhaustive-deps
  const posts = (feed.data ?? []).filter((p) => !isHidden(p.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Back"
        largeTitle={channel?.name ?? 'Community'}
        right={
          channel ? (
            <View style={[styles.icon, { backgroundColor: `${channel.color}22` }]}>
              <Ionicons name={channel.icon as never} size={20} color={channel.color} />
            </View>
          ) : undefined
        }
      />

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
        ListHeaderComponent={
          channel?.description ? (
            <Txt variant="bodySm" color={Colors.textSub} style={{ marginBottom: Spacing.md }}>
              {channel.description}
            </Txt>
          ) : null
        }
        ListEmptyComponent={
          feed.loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
          ) : feed.error ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={28} color={Colors.strokeStrong} />
              <Txt variant="bodySm" color={Colors.textSub} center>
                Couldn&apos;t load posts.
              </Txt>
              <Button title="Try again" variant="outline" onPress={feed.reload} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={28} color={Colors.textSub} />
              <Txt variant="bodySm" color={Colors.textSub} center>
                No posts here yet. Be the first to share.
              </Txt>
            </View>
          )
        }
        renderItem={({ item }) => (
          <PostCard post={item} onPress={() => router.push(`/feed/${item.id}`)} />
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push(`/feed/new?channel=${id}`)}
        accessibilityRole="button"
        accessibilityLabel="New post">
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  list: { padding: Spacing.lg, paddingBottom: 96 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xxl },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
});

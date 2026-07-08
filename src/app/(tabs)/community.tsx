import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/layout/screen';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/ui/post-card';
import { Txt } from '@/components/ui/text';
import { api } from '@/api';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useStore } from '@/lib/store';

export default function CommunityScreen() {
  const router = useRouter();
  const { isHidden, isAuthorBlocked } = useStore();
  const communitiesQ = useAsync(() => api.community.communities(), []);
  const communities = communitiesQ.data ?? [];
  const feed = useAsync(() => api.posts.feed(), []);
  // Refetch when returning to the tab so a just-created post appears.
  useFocusEffect(useCallback(() => void feed.reload(), [])); // eslint-disable-line react-hooks/exhaustive-deps
  const allPosts = (feed.data ?? []).filter(
    (p) => !isHidden(p.id) && !isAuthorBlocked(p.author),
  );

  // Pull-to-refresh: reload the feed and the community list (F-M1).
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([feed.reload(), communitiesQ.reload()]);
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen style={styles.root}>
      <AppHeader />

      <FlatList
        data={allPosts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <View style={{ gap: Spacing.md, marginBottom: Spacing.md }}>
            <View style={styles.sectionHead}>
              <View>
                <Txt variant="titleLg">Community</Txt>
                <Txt variant="bodySm" color={Colors.textSub}>
                  You&apos;re never alone here
                </Txt>
              </View>
              <Pressable
                style={styles.msgBtn}
                onPress={() => router.push('/feed/messages')}
                hitSlop={8}>
                <Ionicons name="chatbubbles-outline" size={20} color={Colors.primary} />
              </Pressable>
            </View>
            <View style={styles.sectionHead}>
              <Txt variant="titleSm">Your communities</Txt>
              <Pressable onPress={() => router.push('/feed/explore')}>
                <Txt variant="bodySmMedium" color={Colors.primary}>
                  Explore
                </Txt>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={communities}
              keyExtractor={(c) => c.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.md }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.commChip}
                  onPress={() => router.push(`/feed/room/${item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.name}`}>
                  <View style={[styles.commIcon, { backgroundColor: `${item.color}22` }]}>
                    <Ionicons name={item.icon as never} size={20} color={item.color} />
                  </View>
                  <Txt variant="caption" center numberOfLines={2} style={{ width: 76 }}>
                    {item.name}
                  </Txt>
                </Pressable>
              )}
            />
            <Txt variant="titleSm" style={{ marginTop: Spacing.sm }}>
              Recent posts
            </Txt>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
        ListEmptyComponent={
          feed.loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
          ) : feed.error ? (
            <View style={styles.feedState}>
              <Ionicons name="cloud-offline-outline" size={28} color={Colors.strokeStrong} />
              <Txt variant="bodySm" color={Colors.textSub} center>
                Couldn&apos;t load the feed.
              </Txt>
              <Button title="Try again" variant="outline" onPress={feed.reload} />
            </View>
          ) : (
            <View style={styles.feedState}>
              <Ionicons name="chatbubbles-outline" size={28} color={Colors.textSub} />
              <Txt variant="bodySm" color={Colors.textSub} center>
                No posts yet. Be the first to share.
              </Txt>
            </View>
          )
        }
        renderItem={({ item }) => (
          <PostCard post={item} onPress={() => router.push(`/feed/${item.id}`)} />
        )}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/feed/new')}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  msgBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  list: { padding: Spacing.lg, paddingBottom: 96 },
  feedState: { alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xxl },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commChip: { alignItems: 'center', gap: Spacing.xs, width: 76 },
  commIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
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

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { PostCard } from '@/components/ui/post-card';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { communities, posts } from '@/data/content';

export default function CommunityScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <AppHeader />

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
                <View style={styles.commChip}>
                  <View style={[styles.commIcon, { backgroundColor: `${item.color}22` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Txt variant="caption" center numberOfLines={1} style={{ width: 72 }}>
                    {item.name}
                  </Txt>
                </View>
              )}
            />
            <Txt variant="titleSm" style={{ marginTop: Spacing.sm }}>
              Recent posts
            </Txt>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
        renderItem={({ item }) => (
          <PostCard post={item} onPress={() => router.push(`/feed/${item.id}`)} />
        )}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/feed/new')}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>
    </View>
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
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commChip: { alignItems: 'center', gap: Spacing.xs, width: 72 },
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

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncBoundary } from '@/components/ui/async-boundary';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { api } from '@/api';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useStore } from '@/lib/store';

export default function ExploreCommunities() {
  const router = useRouter();
  const { isJoined, toggleJoined } = useStore();
  const communitiesQuery = useAsync(() => api.community.communities(), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Explore communities" />
      <AsyncBoundary
        query={communitiesQuery}
        errorLabel="communities"
        empty={{ icon: 'people-outline', text: 'No communities to explore yet.' }}>
        {(communities) => (
          <FlatList
            data={communities}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const joined = isJoined(item.id);
              return (
                <Pressable
                  style={styles.row}
                  onPress={() => router.push(`/feed/room/${item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.name}`}>
                  <View style={[styles.icon, { backgroundColor: `${item.color}22` }]}>
                    <Ionicons name={item.icon as never} size={22} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyMedium">{item.name}</Txt>
                    <Txt variant="caption" color={Colors.textSub}>
                      {item.members} members
                    </Txt>
                  </View>
                  <Pressable
                    onPress={() => toggleJoined(item.id)}
                    style={[styles.joinBtn, joined && styles.joinedBtn]}>
                    <Txt variant="bodySmBold" color={joined ? Colors.primary : Colors.white}>
                      {joined ? 'Joined' : 'Join'}
                    </Txt>
                  </Pressable>
                </Pressable>
              );
            }}
          />
        )}
      </AsyncBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  list: { padding: Spacing.lg, gap: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  joinBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  joinedBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
});

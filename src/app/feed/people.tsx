import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Avatar } from '@/components/ui/avatar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import type { DirectoryUser } from '@/api';

export default function People() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  // Server-side search on submit-as-you-type; the directory excludes anyone who
  // has blocked me (enforced by the mobile_directory view). "DM anyone else."
  const { data, loading } = useAsync(() => api.messages.directory(query), [query]);
  const people = data ?? [];

  const open = (p: DirectoryUser) =>
    router.replace(
      `/feed/chat?id=${p.userId}&name=${encodeURIComponent(p.name)}&avatar=${encodeURIComponent(p.avatar)}`,
    );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="New message" />
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textSub} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or @handle"
          placeholderTextColor={Colors.textSub}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.textSub} />
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={people}
        keyExtractor={(p) => p.userId}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          loading ? null : (
            <Txt variant="bodySm" color={Colors.textSub} center style={{ paddingTop: Spacing.xxl }}>
              {query ? 'No one matches that search.' : 'No people to message yet.'}
            </Txt>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => open(item)}>
            <Avatar uri={item.avatar} name={item.name} size={44} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodySmBold">{item.name}</Txt>
              {item.handle ? (
                <Txt variant="caption" color={Colors.textSub}>
                  @{item.handle}
                </Txt>
              ) : null}
            </View>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.screen,
  },
  search: { flex: 1, color: Colors.textMain, fontSize: 16 },
  list: { padding: Spacing.lg, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.stroke },
});

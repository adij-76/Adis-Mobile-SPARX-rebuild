import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import type { DirectoryUser } from '@/api';

export default function People() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, DirectoryUser>>({});
  const [groupName, setGroupName] = useState('');
  const [starting, setStarting] = useState(false);

  // Server-side search; the directory excludes anyone who has blocked me.
  // Not wrapped in AsyncBoundary: this re-queries on every keystroke, so we keep
  // the current results visible while the next page loads (useAsync retains prior
  // data) instead of flashing a full-screen spinner. Error/empty handled below.
  const directory = useAsync(() => api.messages.directory(query), [query]);
  const people = directory.data ?? [];
  const chosen = useMemo(() => Object.values(selected), [selected]);
  const isGroup = chosen.length > 1;

  const toggle = (p: DirectoryUser) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[p.userId]) delete next[p.userId];
      else next[p.userId] = p;
      return next;
    });

  const start = async () => {
    if (!chosen.length || starting) return;
    setStarting(true);
    try {
      let convId: string | null;
      let name: string;
      let avatar = '';
      let peer = '';
      if (isGroup) {
        convId = await api.messages.startGroup(
          chosen.map((p) => p.userId),
          groupName.trim() || null,
        );
        name = groupName.trim() || chosen.map((p) => p.name).join(', ');
      } else {
        const p = chosen[0];
        convId = await api.messages.startDirect(p.userId);
        name = p.name;
        avatar = p.avatar;
        peer = p.userId;
      }
      if (!convId) {
        setStarting(false);
        return; // blocked or failed — stay on the picker
      }
      router.replace({
        pathname: '/feed/chat',
        params: { id: convId, name, avatar, group: isGroup ? '1' : '', peer },
      });
    } catch {
      setStarting(false);
    }
  };

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

      {chosen.length ? (
        <View style={styles.selectedBar}>
          {chosen.map((p) => (
            <Pressable key={p.userId} style={styles.chip} onPress={() => toggle(p)}>
              <Txt variant="caption" color={Colors.primary}>
                {p.name}
              </Txt>
              <Ionicons name="close" size={14} color={Colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {isGroup ? (
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Group name (optional)"
          placeholderTextColor={Colors.textSub}
          style={styles.groupName}
        />
      ) : null}

      <FlatList
        data={people}
        keyExtractor={(p) => p.userId}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          directory.loading ? null : directory.error ? (
            <View style={styles.emptyState}>
              <Txt variant="bodySm" color={Colors.textSub} center>
                Couldn&apos;t load people.
              </Txt>
              <Button title="Try again" variant="outline" onPress={directory.reload} />
            </View>
          ) : (
            <Txt variant="bodySm" color={Colors.textSub} center style={{ paddingTop: Spacing.xxl }}>
              {query ? 'No one matches that search.' : 'No people to message yet.'}
            </Txt>
          )
        }
        renderItem={({ item }) => {
          const on = !!selected[item.userId];
          return (
            <Pressable style={styles.row} onPress={() => toggle(item)}>
              <Avatar uri={item.avatar} name={item.name} size={44} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodySmBold">{item.name}</Txt>
                {item.handle ? (
                  <Txt variant="caption" color={Colors.textSub}>
                    @{item.handle}
                  </Txt>
                ) : null}
              </View>
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={on ? Colors.primary : Colors.strokeStrong}
              />
            </Pressable>
          );
        }}
      />

      {chosen.length ? (
        <View style={styles.footer}>
          <Pressable style={styles.startBtn} onPress={start} disabled={starting}>
            {starting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Txt variant="bodyMedium" color={Colors.white}>
                {isGroup ? `Create group · ${chosen.length}` : `Message ${chosen[0].name}`}
              </Txt>
            )}
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
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
  selectedBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: `${Colors.primary}18`,
  },
  groupName: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.screen,
    color: Colors.textMain,
    fontSize: 16,
  },
  list: { padding: Spacing.lg, flexGrow: 1 },
  emptyState: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.stroke },
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.stroke, backgroundColor: Colors.surface },
  startBtn: {
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

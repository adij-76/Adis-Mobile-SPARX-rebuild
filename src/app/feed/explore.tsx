import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { communities } from '@/data/content';

export default function ExploreCommunities() {
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Explore communities" />
      <FlatList
        data={communities}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isJoined = joined[item.id];
          return (
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: `${item.color}22` }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyMedium">{item.name}</Txt>
                <Txt variant="caption" color={Colors.textSub}>
                  {item.members} members
                </Txt>
              </View>
              <Pressable
                onPress={() => setJoined((j) => ({ ...j, [item.id]: !j[item.id] }))}
                style={[styles.joinBtn, isJoined && styles.joinedBtn]}>
                <Txt variant="bodySmBold" color={isJoined ? Colors.primary : Colors.white}>
                  {isJoined ? 'Joined' : 'Join'}
                </Txt>
              </Pressable>
            </View>
          );
        }}
      />
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

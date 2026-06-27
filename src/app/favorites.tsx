import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Segmented } from '@/components/ui/segmented';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { recommendedVideos, workshops } from '@/data/content';

type Tab = 'lessons' | 'videos';

export default function Favorites() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('lessons');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
          <Txt variant="bodyMedium">Back</Txt>
        </Pressable>
        <Txt variant="titleLg">Favorites</Txt>
        <View style={{ marginTop: Spacing.md }}>
          <Segmented<Tab>
            options={[
              { key: 'lessons', label: 'Lessons' },
              { key: 'videos', label: 'Videos' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {tab === 'lessons'
          ? workshops.slice(0, 3).map((w) => (
              <Pressable
                key={w.id}
                style={styles.lessonRow}
                onPress={() => router.push('/workshop/intro')}>
                <Image source={{ uri: w.image }} style={styles.lessonThumb} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="bodySmBold" numberOfLines={2}>
                    {w.title}
                  </Txt>
                  <Txt variant="caption" color={Colors.textSub}>
                    {w.author}
                  </Txt>
                </View>
                <Ionicons name="bookmark" size={20} color={Colors.primary} />
              </Pressable>
            ))
          : recommendedVideos.map((v) => (
              <Pressable
                key={v.id}
                style={styles.lessonRow}
                onPress={() => router.push(`/videos/${v.id}`)}>
                <View>
                  <Image source={{ uri: v.image }} style={styles.lessonThumb} />
                  <View style={styles.play}>
                    <Ionicons name="play" size={14} color={Colors.primaryDark} />
                  </View>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="bodySmBold" numberOfLines={2}>
                    {v.title}
                  </Txt>
                  <Txt variant="caption" color={Colors.textSub}>
                    {v.presenter} · {v.duration}
                  </Txt>
                </View>
                <Ionicons name="bookmark" size={20} color={Colors.primary} />
              </Pressable>
            ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  back: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  lessonRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  lessonThumb: { width: 96, height: 64, borderRadius: Radius.md, backgroundColor: Colors.soft },
  play: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -14,
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

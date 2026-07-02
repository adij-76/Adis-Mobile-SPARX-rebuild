import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Screen } from '@/components/layout/screen';
import { Segmented } from '@/components/ui/segmented';
import { Txt } from '@/components/ui/text';
import { VideoThumb } from '@/components/ui/video-thumb';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useGoBack } from '@/hooks/use-go-back';
import { useStore } from '@/lib/store';
import type { Lesson } from '@/api';

type Tab = 'lessons' | 'workshops' | 'videos';

export default function Favorites() {
  const router = useRouter();
  const goBack = useGoBack();
  const [tab, setTab] = useState<Tab>('lessons');
  const { toggleFav, favoriteIds } = useStore();
  // Driven by the store's favorite ids (hydrated from server ∪ app-owned favorites
  // on auth, updated optimistically on toggle), so saves persist and reflect
  // immediately. Details fetched by id.
  const lessonIds = favoriteIds('lesson');
  const videoIds = favoriteIds('video');
  // Lessons + workshops share the 'lesson' favorite kind (workshops are lessons
  // with lesson_type='workshop'); split them by type for the two tabs.
  const savedContent = useAsync(() => api.content.lessonsByIds(lessonIds), [lessonIds.join(',')]).data ?? [];
  const savedLessons = savedContent.filter((l) => l.lessonType !== 'workshop');
  const savedWorkshops = savedContent.filter((l) => l.lessonType === 'workshop');
  const savedVideos = useAsync(() => api.content.videosByIds(videoIds), [videoIds.join(',')]).data ?? [];

  return (
    <Screen variant="modal" style={styles.safe}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
            <Txt variant="bodyMedium">Back</Txt>
          </Pressable>
          <Txt variant="titleLg">Favorites</Txt>
          <View style={{ marginTop: Spacing.md }}>
            <Segmented<Tab>
              options={[
                { key: 'lessons', label: 'Lessons' },
                { key: 'workshops', label: 'Workshops' },
                { key: 'videos', label: 'Videos' },
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {tab === 'lessons' ? (
            savedLessons.length === 0 ? (
              <EmptyState text="No saved lessons yet. Tap the bookmark on any lesson to save it here." />
            ) : (
              savedLessons.map((l) => (
                <ContentRow
                  key={l.id}
                  item={l}
                  onOpen={() => router.push(`/lesson/${l.id}`)}
                  onUnsave={() => toggleFav('lesson', l.id)}
                />
              ))
            )
          ) : tab === 'workshops' ? (
            savedWorkshops.length === 0 ? (
              <EmptyState text="No saved workshops yet. Tap the bookmark on any workshop to save it here." />
            ) : (
              savedWorkshops.map((w) => (
                <ContentRow
                  key={w.id}
                  item={w}
                  workshop
                  onOpen={() => router.push(`/lesson/${w.id}`)}
                  onUnsave={() => toggleFav('lesson', w.id)}
                />
              ))
            )
          ) : savedVideos.length === 0 ? (
            <EmptyState text="No saved videos yet. Tap the bookmark on any video to save it here." />
          ) : (
            savedVideos.map((v) => (
              <Pressable
                key={v.id}
                style={styles.lessonRow}
                onPress={() => router.push(`/videos/${v.id}`)}>
                <View>
                  {v.image ? (
                    <Image source={{ uri: v.image }} style={styles.lessonThumb} />
                  ) : (
                    <VideoThumb url={v.vimeoUrl ?? null} width={96} height={64} />
                  )}
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
                <Pressable onPress={() => toggleFav('video', v.id)} hitSlop={10}>
                  <Ionicons name="bookmark" size={20} color={Colors.primary} />
                </Pressable>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

/** A saved lesson/workshop row (shared by the Lessons and Workshops tabs). */
function ContentRow({
  item,
  workshop,
  onOpen,
  onUnsave,
}: {
  item: Lesson;
  workshop?: boolean;
  onOpen: () => void;
  onUnsave: () => void;
}) {
  return (
    <Pressable style={styles.lessonRow} onPress={onOpen}>
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.lessonThumb} />
      ) : (
        <VideoThumb url={item.vimeoUrl} width={96} height={64} />
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="bodySmBold" numberOfLines={2}>
          {item.title || item.navTitle}
        </Txt>
        {workshop ? (
          <View style={styles.badge}>
            <Ionicons name="easel" size={12} color={Colors.primary} />
            <Txt variant="caption" color={Colors.primary}>
              Workshop
            </Txt>
          </View>
        ) : null}
      </View>
      <Pressable onPress={onUnsave} hitSlop={10}>
        <Ionicons name="bookmark" size={20} color={Colors.primary} />
      </Pressable>
    </Pressable>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="bookmark-outline" size={40} color={Colors.strokeStrong} />
      <Txt variant="bodySm" color={Colors.textSub} center>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  back: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  lessonRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  lessonThumb: { width: 96, height: 64, borderRadius: Radius.md, backgroundColor: Colors.soft },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: `${Colors.primary}18`,
  },
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
  empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg },
});

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import type { Lesson } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useVimeoMeta } from '@/hooks/use-vimeo-meta';

function lessonTitle(l: Lesson): string {
  return l.title || l.navTitle || (l.description ? l.description.split(/[.!?]/)[0] : '') || 'Lesson';
}

function LessonRow({
  lesson,
  index,
  onOpen,
}: {
  lesson: Lesson;
  index: number;
  onOpen: () => void;
}) {
  const meta = useVimeoMeta(lesson.vimeoUrl);
  const title = lessonTitle(lesson);

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]} onPress={onOpen}>
      <View style={styles.thumb}>
        {meta?.thumbnail && (
          <Image source={{ uri: meta.thumbnail }} style={styles.thumbImg} contentFit="cover" />
        )}
        <View style={styles.play}>
          <Ionicons name="play" size={18} color={Colors.primaryDark} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodySmBold" numberOfLines={2}>
          {index + 1}. {title}
        </Txt>
        {lesson.description ? (
          <Txt variant="caption" color={Colors.textSub} numberOfLines={2}>
            {lesson.description}
          </Txt>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textSub} />
    </Pressable>
  );
}

export default function ModuleScreen() {
  const router = useRouter();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { data, loading, error, reload } = useAsync(
    () => api.content.moduleLessons(String(id)),
    [id],
  );
  const lessons = data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle={title || 'Module'} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={Colors.strokeStrong} />
          <Txt variant="bodySm" color={Colors.textSub} center>
            Couldn&apos;t load lessons.{'\n'}
            {error.message}
          </Txt>
          <Button title="Try again" variant="outline" onPress={reload} />
        </View>
      ) : lessons.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={40} color={Colors.strokeStrong} />
          <Txt variant="bodySm" color={Colors.textSub} center>
            No lessons in this module yet.
          </Txt>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {lessons.map((l, i) => (
            <LessonRow key={l.id} lesson={l} index={i} onOpen={() => router.push(`/lesson/${l.id}`)} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  list: { padding: Spacing.lg, gap: Spacing.lg },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  thumb: {
    width: 120,
    height: 78,
    borderRadius: Radius.md,
    backgroundColor: Colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  play: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  worksheet: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});

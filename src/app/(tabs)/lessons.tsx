import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api';
import type { Module, Program } from '@/api/types';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/layout/screen';
import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useStore } from '@/lib/store';

export default function LessonsScreen() {
  const programs = useAsync(() => api.content.programs(), []);

  return (
    <Screen style={styles.root}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleWrap}>
          <Txt variant="titleLg">My Lessons</Txt>
          <View style={styles.sourceRow}>
            <View style={[styles.dot, { backgroundColor: api.backend === 'supabase' ? Colors.success : Colors.textSub }]} />
            <Txt variant="caption" color={Colors.textSub}>
              {api.backend === 'supabase' ? 'Live · Supabase' : 'Sample data'}
            </Txt>
          </View>
        </View>

        {programs.loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : programs.error ? (
          <View style={styles.center}>
            <Txt variant="bodySm" color={Colors.textSub} center>
              Couldn&apos;t load programs.{'\n'}
              {programs.error.message}
            </Txt>
            <Button title="Try again" variant="outline" onPress={programs.reload} />
          </View>
        ) : (programs.data ?? []).length === 0 ? (
          <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: Spacing.xl }}>
            No programs available yet.
          </Txt>
        ) : (
          (programs.data ?? []).map((p) => <ProgramJourney key={p.id} program={p} />)
        )}
      </ScrollView>
    </Screen>
  );
}

function ProgramJourney({ program }: { program: Program }) {
  const { data, loading } = useAsync(() => api.content.modules(program.id), [program.id]);
  const modules = data ?? [];

  return (
    <View style={{ gap: Spacing.sm }}>
      <Txt variant="titleSm">{program.name}</Txt>
      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        modules.map((m, i) => (
          <ModuleNode key={m.id} module={m} isLast={i === modules.length - 1} startOpen={i === 0} />
        ))
      )}
    </View>
  );
}

function ModuleNode({ module, isLast, startOpen }: { module: Module; isLast: boolean; startOpen: boolean }) {
  const router = useRouter();
  const { isLessonComplete } = useStore();
  const [open, setOpen] = useState(startOpen);
  const { data, loading } = useAsync(
    () => (open ? api.content.moduleLessons(module.id) : Promise.resolve(null)),
    [module.id, open],
  );
  const lessons = data ?? [];

  return (
    <View style={styles.node}>
      <View style={styles.rail}>
        <View style={[styles.circle, open && styles.circleOpen]}>
          <Txt variant="bodySmBold" color={open ? Colors.white : Colors.primary}>
            {module.order}
          </Txt>
        </View>
        {!isLast && <View style={styles.line} />}
      </View>

      <View style={styles.nodeBody}>
        <Pressable style={styles.moduleHead} onPress={() => setOpen((o) => !o)}>
          <Txt variant="bodyMedium" style={{ flex: 1 }} numberOfLines={2}>
            {module.title || `Module ${module.order}`}
          </Txt>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSub} />
        </Pressable>

        {open &&
          (loading ? (
            <ActivityIndicator color={Colors.primary} style={{ alignSelf: 'flex-start', marginVertical: Spacing.sm }} />
          ) : (
            <View style={styles.lessons}>
              {lessons.map((l, i) => {
                const done = isLessonComplete(l.id);
                return (
                  <Pressable
                    key={l.id}
                    style={({ pressed }) => [styles.lessonRow, pressed && { opacity: 0.7 }]}
                    onPress={() => router.push(`/lesson/${l.id}`)}>
                    {done ? (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                    ) : (
                      <View style={styles.lessonDot} />
                    )}
                    <Txt
                      variant="bodySm"
                      color={done ? Colors.textSub : Colors.textMain}
                      style={{ flex: 1 }}
                      numberOfLines={2}>
                      {l.title || l.navTitle || `Lesson ${i + 1}`}
                    </Txt>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textSub} />
                  </Pressable>
                );
              })}
            </View>
          ))}
      </View>
    </View>
  );
}

const CIRCLE = 34;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  titleWrap: { gap: 2 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xl },

  node: { flexDirection: 'row', gap: Spacing.md },
  rail: { width: CIRCLE, alignItems: 'center' },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: Colors.soft,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOpen: { backgroundColor: Colors.primary },
  line: { flex: 1, width: 2, backgroundColor: Colors.stroke, marginTop: 2 },

  nodeBody: { flex: 1, paddingBottom: Spacing.md },
  moduleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: CIRCLE,
  },
  lessons: { marginTop: Spacing.sm, gap: 2 },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
  },
  lessonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.strokeStrong,
  },
});

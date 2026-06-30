import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api';
import type { Module } from '@/api/types';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useStore } from '@/lib/store';

/**
 * Course outline panel: modules as an accordion, lessons lazy-loaded when a
 * module is expanded. The current module starts open and the current lesson is
 * highlighted. Used as a pinned side panel (desktop) or a slide-over (mobile).
 */
export function CourseOutline({
  programId,
  currentModuleId,
  currentLessonId,
  onPick,
}: {
  programId: string | null;
  currentModuleId: string;
  currentLessonId: string;
  onPick: (lessonId: string) => void;
}) {
  const { data, loading } = useAsync(
    () => (programId ? api.content.modules(programId) : Promise.resolve([])),
    [programId],
  );
  const modules = data ?? [];

  return (
    <View style={styles.root}>
      <Txt variant="bodySmBold" style={styles.heading}>
        Course outline
      </Txt>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: Spacing.lg }}
          showsVerticalScrollIndicator={false}>
          {modules.map((m) => (
            <OutlineModule
              key={m.id}
              module={m}
              startOpen={m.id === currentModuleId}
              currentLessonId={currentLessonId}
              onPick={onPick}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function OutlineModule({
  module,
  startOpen,
  currentLessonId,
  onPick,
}: {
  module: Module;
  startOpen: boolean;
  currentLessonId: string;
  onPick: (lessonId: string) => void;
}) {
  const [open, setOpen] = useState(startOpen);
  const { isLessonComplete } = useStore();
  const { data, loading } = useAsync(
    () => (open ? api.content.moduleLessons(module.id) : Promise.resolve(null)),
    [module.id, open],
  );
  const lessons = data ?? [];

  return (
    <View style={styles.module}>
      <Pressable style={styles.moduleHead} onPress={() => setOpen((o) => !o)}>
        <View style={styles.moduleNum}>
          <Txt variant="caption" color={Colors.primary}>
            {module.order}
          </Txt>
        </View>
        <Txt variant="bodySmMedium" style={{ flex: 1 }} numberOfLines={2}>
          {module.title || `Module ${module.order}`}
        </Txt>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSub} />
      </Pressable>
      {open &&
        (loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.sm }} />
        ) : (
          lessons.map((l, i) => {
            const active = l.id === currentLessonId;
            const done = isLessonComplete(l.id);
            return (
              <Pressable
                key={l.id}
                onPress={() => onPick(l.id)}
                style={[styles.lessonRow, active && styles.lessonActive]}>
                <View style={{ width: 22, alignItems: 'center' }}>
                  {done ? (
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  ) : (
                    <Txt variant="caption" color={active ? Colors.primary : Colors.textSub}>
                      {i + 1}
                    </Txt>
                  )}
                </View>
                <Txt
                  variant="bodySm"
                  color={active ? Colors.primary : Colors.textMain}
                  style={{ flex: 1 }}
                  numberOfLines={2}>
                  {l.title || l.navTitle || 'Lesson'}
                </Txt>
              </Pressable>
            );
          })
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  heading: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  module: { borderTopWidth: 1, borderTopColor: Colors.stroke },
  moduleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  moduleNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.xl + Spacing.sm,
    paddingRight: Spacing.lg,
  },
  lessonActive: { backgroundColor: Colors.highlight },
});

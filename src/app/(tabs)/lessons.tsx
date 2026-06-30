import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api';
import type { Program } from '@/api/types';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/layout/screen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';

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
          (programs.data ?? []).map((p) => <ProgramSection key={p.id} program={p} />)
        )}
      </ScrollView>
    </Screen>
  );
}

function ProgramSection({ program }: { program: Program }) {
  const router = useRouter();
  const { data, loading } = useAsync(() => api.content.modules(program.id), [program.id]);
  const modules = data ?? [];

  return (
    <View style={{ gap: Spacing.md }}>
      <Txt variant="titleSm">{program.name}</Txt>
      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        modules.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => router.push(`/module/${m.id}?title=${encodeURIComponent(m.title ?? '')}`)}>
            <Card style={styles.moduleCard}>
              <View style={styles.moduleIndex}>
                <Txt variant="bodySmBold" color={Colors.primary}>
                  {m.order}
                </Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyMedium" numberOfLines={2}>
                  {m.title || `Module ${m.order}`}
                </Txt>
                <Txt variant="caption" color={Colors.textSub}>
                  Module {m.order}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSub} />
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  titleWrap: { gap: 2 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xl },
  moduleCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  moduleIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

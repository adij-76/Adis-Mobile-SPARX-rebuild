/**
 * SparxySummary — the "personalised, inspiring summary" step of a lesson
 * (spec: docs/lesson-exercises-spec.md §vision 5).
 *
 * Feeds the member's own exercise answers to the Sparxy webhook (the n8n flow
 * that already powers chat + holds the AI key server-side and enriches with
 * mobile_ai_context) and renders the reply. Falls back to a warm, locally
 * composed summary when the webhook isn't configured or fails — the step never
 * dead-ends. Replies are cached per (lesson, answers) for the session so
 * stepping back and forth doesn't re-generate.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Lesson } from '@/api/types';
import type { LessonExercisesState } from '@/components/exercise-runner';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { lessonTitle } from '@/lib/content-format';
import { answersSummary } from '@/lib/exercises';
import { askSparky, sparkyConfigured } from '@/lib/sparky';

// Session cache: stepping between lesson steps must not re-hit the webhook.
const summaryCache = new Map<string, string>();

function cacheKey(lessonId: string, answers: string): string {
  let h = 0;
  for (let i = 0; i < answers.length; i++) h = (h * 31 + answers.charCodeAt(i)) | 0;
  return `${lessonId}:${h}`;
}

/** A supportive summary composed from the member's own answers — used when the
 *  Sparxy webhook is unconfigured/unreachable so the step always delivers. */
function localSummary(name: string | null, title: string, answers: string): string {
  const first = answers
    .split('\n')
    .map((l) => l.replace(/^- [^:]*:\s*/, '').trim())
    .find((l) => l.length > 20 && !l.endsWith(':'));
  const you = name ? `${name}, you` : 'You';
  return [
    `${you} showed up and did the real work in “${title}” — not just watching, but putting your own answers into words.`,
    first ? `Your words say it best: “${first.length > 140 ? `${first.slice(0, 140)}…` : first}”` : null,
    'Next steps: revisit what you wrote tomorrow and notice what still rings true, bring one insight into your next check-in, and keep the momentum with the next lesson.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function SparxySummary({ lesson, ex }: { lesson: Lesson; ex: LessonExercisesState }) {
  const { user } = useAuth();
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = lessonTitle(lesson);
  const answers = ex.loading ? '' : answersSummary(ex.worksheets, ex.byQuestion);

  useEffect(() => {
    if (!answers) {
      setText(null);
      return;
    }
    const key = cacheKey(lesson.id, answers);
    const cached = summaryCache.get(key);
    if (cached) {
      setText(cached);
      return;
    }
    let alive = true;
    setBusy(true);
    const fallback = localSummary(user?.name ?? null, title, answers);
    const request = sparkyConfigured
      ? askSparky(
          [
            `The member just completed the written exercises for the lesson "${title}".`,
            'Their answers (their own words):',
            answers,
            '',
            'Write a short (under 180 words), warm, personal summary of this lesson and what their answers show about them — inspiring, never clinical. ' +
              'Reflect one or two of their own phrases back to them, then give 2-3 concrete next steps. ' +
              'Plain text only: no links, no videos, no markdown headings.',
          ].join('\n'),
          `lesson-summary-${lesson.id}`,
          [],
          user?.appUserId ?? null,
          user?.id ?? null,
        ).then((r) => r.text || fallback)
      : Promise.resolve(fallback);
    request
      .catch(() => fallback)
      .then((t) => {
        summaryCache.set(key, t);
        if (alive) {
          setText(t);
          setBusy(false);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, answers]);

  if (ex.loading || busy) {
    return (
      <View style={styles.card}>
        <View style={styles.busyRow}>
          <ActivityIndicator color={Colors.primary} />
          <Txt variant="bodySm" color={Colors.textSub}>
            Sparxy is reading your answers…
          </Txt>
        </View>
      </View>
    );
  }

  if (!answers) {
    return (
      <View style={styles.card}>
        <View style={styles.busyRow}>
          <Ionicons name="create-outline" size={20} color={Colors.textSub} />
          <Txt variant="bodySm" color={Colors.textSub} style={{ flex: 1 }}>
            Answer the exercises on the previous step and Sparxy will turn your words into a
            personalised summary and next steps.
          </Txt>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Ionicons name="sparkles" size={14} color={Colors.primary} />
        <Txt variant="caption" color={Colors.primary}>
          From Sparxy, for you
        </Txt>
      </View>
      <Txt variant="body" color={Colors.textMain}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: `${Colors.primary}18`,
  },
});

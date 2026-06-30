import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import type { Lesson } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { Txt } from '@/components/ui/text';
import { VideoPlayerModal } from '@/components/video-player-modal';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { WORKSHOP_STEPS } from '@/data/content';
import { useAsync } from '@/hooks/use-async';
import { useVimeoMeta } from '@/hooks/use-vimeo-meta';
import { useStore } from '@/lib/store';
import type { SparkyVideo } from '@/lib/sparky';

/** A poster-style card that opens the Vimeo player when tapped. */
function VideoPoster({ url, label, onPlay }: { url: string | null; label: string; onPlay: () => void }) {
  const meta = useVimeoMeta(url);
  return (
    <Pressable style={styles.poster} onPress={onPlay} disabled={!url}>
      {meta?.thumbnail && <Image source={{ uri: meta.thumbnail }} style={styles.posterImg} contentFit="cover" />}
      <View style={styles.posterPlay}>
        <Ionicons name="play" size={26} color={Colors.primaryDark} />
      </View>
      <View style={styles.posterLabel}>
        <Ionicons name="play" size={14} color={Colors.white} />
        <Txt variant="caption" color={Colors.white}>
          {url ? label : 'Video coming soon'}
        </Txt>
      </View>
    </Pressable>
  );
}

export default function LessonScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lesson, loading, error, reload } = useAsync(() => api.content.lesson(String(id)), [id]);
  const { isFav, toggleFav } = useStore();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState<SparkyVideo | null>(null);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lesson) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={Colors.strokeStrong} />
          <Txt variant="bodySm" color={Colors.textSub} center>
            {error ? `Couldn't load this lesson.\n${error.message}` : 'Lesson not found.'}
          </Txt>
          {error ? <Button title="Try again" variant="outline" onPress={reload} /> : null}
        </View>
      </SafeAreaView>
    );
  }

  const title = lesson.title || lesson.navTitle || 'Lesson';
  const saved = isFav('lesson', lesson.id);
  const last = WORKSHOP_STEPS.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header onBack={() => router.back()} />
      <View style={styles.stepperWrap}>
        <Stepper steps={WORKSHOP_STEPS} current={step} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <Intro lesson={lesson} title={title} saved={saved} onToggleSave={() => toggleFav('lesson', lesson.id)} />
        )}

        {step === 1 && (
          <>
            <VideoPoster
              url={lesson.vimeoUrl}
              label="Tap to play"
              onPlay={() => lesson.vimeoUrl && setPlaying({ url: lesson.vimeoUrl, title })}
            />
            <Txt variant="title">{title}</Txt>
            {lesson.description ? (
              <Txt variant="body" color={Colors.textSub}>
                {lesson.description}
              </Txt>
            ) : null}
          </>
        )}

        {step === 2 && (
          <>
            <VideoPoster
              url={lesson.worksheetUrl}
              label="Exercise walkthrough"
              onPlay={() =>
                lesson.worksheetUrl && setPlaying({ url: lesson.worksheetUrl, title: `${title} · Exercises` })
              }
            />
            <Txt variant="title">Exercises</Txt>
            <View style={styles.soon}>
              <Ionicons name="construct-outline" size={20} color={Colors.textSub} />
              <Txt variant="bodySm" color={Colors.textSub} style={{ flex: 1 }}>
                Interactive exercises for this lesson are coming soon. For now, follow along with the
                walkthrough above.
              </Txt>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <View style={styles.summaryIcon}>
              <Ionicons name="sparkles" size={28} color={Colors.primary} />
            </View>
            <Txt variant="title" center>
              Lesson summary
            </Txt>
            <View style={styles.summaryCard}>
              <Txt variant="body" color={Colors.textMain}>
                A personalised, inspiring summary of this lesson and your exercise — plus your next
                steps — will appear here.
              </Txt>
            </View>
            {lesson.description ? (
              <Txt variant="bodySm" color={Colors.textSub}>
                {lesson.description}
              </Txt>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Button
            title="Previous"
            variant="secondary"
            iconLeft="chevron-back"
            disabled={step === 0}
            onPress={() => setStep((s) => Math.max(0, s - 1))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title={step === last ? 'Complete' : 'Next'}
            variant={step === last ? 'primary' : 'secondary'}
            iconRight={step === last ? undefined : 'chevron-forward'}
            onPress={() => (step === last ? router.back() : setStep((s) => s + 1))}
          />
        </View>
      </View>

      <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
        <Txt variant="bodyMedium">Back</Txt>
      </Pressable>
    </View>
  );
}

function Intro({
  lesson,
  title,
  saved,
  onToggleSave,
}: {
  lesson: Lesson;
  title: string;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const meta = useVimeoMeta(lesson.vimeoUrl);
  return (
    <>
      <View style={styles.hero}>
        {meta?.thumbnail && <Image source={{ uri: meta.thumbnail }} style={styles.posterImg} contentFit="cover" />}
      </View>
      <View style={styles.introMeta}>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons key={i} name={i < (lesson.rating ?? 5) ? 'star' : 'star-outline'} size={18} color={Colors.orange} />
          ))}
        </View>
        <Pressable onPress={onToggleSave} hitSlop={10}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={Colors.primary} />
        </Pressable>
      </View>
      <Txt variant="title">{title}</Txt>
      <View style={{ gap: Spacing.sm }}>
        <Txt variant="bodyMedium">Introduction</Txt>
        {lesson.description ? (
          <Txt variant="body" color={Colors.textSub}>
            {lesson.description}
          </Txt>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepperWrap: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  footer: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  hero: { width: '100%', height: 190, borderRadius: Radius.md, backgroundColor: Colors.soft, overflow: 'hidden' },
  introMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  poster: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  posterPlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(10,13,20,0.85)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  soon: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  summaryIcon: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.screen,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
});

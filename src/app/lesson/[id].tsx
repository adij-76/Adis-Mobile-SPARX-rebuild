import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import type { Lesson } from '@/api/types';
import { CourseOutline } from '@/components/course-outline';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Stepper } from '@/components/ui/stepper';
import { Txt } from '@/components/ui/text';
import { VideoPlayerModal } from '@/components/video-player-modal';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { WORKSHOP_STEPS } from '@/data/content';
import { useAsync } from '@/hooks/use-async';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useVimeoMeta } from '@/hooks/use-vimeo-meta';
import { useStore } from '@/lib/store';
import type { SparkyVideo } from '@/lib/sparky';

function VideoPoster({ url, label, onPlay }: { url: string | null; label: string; onPlay: () => void }) {
  const meta = useVimeoMeta(url);
  return (
    <Pressable style={styles.poster} onPress={onPlay} disabled={!url}>
      {meta?.thumbnail && <Image source={{ uri: meta.thumbnail }} style={styles.fill} contentFit="cover" />}
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
  const { isDesktop } = useBreakpoint();
  const { id } = useLocalSearchParams<{ id: string }>();

  const lessonQ = useAsync(() => api.content.lesson(String(id)), [id]);
  const lesson = lessonQ.data;
  const moduleQ = useAsync(
    () => (lesson?.moduleId ? api.content.module(lesson.moduleId) : Promise.resolve(null)),
    [lesson?.moduleId],
  );
  const courseModule = moduleQ.data;

  const { isFav, toggleFav, markLessonComplete } = useStore();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState<SparkyVideo | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);

  // Reset to the intro whenever the lesson changes (e.g. picked from the outline).
  useEffect(() => setStep(0), [id]);
  // Default the outline open on desktop, closed on phone.
  useEffect(() => setOutlineOpen(isDesktop), [isDesktop]);

  if (lessonQ.loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar title="" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (lessonQ.error || !lesson) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar title="" onBack={() => router.back()} />
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={Colors.strokeStrong} />
          <Txt variant="bodySm" color={Colors.textSub} center>
            {lessonQ.error ? `Couldn't load this lesson.\n${lessonQ.error.message}` : 'Lesson not found.'}
          </Txt>
          {lessonQ.error ? <Button title="Try again" variant="outline" onPress={lessonQ.reload} /> : null}
        </View>
      </SafeAreaView>
    );
  }

  const title = lesson.title || lesson.navTitle || 'Lesson';
  const context = courseModule
    ? `Module ${courseModule.order} · Lesson ${lesson.position}`
    : `Lesson ${lesson.position}`;
  const saved = isFav('lesson', lesson.id);
  const last = WORKSHOP_STEPS.length - 1;

  const pickLesson = (lessonId: string) => {
    router.replace(`/lesson/${lessonId}`);
    if (!isDesktop) setOutlineOpen(false);
  };

  const outline = (
    <CourseOutline
      programId={courseModule?.programId ?? null}
      currentModuleId={lesson.moduleId}
      currentLessonId={lesson.id}
      onPick={pickLesson}
    />
  );

  const body = (
    <>
      <View style={styles.stepperWrap}>
        <Stepper steps={WORKSHOP_STEPS} current={step} />
        <View style={{ marginTop: Spacing.md }}>
          <ProgressBar progress={(step + 1) / WORKSHOP_STEPS.length} track={Colors.soft} fill={Colors.primary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
            onPress={() => {
              if (step === last) {
                markLessonComplete(lesson.id);
                router.back();
              } else {
                setStep((s) => s + 1);
              }
            }}
          />
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar
        title={`${context} · ${title}`}
        onBack={() => router.back()}
        outlineOpen={outlineOpen}
        onToggleOutline={() => setOutlineOpen((o) => !o)}
      />

      {isDesktop ? (
        <View style={styles.row}>
          <View style={styles.contentCol}>{body}</View>
          {outlineOpen && <View style={styles.outlineCol}>{outline}</View>}
        </View>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}

      {!isDesktop && (
        <Modal visible={outlineOpen} animationType="slide" transparent onRequestClose={() => setOutlineOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOutlineOpen(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHandle}>
              <Pressable onPress={() => setOutlineOpen(false)} hitSlop={10} style={styles.drawerClose}>
                <Ionicons name="close" size={22} color={Colors.textMain} />
              </Pressable>
            </View>
            {outline}
          </View>
        </Modal>
      )}

      <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />
    </SafeAreaView>
  );
}

function TopBar({
  title,
  onBack,
  outlineOpen,
  onToggleOutline,
}: {
  title: string;
  onBack: () => void;
  outlineOpen?: boolean;
  onToggleOutline?: () => void;
}) {
  return (
    <View style={styles.topbar}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
        <Txt variant="bodyMedium">Back</Txt>
      </Pressable>
      <Txt variant="bodySmMedium" numberOfLines={1} style={styles.topTitle}>
        {title}
      </Txt>
      {onToggleOutline ? (
        <Pressable onPress={onToggleOutline} hitSlop={8} style={[styles.outlineBtn, outlineOpen && styles.outlineBtnOn]}>
          <Ionicons
            name="list"
            size={18}
            color={outlineOpen ? Colors.white : Colors.primary}
          />
          <Txt variant="caption" color={outlineOpen ? Colors.white : Colors.primary}>
            Outline
          </Txt>
        </Pressable>
      ) : (
        <View style={{ width: 60 }} />
      )}
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
        {meta?.thumbnail && <Image source={{ uri: meta.thumbnail }} style={styles.fill} contentFit="cover" />}
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

const OUTLINE_W = 320;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stroke,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  topTitle: { flex: 1, color: Colors.textSub },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  outlineBtnOn: { backgroundColor: Colors.primary },
  row: { flex: 1, flexDirection: 'row' },
  contentCol: { flex: 1, minWidth: 0 },
  outlineCol: { width: OUTLINE_W, borderLeftWidth: 1, borderLeftColor: Colors.stroke },
  stepperWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  footer: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
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
  summaryCard: { backgroundColor: Colors.screen, borderRadius: Radius.md, padding: Spacing.lg },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '82%',
    maxWidth: 360,
    backgroundColor: Colors.white,
  },
  drawerHandle: { alignItems: 'flex-end', padding: Spacing.sm },
  drawerClose: { padding: Spacing.xs },
});

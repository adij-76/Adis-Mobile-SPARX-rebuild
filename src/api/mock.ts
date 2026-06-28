/**
 * Mock adapter — serves the existing local content so the app fully works with
 * no backend configured. Default until EXPO_PUBLIC_SUPABASE_URL is set.
 */
import { recommendedVideos, wheelHistory, workshops, type WorkshopSummary } from '@/data/content';
import type { ContentApi, InsightsApi, Lesson, Module, Program, Snippet, Workshop } from '@/api/types';

const HERO: Program = { id: 'hero-code', name: 'The Hero Code', active: true };

const MODULES: Module[] = [
  { id: 'm1', programId: HERO.id, title: 'Foundations', order: 1 },
  { id: 'm2', programId: HERO.id, title: 'Understanding Your Patterns', order: 2 },
  { id: 'm3', programId: HERO.id, title: 'Building New Habits', order: 3 },
];

function toLesson(w: WorkshopSummary, i: number, type: 'lesson' | 'workshop'): Lesson {
  return {
    id: w.id,
    moduleId: MODULES[i % MODULES.length].id,
    title: w.title,
    navTitle: w.title,
    position: i + 1,
    description: w.description,
    vimeoUrl: 'https://vimeo.com/76979871',
    vimeoId: 76979871,
    lessonType: type,
    worksheetUrl: null,
    thumbnail: w.image,
    rating: w.rating,
  };
}

const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));

export const mockContent: ContentApi = {
  programs: () => delay([HERO]),
  modules: (programId) => delay(MODULES.filter((m) => m.programId === programId)),
  moduleLessons: (moduleId) =>
    delay(workshops.map((w, i) => toLesson(w, i, 'lesson')).filter((l) => l.moduleId === moduleId)),
  workshops: () => delay<Workshop[]>(workshops.map((w, i) => toLesson(w, i, 'workshop'))),
  snippets: () =>
    delay<Snippet[]>(
      recommendedVideos.map((v) => ({
        id: v.id,
        lessonId: null,
        description: v.title,
        lengthSeconds: null,
        vimeoUrl: v.vimeoUrl ?? null,
        vimeoId: null,
        aiGenerated: false,
      })),
    ),
};

export const mockInsights: InsightsApi = {
  wheelHistory: (anchor) => delay(wheelHistory(anchor?.current ?? 71, anchor?.last ?? 67)),
};

/**
 * Mock adapter — serves the existing local content so the app fully works with
 * no backend configured. Default until EXPO_PUBLIC_SUPABASE_URL is set.
 */
import {
  challenges,
  coachAdi,
  communities,
  leaderboard,
  meetings,
  quotes,
  recommendedVideos,
  reports,
  wheelAreas,
  wheelHistory,
  workshops,
  type WorkshopSummary,
} from '@/data/content';
import type {
  AuthApi,
  AuthSession,
  CommunityApi,
  ContentApi,
  InsightsApi,
  Lesson,
  MeResult,
  MeetingsApi,
  Module,
  Program,
  Snippet,
  Workshop,
} from '@/api/types';

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
  module: (id) => delay(MODULES.find((m) => m.id === id) ?? null),
  moduleLessons: (moduleId) =>
    delay(workshops.map((w, i) => toLesson(w, i, 'lesson')).filter((l) => l.moduleId === moduleId)),
  lesson: (id) => delay(workshops.map((w, i) => toLesson(w, i, 'lesson')).find((l) => l.id === id) ?? null),
  workshops: () => delay<Workshop[]>(workshops.map((w, i) => toLesson(w, i, 'workshop'))),
  snippets: () =>
    delay<Snippet[]>(
      recommendedVideos.map((v) => ({
        id: v.id,
        lessonId: null,
        title: v.title,
        description: v.description ?? null,
        lengthSeconds: null,
        vimeoUrl: v.vimeoUrl ?? null,
        vimeoId: null,
        aiGenerated: false,
      })),
    ),
  recommendedVideos: () => delay(recommendedVideos),
  quotes: () => delay(quotes),
  challenges: () => delay(challenges),
};

const nameFromEmail = (email: string) =>
  email
    .split('@')[0]
    .replace(/[._+].*$/, '')
    .replace(/^\w/, (c) => c.toUpperCase());

function mockSession(email: string): AuthSession {
  return {
    user: {
      id: `mock-${email}`,
      email,
      name: nameFromEmail(email),
      avatarUrl: null,
      appUserId: `mock-${email}`,
      programId: null,
      subscribed: false,
      stripeActive: false,
      advancedCoaching: false,
      addictionLabel: null,
      daysCount: null,
      daysUpdatedAt: null,
      userHandle: null,
      timeZone: null,
      teamId: null,
      zoomEmail: null,
    },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };
}

export const mockAuth: AuthApi = {
  // Any non-empty email/password works against the mock — it's offline sample data.
  signIn: (email, password) =>
    password ? delay(mockSession(email)) : Promise.reject(new Error('Enter your password')),
  signUp: (email, password) =>
    password ? delay(mockSession(email)) : Promise.reject(new Error('Enter a password')),
  refresh: (_refreshToken) => delay(mockSession('okeijoseph@sparx.app')),
  signOut: () => delay(undefined),
  me: (email): Promise<MeResult> =>
    delay({
      appUserId: `mock-${email}`,
      name: nameFromEmail(email),
      avatarUrl: null,
      programId: null,
      subscribed: false,
      stripeActive: false,
      advancedCoaching: false,
      addictionLabel: null,
      daysCount: null,
      daysUpdatedAt: null,
      userHandle: null,
      timeZone: null,
      teamId: null,
      zoomEmail: null,
    }),
  // OAuth + Storage need a real backend; the mock just keeps the picked image locally.
  oauthUrl: () => '',
  sessionFromTokens: (accessToken, refreshToken) =>
    Promise.resolve({ ...mockSession('okeijoseph@sparx.app'), accessToken, refreshToken }),
  updateAvatar: (dataUrl) => delay(dataUrl),
};

export const mockInsights: InsightsApi = {
  wheelHistory: (anchor) => delay(wheelHistory(anchor?.current ?? 71, anchor?.last ?? 67)),
  wheelAreas: () => delay(wheelAreas),
  reports: () => delay(reports),
  leaderboard: () => delay(leaderboard),
};

export const mockMeetings: MeetingsApi = {
  all: () => delay(meetings),
  upcoming: () => delay(meetings.filter((m) => m.status === 'upcoming')),
  get: (id) => delay(meetings.find((m) => m.id === id) ?? null),
  coach: () => delay(coachAdi),
};

export const mockCommunity: CommunityApi = {
  communities: () => delay(communities),
};

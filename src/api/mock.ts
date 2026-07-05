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
  posts,
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
  ChatMessage,
  CheckinsApi,
  CommunityApi,
  ContentApi,
  DirectoryUser,
  GameApi,
  GameState,
  Group,
  GroupsApi,
  InsightsApi,
  Lesson,
  MeResult,
  FavoritesApi,
  AssessmentResponseRecord,
  AssessmentsApi,
  MeetingsApi,
  MessagesApi,
  Module,
  OnboardingApi,
  OnboardingProfile,
  PostsApi,
  ProblemOption,
  Program,
  Snippet,
  Thread,
  Workshop,
  XpApi,
  XpPeriod,
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
  favoriteLessons: () => delay<Lesson[]>([]),
  favoriteVideos: () => delay(recommendedVideos.slice(0, 2)),
  lessonsByIds: (ids) =>
    delay(workshops.map((w, i) => toLesson(w, i, 'lesson')).filter((l) => ids.includes(l.id))),
  videosByIds: (ids) => delay(recommendedVideos.filter((v) => ids.includes(v.id))),
  quotes: () => delay(quotes),
  challenges: () => delay(challenges),
  markVideoWatched: (videoId, _appUserId, percent) => {
    const id = String(videoId);
    const pct = Math.max(0, Math.min(100, Math.round(percent)));
    mockWatched.set(id, Math.max(mockWatched.get(id) ?? 0, pct)); // keep furthest
    return delay(undefined);
  },
  // Only completed videos (≥95%) count as watched for the checklist.
  watchedVideoIds: () =>
    delay([...mockWatched.entries()].filter(([, p]) => p >= 95).map(([id]) => id)),
};

// In-memory watch progress for the mock adapter (video id → furthest percent).
const mockWatched = new Map<string, number>();

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

// Onboarding — offline/dev. Mirrors the DB-driven problem taxonomy so the flow
// is testable on the mock; status never forces onboarding (no real gate offline).
const MOCK_PROBLEMS: ProblemOption[] = [
  { id: '45', enumId: 0, title: 'Alcohol', category: 'substance' },
  { id: '46', enumId: 1, title: 'Cannabis', category: 'substance' },
  { id: '47', enumId: 2, title: 'Methamphetamine', category: 'substance' },
  { id: '48', enumId: 3, title: 'Cocaine', category: 'substance' },
  { id: '49', enumId: 4, title: 'Opiates', category: 'substance' },
  { id: '54', enumId: 9, title: 'Nicotine', category: 'substance' },
  { id: '50', enumId: 5, title: 'Sex & pornography', category: 'behavioral' },
  { id: '51', enumId: 6, title: 'Food', category: 'behavioral' },
  { id: '52', enumId: 7, title: 'Gambling', category: 'behavioral' },
  { id: '60', enumId: 10, title: 'Anger management', category: 'behavioral' },
  { id: '61', enumId: 11, title: 'Impulsivity', category: 'behavioral' },
  { id: '62', enumId: 12, title: 'Depression', category: 'mental_health' },
  { id: '63', enumId: 13, title: 'Anxiety', category: 'mental_health' },
  { id: '64', enumId: 14, title: 'Stress & burnout', category: 'mental_health' },
];

let mockOnboardingProfile: OnboardingProfile | null = null;

export const mockOnboarding: OnboardingApi = {
  status: () =>
    delay({
      completed: !!mockOnboardingProfile?.completedAt,
      isExistingUser: false,
      needsOnboarding: false,
      completedAt: mockOnboardingProfile?.completedAt ?? null,
    }),
  problems: () => delay(MOCK_PROBLEMS),
  get: () => delay(mockOnboardingProfile),
  save: (input) => {
    const base: OnboardingProfile = mockOnboardingProfile ?? {
      birthDate: null,
      gender: null,
      genderSelf: null,
      orientation: null,
      race: null,
      primaryProblem: null,
      secondaryProblems: [],
      acceptedTermsAt: null,
      completedAt: null,
    };
    mockOnboardingProfile = { ...base, ...input };
    return delay(undefined);
  },
};

// Assessments — offline/dev in-memory store.
let mockAssessmentRows: AssessmentResponseRecord[] = [];
export const mockAssessments: AssessmentsApi = {
  list: () => delay([...mockAssessmentRows].sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1))),
  save: (input) => {
    mockAssessmentRows = [
      { ...input, takenAt: new Date().toISOString() },
      ...mockAssessmentRows,
    ];
    return delay(undefined);
  },
};

// XP ledger — offline/dev. A handful of rival totals so the board + movement
// feel real; `mine` accumulates as the mock records events.
let mockXpMine = 0;
const MOCK_RIVALS = [320, 210, 140, 90, 55];
export const mockXp: XpApi = {
  record: (input) => {
    mockXpMine += Math.round(input.points || 0);
    return delay(undefined);
  },
  project: (added) => {
    const total = mockXpMine + Math.round(added || 0);
    const currentRank = MOCK_RIVALS.filter((r) => r > mockXpMine).length + 1;
    const projectedRank = MOCK_RIVALS.filter((r) => r > total).length + 1;
    return delay({
      myPoints: mockXpMine,
      currentRank,
      projectedRank,
      totalPlayers: MOCK_RIVALS.length + 1,
    });
  },
  leaderboard: (_period: XpPeriod = 'week') => {
    const rows = [...MOCK_RIVALS.map((p, i) => ({ p, name: `Member ${i + 1}`, you: false })), { p: mockXpMine, name: 'You', you: true }]
      .sort((a, b) => b.p - a.p)
      .map((r, i) => ({ id: String(i), rank: i + 1, name: r.name, avatar: '', points: r.p, you: r.you }));
    return delay(rows);
  },
};

// A few months of daily entries for offline/dev — mostly clean days with the
// occasional 1-2 uses, gently declining over time.
const mockUseTracking = Array.from({ length: 90 }, (_, i) => {
  const used = i % 7 === 0 || i % 11 === 0; // sparse use days
  return {
    at: new Date(2026, 3, 1 + i).toISOString(),
    amount: used ? ((i % 3) + 1) : 0,
    used,
  };
});

export const mockInsights: InsightsApi = {
  wheelHistory: (anchor) => delay(wheelHistory(anchor?.current ?? 71, anchor?.last ?? 67)),
  wheelAreas: () => delay(wheelAreas),
  reports: () => delay(reports),
  // Offline: fake per-board + per-period movement by scaling + re-ranking the
  // seed board, so each board/period shows a distinct, plausible order.
  leaderboard: (board = 'points', period = 'all') => {
    // Board scale: streak → small day counts; counts → tens; points → the seed.
    const boardScale =
      board === 'streak' ? 0.02 : board === 'points' ? 1 : 0.03;
    const periodFactor = period === 'week' ? 0.2 : period === 'month' ? 0.5 : 1;
    const ranked = leaderboard
      .map((e, i) => {
        const raw = e.points * boardScale * periodFactor * (1 + ((i * (period === 'week' ? 7 : 3)) % 5) / 10);
        return { ...e, points: Math.max(board === 'points' ? 1 : 1, Math.round(raw)) };
      })
      .sort((a, b) => b.points - a.points)
      .map((e, i) => ({ ...e, rank: i + 1 }));
    return delay(ranked);
  },
  useTracking: () => delay(mockUseTracking),
  assessments: () =>
    delay([
      { id: 'audit', name: 'IGNTD AUDIT', takenAt: '2026-06-27', score: 6 },
      { id: 'qol', name: 'Quality of Life Assessment', takenAt: '2026-06-20', score: 72 },
      { id: 'assist', name: 'The ASSIST', takenAt: '2026-06-10', score: 14 },
    ]),
  // Offline: the retake persists to the local store only (no backend to write to).
  saveWheel: () => delay(undefined),
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

// Offline feed from the seed posts; writes are no-ops (no backend to persist to).
export const mockPosts: PostsApi = {
  feed: () => delay(posts.map((p) => ({ ...p, commentsCount: p.comments.length }))),
  post: (id) => delay(posts.find((p) => p.id === id) ?? null),
  comments: (postRef) =>
    delay(
      (posts.find((p) => p.id === postRef)?.comments ?? []).map((c) => ({
        id: c.id,
        postRef,
        parentRef: null,
        author: c.author,
        avatar: c.avatar,
        handle: null,
        text: c.text,
        time: c.time,
      })),
    ),
  createPost: () => delay(undefined),
  createComment: () => delay(undefined),
};

// Mock keeps check-ins device-local (the store handles persistence offline).
export const mockCheckins: CheckinsApi = {
  list: () => delay([]),
  save: () => delay(undefined),
};

// Favorites persist only in the local store offline.
export const mockFavorites: FavoritesApi = {
  list: () => delay([]),
  set: () => delay(undefined),
};

// --- Mock chat: in-memory conversation model for the session (offline dev). ---
type MockConv = { id: string; isGroup: boolean; title: string | null; members: string[] };
type MockMsg = { id: string; convId: string; mine: boolean; senderId: string | null; text: string; at: number; read: boolean };
const mockConvs: MockConv[] = [];
const mockChat: MockMsg[] = [];
let mockConvSeq = 1;
let mockChatSeq = 1;
const mockPeople: DirectoryUser[] = [
  { userId: '1', name: 'Adi Jaffe (Coach)', avatar: '', handle: 'adi' },
  { userId: '2', name: 'James K.', avatar: '', handle: 'jamesk' },
  { userId: '3', name: 'Maya R.', avatar: '', handle: 'maya' },
  { userId: '4', name: 'Sam P.', avatar: '', handle: 'samp' },
];
const mockBlocked = new Set<string>();
const mockPerson = (id: string) => mockPeople.find((p) => p.userId === id);
const mockNames = (ids: string[]) => ids.map((id) => mockPerson(id)?.name ?? 'Member').join(', ');

export const mockMessages: MessagesApi = {
  threads: (): Promise<Thread[]> => {
    const threads = mockConvs.map((c) => {
      const msgs = mockChat.filter((m) => m.convId === c.id);
      const last = msgs[msgs.length - 1];
      return {
        conversationId: c.id,
        name: c.isGroup ? c.title || mockNames(c.members) : mockPerson(c.members[0])?.name ?? 'Member',
        avatar: c.isGroup ? '' : mockPerson(c.members[0])?.avatar ?? '',
        isGroup: c.isGroup,
        otherCount: c.members.length,
        peerId: c.isGroup ? null : c.members[0] ?? null,
        last: last?.text ?? '',
        time: last ? 'now' : '',
        unread: msgs.filter((m) => !m.mine && !m.read).length,
      } satisfies Thread;
    });
    return delay(threads);
  },
  messages: (conversationId): Promise<ChatMessage[]> =>
    delay(
      mockChat
        .filter((m) => m.convId === conversationId)
        .map((m) => ({
          id: m.id,
          mine: m.mine,
          senderId: m.senderId,
          senderName: m.mine ? 'You' : mockPerson(m.senderId ?? '')?.name ?? 'Member',
          senderAvatar: m.mine ? '' : mockPerson(m.senderId ?? '')?.avatar ?? '',
          text: m.text,
          time: 'now',
          createdAt: new Date(m.at).toISOString(),
        })),
    ),
  send: (conversationId, text) => {
    mockChat.push({ id: `m${mockChatSeq++}`, convId: conversationId, mine: true, senderId: null, text, at: Date.now(), read: true });
    return delay(undefined);
  },
  markRead: (conversationId) => {
    mockChat.forEach((m) => {
      if (m.convId === conversationId && !m.mine) m.read = true;
    });
    return delay(undefined);
  },
  directory: (search) => {
    const term = search?.trim().toLowerCase();
    return delay(
      mockPeople.filter(
        (p) =>
          !mockBlocked.has(p.userId) &&
          (!term || p.name.toLowerCase().includes(term) || (p.handle ?? '').includes(term)),
      ),
    );
  },
  blockedIds: () => delay([...mockBlocked]),
  setBlock: (userId, on) => {
    if (on) mockBlocked.add(userId);
    else mockBlocked.delete(userId);
    return delay(undefined);
  },
  startDirect: (otherUserId) => {
    const existing = mockConvs.find((c) => !c.isGroup && c.members.length === 1 && c.members[0] === otherUserId);
    if (existing) return delay(existing.id);
    const conv: MockConv = { id: `c${mockConvSeq++}`, isGroup: false, title: null, members: [otherUserId] };
    mockConvs.push(conv);
    return delay(conv.id);
  },
  startGroup: (memberIds, title) => {
    const conv: MockConv = { id: `c${mockConvSeq++}`, isGroup: true, title: title ?? null, members: [...memberIds] };
    mockConvs.push(conv);
    return delay(conv.id);
  },
};

// --- Mock coaching groups (offline dev; sign-up state kept in-memory). ---
const mockGroupData: Group[] = [
  {
    id: '1',
    title: 'Monday - Gratitude Group',
    coachName: 'Coach Belle',
    coachAvatar: '',
    description:
      'Start your week with gratitude + mindfulness — meditation, journaling, and sharing. Leave grounded and ready for the week.',
    meetDay: 'Monday',
    meetTimeChar: '9:00 AM',
    meetLengthChar: '60 Min',
    sourceTz: 'America/Los_Angeles',
    zoomMeetingId: '84569311345',
    signedUp: false,
    joinUrl: 'https://us06web.zoom.us/j/84569311345',
  },
  {
    id: '2',
    title: "Monday - Inclusive Men's",
    coachName: 'Dr. Jaffe',
    coachAvatar: '',
    description:
      'A group for men, male-identifying, non-binary, or gender non-conforming members to focus on challenges unique to them.',
    meetDay: 'Monday',
    meetTimeChar: '5:00 PM',
    meetLengthChar: '60 Min',
    sourceTz: 'America/Los_Angeles',
    zoomMeetingId: '89270133935',
    signedUp: false,
    joinUrl: 'https://us06web.zoom.us/j/89270133935',
  },
  {
    id: '3',
    title: 'Tuesday - Dr. Jaffe Deep Dive',
    coachName: 'Dr. Jaffe',
    coachAvatar: '',
    description: "Dr. Jaffe's weekly group diving deep into individual topics with participation.",
    meetDay: 'Tuesday',
    meetTimeChar: '12:00 PM',
    meetLengthChar: '60 Min',
    sourceTz: 'America/Los_Angeles',
    zoomMeetingId: '85400136812',
    signedUp: false,
    joinUrl: 'https://us06web.zoom.us/j/85400136812',
  },
];
const mockSignups = new Set<string>();

export const mockGroups: GroupsApi = {
  list: () =>
    delay(
      mockGroupData.map((g) => {
        const signedUp = mockSignups.has(g.id);
        return { ...g, signedUp, joinUrl: signedUp ? g.joinUrl : null };
      }),
    ),
  setSignup: (groupId, on) => {
    if (on) mockSignups.add(groupId);
    else mockSignups.delete(groupId);
    return delay(undefined);
  },
};

let mockGameState: GameState | null = null;

export const mockGame: GameApi = {
  get: () => delay(mockGameState),
  save: (state) => {
    // Mirror the backend's MAX-merge so the mock behaves like production.
    const prev = mockGameState;
    const badges: Record<string, number> = { ...(prev?.streakBadges ?? {}) };
    for (const [k, v] of Object.entries(state.streakBadges ?? {})) {
      badges[k] = Math.max(badges[k] ?? 0, v);
    }
    const newerRun =
      !!state.streakRunStart && (!prev?.streakRunStart || state.streakRunStart > prev.streakRunStart);
    mockGameState = {
      videoPoints: Math.max(prev?.videoPoints ?? 0, state.videoPoints),
      streakBonusPoints: Math.max(prev?.streakBonusPoints ?? 0, state.streakBonusPoints),
      streakCreditedDays: newerRun
        ? state.streakCreditedDays
        : Math.max(prev?.streakCreditedDays ?? 0, state.streakCreditedDays),
      streakRunStart:
        (prev?.streakRunStart ?? '') > (state.streakRunStart ?? '')
          ? prev?.streakRunStart ?? null
          : state.streakRunStart,
      streakBadges: badges,
    };
    return delay(undefined);
  },
};

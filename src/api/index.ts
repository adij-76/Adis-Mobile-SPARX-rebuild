/**
 * The single entry point screens import: `import { api } from '@/api'`.
 *
 * Today it resolves to Supabase (if configured) or the local mock. Moving to C
 * (your own tRPC/Drizzle API) later = adding `./trpc` and switching here — no
 * screen changes.
 */
import {
  mockAdmin,
  mockAssessments,
  mockAuth,
  mockCheckins,
  mockCommunity,
  mockConnections,
  mockContent,
  mockExercises,
  mockFavorites,
  mockGame,
  mockGroups,
  mockInsights,
  mockMeetings,
  mockMessages,
  mockOnboarding,
  mockPosts,
  mockXp,
} from '@/api/mock';
import {
  supabaseAdmin,
  supabaseAssessments,
  supabaseAuth,
  supabaseCheckins,
  supabaseCommunity,
  supabaseConnections,
  supabaseContent,
  supabaseExercises,
  supabaseFavorites,
  supabaseGame,
  supabaseGroups,
  supabaseInsights,
  supabaseMeetings,
  supabaseMessages,
  supabaseOnboarding,
  supabasePosts,
  supabaseXp,
} from '@/api/supabase';
import type { Api } from '@/api/types';

// Require BOTH the URL and the anon key before using Supabase. Keying only off
// the URL meant a missing/blank anon key silently ran the whole app on sample
// data while `backend` still reported "supabase" (audit C-H2). Fail over to the
// mock cleanly instead, and warn loudly in dev when exactly one is set (a
// half-configured env is almost always a mistake).
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const useSupabase = !!SUPABASE_URL && !!SUPABASE_ANON;

if (__DEV__ && !!SUPABASE_URL !== !!SUPABASE_ANON) {
  console.warn(
    `[api] Supabase is half-configured — URL ${SUPABASE_URL ? 'set' : 'MISSING'}, ` +
      `ANON key ${SUPABASE_ANON ? 'set' : 'MISSING'}. Both EXPO_PUBLIC_SUPABASE_URL and ` +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY are required; running on sample data until both are set.',
  );
}

export const api: Api = {
  backend: useSupabase ? 'supabase' : 'mock',
  auth: useSupabase ? supabaseAuth : mockAuth,
  onboarding: useSupabase ? supabaseOnboarding : mockOnboarding,
  assessments: useSupabase ? supabaseAssessments : mockAssessments,
  exercises: useSupabase ? supabaseExercises : mockExercises,
  xp: useSupabase ? supabaseXp : mockXp,
  content: useSupabase ? supabaseContent : mockContent,
  insights: useSupabase ? supabaseInsights : mockInsights,
  meetings: useSupabase ? supabaseMeetings : mockMeetings,
  community: useSupabase ? supabaseCommunity : mockCommunity,
  posts: useSupabase ? supabasePosts : mockPosts,
  favorites: useSupabase ? supabaseFavorites : mockFavorites,
  checkins: useSupabase ? supabaseCheckins : mockCheckins,
  messages: useSupabase ? supabaseMessages : mockMessages,
  groups: useSupabase ? supabaseGroups : mockGroups,
  game: useSupabase ? supabaseGame : mockGame,
  admin: useSupabase ? supabaseAdmin : mockAdmin,
  connections: useSupabase ? supabaseConnections : mockConnections,
};

export { setSupabaseToken, setOnUnauthorized } from '@/api/supabase';

export type {
  AdminApi,
  AdminOverview,
  AdminActiveTester,
  Api,
  AssessmentResponseRecord,
  AssessmentsApi,
  AuthApi,
  AuthSession,
  AuthUser,
  ChatMessage,
  CommunityApi,
  Connection,
  ConnectionsApi,
  ContentApi,
  DirectoryUser,
  ExerciseAnswerInput,
  ExerciseInputKind,
  ExerciseQuestion,
  ExerciseResponse,
  ExercisesApi,
  ExerciseWorksheet,
  Group,
  GroupsApi,
  InsightsApi,
  LeaderboardBoard,
  LeaderboardPeriod,
  Lesson,
  MeResult,
  MeetingsApi,
  MessagesApi,
  NameChangeRequest,
  Module,
  OnboardingApi,
  OnboardingProfile,
  OnboardingStatus,
  ProblemOption,
  Program,
  Snippet,
  XpApi,
  XpAwardInput,
  XpPeriod,
  XpProjection,
  Thread,
  WheelPoint,
  Workshop,
} from '@/api/types';

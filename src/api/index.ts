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

const useSupabase = !!process.env.EXPO_PUBLIC_SUPABASE_URL;

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

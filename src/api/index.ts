/**
 * The single entry point screens import: `import { api } from '@/api'`.
 *
 * Today it resolves to Supabase (if configured) or the local mock. Moving to C
 * (your own tRPC/Drizzle API) later = adding `./trpc` and switching here — no
 * screen changes.
 */
import {
  mockAuth,
  mockCheckins,
  mockCommunity,
  mockContent,
  mockFavorites,
  mockGroups,
  mockInsights,
  mockMeetings,
  mockMessages,
  mockPosts,
} from '@/api/mock';
import {
  supabaseAuth,
  supabaseCheckins,
  supabaseCommunity,
  supabaseContent,
  supabaseFavorites,
  supabaseGroups,
  supabaseInsights,
  supabaseMeetings,
  supabaseMessages,
  supabasePosts,
} from '@/api/supabase';
import type { Api } from '@/api/types';

const useSupabase = !!process.env.EXPO_PUBLIC_SUPABASE_URL;

export const api: Api = {
  backend: useSupabase ? 'supabase' : 'mock',
  auth: useSupabase ? supabaseAuth : mockAuth,
  content: useSupabase ? supabaseContent : mockContent,
  insights: useSupabase ? supabaseInsights : mockInsights,
  meetings: useSupabase ? supabaseMeetings : mockMeetings,
  community: useSupabase ? supabaseCommunity : mockCommunity,
  posts: useSupabase ? supabasePosts : mockPosts,
  favorites: useSupabase ? supabaseFavorites : mockFavorites,
  checkins: useSupabase ? supabaseCheckins : mockCheckins,
  messages: useSupabase ? supabaseMessages : mockMessages,
  groups: useSupabase ? supabaseGroups : mockGroups,
};

export { setSupabaseToken, setOnUnauthorized } from '@/api/supabase';

export type {
  Api,
  AuthApi,
  AuthSession,
  AuthUser,
  ChatMessage,
  CommunityApi,
  ContentApi,
  DirectoryUser,
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
  Program,
  Snippet,
  Thread,
  WheelPoint,
  Workshop,
} from '@/api/types';

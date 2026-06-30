/**
 * The single entry point screens import: `import { api } from '@/api'`.
 *
 * Today it resolves to Supabase (if configured) or the local mock. Moving to C
 * (your own tRPC/Drizzle API) later = adding `./trpc` and switching here — no
 * screen changes.
 */
import { mockCommunity, mockContent, mockInsights, mockMeetings } from '@/api/mock';
import { supabaseCommunity, supabaseContent, supabaseInsights, supabaseMeetings } from '@/api/supabase';
import type { Api } from '@/api/types';

const useSupabase = !!process.env.EXPO_PUBLIC_SUPABASE_URL;

export const api: Api = {
  backend: useSupabase ? 'supabase' : 'mock',
  content: useSupabase ? supabaseContent : mockContent,
  insights: useSupabase ? supabaseInsights : mockInsights,
  meetings: useSupabase ? supabaseMeetings : mockMeetings,
  community: useSupabase ? supabaseCommunity : mockCommunity,
};

export type {
  Api,
  CommunityApi,
  ContentApi,
  InsightsApi,
  Lesson,
  MeetingsApi,
  Module,
  Program,
  Snippet,
  WheelPoint,
  Workshop,
} from '@/api/types';

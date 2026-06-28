/**
 * The single entry point screens import: `import { api } from '@/api'`.
 *
 * Today it resolves to Supabase (if configured) or the local mock. Moving to C
 * (your own tRPC/Drizzle API) later = adding `./trpc` and switching here — no
 * screen changes.
 */
import { mockContent, mockInsights } from '@/api/mock';
import { supabaseContent, supabaseInsights } from '@/api/supabase';
import type { Api } from '@/api/types';

const useSupabase = !!process.env.EXPO_PUBLIC_SUPABASE_URL;

export const api: Api = {
  backend: useSupabase ? 'supabase' : 'mock',
  content: useSupabase ? supabaseContent : mockContent,
  insights: useSupabase ? supabaseInsights : mockInsights,
};

export type {
  Api,
  ContentApi,
  InsightsApi,
  Lesson,
  Module,
  Program,
  Snippet,
  WheelPoint,
  Workshop,
} from '@/api/types';

/**
 * The single entry point screens import: `import { api } from '@/api'`.
 *
 * Today it resolves to Supabase (if configured) or the local mock. Moving to C
 * (your own tRPC/Drizzle API) later = adding `./trpc` and switching here — no
 * screen changes.
 */
import { mockContent } from '@/api/mock';
import { supabaseContent } from '@/api/supabase';
import type { Api } from '@/api/types';

const useSupabase = !!process.env.EXPO_PUBLIC_SUPABASE_URL;

export const api: Api = {
  backend: useSupabase ? 'supabase' : 'mock',
  content: useSupabase ? supabaseContent : mockContent,
};

export type { Api, ContentApi, Lesson, Module, Program, Snippet, Workshop } from '@/api/types';

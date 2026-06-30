/**
 * Supabase adapter — talks to PostgREST over plain HTTP (no SDK, so it works
 * identically on web + native). Reads from the read-only mobile views defined
 * in docs/content-api-spec.md. RLS enforces per-user access.
 *
 * Activated when EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY are set.
 * A logged-in user's JWT (once auth lands) replaces the anon key in Authorization.
 */
import type { ContentApi, InsightsApi, Lesson, LessonType, Module, Program, Snippet, WheelPoint, Workshop } from '@/api/types';

const BASE = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Set after login; until auth lands we fall back to the anon key.
let authToken: string | null = null;
export function setSupabaseToken(token: string | null) {
  authToken = token;
}

async function rest<T>(view: string, query: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(query).toString();
  const res = await fetch(`${BASE}/rest/v1/${view}${qs ? `?${qs}` : ''}`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${authToken ?? ANON}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase ${view} → ${res.status}`);
  return (await res.json()) as T;
}

// --- row → domain mappers (views return snake_case) ---
type ProgramRow = { id: number | string; name: string; active: boolean };
type ModuleRow = { id: number | string; program_id: number | string; title: string; order: number };
type LessonRow = {
  id: number | string;
  portion_id: number | string;
  title: string;
  nav_title: string;
  position: number;
  description: string;
  vimeo_url: string;
  vimeo_id: number | null;
  lesson_type: LessonType;
  worksheet_url: string | null;
  thumbnail: string | null;
  progress?: number;
  rating?: number;
  favorite?: boolean;
};
type SnippetRow = {
  id: number | string;
  lesson_id: number | string | null;
  title: string | null;
  description: string | null; // the DB "title" text (title-is-description convention)
  summary: string | null; // ai_summary — the generated long description
  length_seconds: number | null;
  vimeo_url: string | null;
  vimeo_id: number | null;
  ai_generated: boolean;
};

/** Fall back to constructing a Vimeo watch URL from the numeric id when the
 *  url column is empty, so videos with only a vimeo_id still play. */
const vimeoUrlFrom = (url: string | null, id: number | null): string | null =>
  url || (id != null ? `https://vimeo.com/${id}` : null);

const toLesson = (r: LessonRow): Lesson => ({
  id: String(r.id),
  moduleId: String(r.portion_id),
  title: r.title,
  navTitle: r.nav_title,
  position: r.position,
  description: r.description,
  vimeoUrl: vimeoUrlFrom(r.vimeo_url, r.vimeo_id),
  vimeoId: r.vimeo_id,
  lessonType: r.lesson_type,
  worksheetUrl: r.worksheet_url,
  thumbnail: r.thumbnail,
  progress: r.progress,
  rating: r.rating,
  favorite: r.favorite,
});

export const supabaseContent: ContentApi = {
  async programs() {
    const rows = await rest<ProgramRow[]>('mobile_programs', { order: 'name' });
    return rows.map((r) => ({ id: String(r.id), name: r.name, active: r.active }) satisfies Program);
  },
  async modules(programId) {
    const rows = await rest<ModuleRow[]>('mobile_modules', {
      program_id: `eq.${programId}`,
      order: 'order',
    });
    return rows.map(
      (r) => ({ id: String(r.id), programId: String(r.program_id), title: r.title, order: r.order }) satisfies Module,
    );
  },
  async module(id) {
    const rows = await rest<ModuleRow[]>('mobile_modules', { id: `eq.${id}`, limit: '1' });
    return rows.length
      ? { id: String(rows[0].id), programId: String(rows[0].program_id), title: rows[0].title, order: rows[0].order }
      : null;
  },
  async moduleLessons(moduleId) {
    const rows = await rest<LessonRow[]>('mobile_lessons', {
      portion_id: `eq.${moduleId}`,
      lesson_type: 'eq.lesson',
      order: 'position',
    });
    return rows.map(toLesson);
  },
  async lesson(id) {
    const rows = await rest<LessonRow[]>('mobile_lessons', { id: `eq.${id}`, limit: '1' });
    return rows.length ? toLesson(rows[0]) : null;
  },
  async workshops() {
    const rows = await rest<LessonRow[]>('mobile_lessons', {
      lesson_type: 'eq.workshop',
      order: 'position',
    });
    return rows.map(toLesson) as Workshop[];
  },
  async snippets() {
    const rows = await rest<SnippetRow[]>('mobile_snippets', { order: 'created_at.desc' });
    return rows.map(
      (r) =>
        ({
          id: String(r.id),
          lessonId: r.lesson_id != null ? String(r.lesson_id) : null,
          // The human title lives in the DB `description` column (title col is mostly empty).
          title: r.title || r.description,
          // The shown description is the AI summary.
          description: r.summary,
          lengthSeconds: r.length_seconds,
          vimeoUrl: vimeoUrlFrom(r.vimeo_url, r.vimeo_id),
          vimeoId: r.vimeo_id,
          aiGenerated: r.ai_generated,
        }) satisfies Snippet,
    );
  },
};

type WheelScoreRow = { month_key: string; label: string; year: number; score: number };

export const supabaseInsights: InsightsApi = {
  // anchor is ignored — Supabase returns the user's real monthly history (RLS-scoped).
  async wheelHistory() {
    const rows = await rest<WheelScoreRow[]>('mobile_wheel_scores', {
      order: 'month_key.asc',
      limit: '12',
    });
    return rows.map(
      (r) =>
        ({ key: r.month_key, label: r.label, year: r.year, score: r.score }) satisfies WheelPoint,
    );
  },
};

/**
 * Supabase adapter — talks to PostgREST over plain HTTP (no SDK, so it works
 * identically on web + native). Reads from the read-only mobile views defined
 * in docs/content-api-spec.md. RLS enforces per-user access.
 *
 * Activated when EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY are set.
 * A logged-in user's JWT (once auth lands) replaces the anon key in Authorization.
 */
import type {
  AuthApi,
  AuthSession,
  AuthUser,
  CommunityApi,
  ContentApi,
  InsightsApi,
  Lesson,
  LessonType,
  MeetingsApi,
  Module,
  Program,
  Quote,
  Snippet,
  WheelPoint,
  Workshop,
} from '@/api/types';
// Auxiliary surfaces (recommended-video rail, quotes, challenges, meetings,
// community, wheel areas, reports, leaderboard) don't have Supabase views yet,
// so the live backend serves the same seed data the mock does. When a view
// lands, swap the individual method here — screens already call through `api`.
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
} from '@/data/content';

type QuoteRow = { id: number | string; text: string; author: string | null; mood: string | null };

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
  // No dedicated views yet — serve the seed data (see header note).
  async recommendedVideos() {
    return recommendedVideos;
  },
  async quotes() {
    // Read the DB quotes when the view exists; fall back to seed quotes so the
    // app keeps working until `mobile_quotes` is created.
    try {
      const rows = await rest<QuoteRow[]>('mobile_quotes', { order: 'id' });
      if (!rows.length) return quotes;
      return rows.map(
        (r) =>
          ({
            id: String(r.id),
            text: r.text,
            author: r.author || 'Unknown',
            mood: (r.mood as Quote['mood']) || 'steady',
          }) satisfies Quote,
      );
    } catch {
      return quotes;
    }
  },
  async challenges() {
    return challenges;
  },
};

export const supabaseMeetings: MeetingsApi = {
  // TODO: back with mobile_meetings / mobile_coach views.
  async all() {
    return meetings;
  },
  async upcoming() {
    return meetings.filter((m) => m.status === 'upcoming');
  },
  async get(id) {
    return meetings.find((m) => m.id === id) ?? null;
  },
  async coach() {
    return coachAdi;
  },
};

export const supabaseCommunity: CommunityApi = {
  // TODO: back with a mobile_communities view.
  async communities() {
    return communities;
  },
};

type WheelScoreRow = { month_key: string; label: string; year: number; score: number };

export const supabaseInsights: InsightsApi = {
  // anchor is ignored — Supabase returns the user's real monthly history (RLS-scoped).
  async wheelHistory() {
    // Take the most recent 12 months (limit applies after the sort, so sort
    // descending), then reverse to oldest → newest for the trend charts.
    const rows = await rest<WheelScoreRow[]>('mobile_wheel_scores', {
      order: 'month_key.desc',
      limit: '12',
    });
    return rows
      .map((r) => ({ key: r.month_key, label: r.label, year: r.year, score: r.score }) satisfies WheelPoint)
      .reverse();
  },
  // No dedicated views yet — serve the seed data (see header note).
  async wheelAreas() {
    return wheelAreas;
  },
  async reports() {
    return reports;
  },
  async leaderboard() {
    return leaderboard;
  },
};

// --- Auth (Supabase GoTrue over REST; no SDK, same as the data layer) ---

type GoTrueUser = {
  id: string;
  email: string;
  user_metadata?: { name?: string; full_name?: string } | null;
};
type GoTrueSession = {
  access_token: string;
  refresh_token: string;
  user: GoTrueUser;
};

const authHeaders = { apikey: ANON, 'Content-Type': 'application/json' };

function toAuthUser(u: GoTrueUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name ?? u.user_metadata?.full_name ?? null,
    appUserId: null, // resolved separately via me()
  };
}

async function goTrue(path: string, body: unknown): Promise<GoTrueSession> {
  const res = await fetch(`${BASE}/auth/v1/${path}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error_description || data?.msg || data?.error || `Auth failed (${res.status})`);
  }
  if (!data?.access_token) {
    // signup with email-confirmation on returns a user but no session.
    throw new Error('Check your email to confirm your account, then sign in.');
  }
  return data as GoTrueSession;
}

const toSession = (s: GoTrueSession): AuthSession => ({
  user: toAuthUser(s.user),
  accessToken: s.access_token,
  refreshToken: s.refresh_token,
});

export const supabaseAuth: AuthApi = {
  async signIn(email, password) {
    return toSession(await goTrue('token?grant_type=password', { email, password }));
  },
  async signUp(email, password) {
    return toSession(await goTrue('signup', { email, password }));
  },
  async refresh(refreshToken) {
    return toSession(await goTrue('token?grant_type=refresh_token', { refresh_token: refreshToken }));
  },
  async signOut(accessToken) {
    if (!accessToken) return;
    await fetch(`${BASE}/auth/v1/logout`, {
      method: 'POST',
      headers: { ...authHeaders, Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  },
  async me(email) {
    // mobile_me maps the auth email → the production users row that owns the
    // user's real data. Optional: falls back to null until the view exists.
    try {
      const rows = await rest<{ app_user_id: string | number; name: string | null }[]>('mobile_me', {
        email: `eq.${email}`,
        limit: '1',
      });
      return rows.length ? { appUserId: String(rows[0].app_user_id), name: rows[0].name } : null;
    } catch {
      return null;
    }
  },
};

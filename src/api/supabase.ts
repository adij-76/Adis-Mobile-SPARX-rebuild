/**
 * Supabase adapter — talks to PostgREST over plain HTTP (no SDK, so it works
 * identically on web + native). Reads from the read-only mobile views defined
 * in docs/content-api-spec.md. RLS enforces per-user access.
 *
 * Activated when EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY are set.
 * A logged-in user's JWT (once auth lands) replaces the anon key in Authorization.
 */
import type {
  AssessmentsApi,
  AuthApi,
  AuthSession,
  AuthUser,
  CheckinRecord,
  LeaderboardEntry,
  XpApi,
  XpPeriod,
  XpProjection,
  CheckinsApi,
  Community,
  ChatMessage,
  CommunityApi,
  ContentApi,
  DirectoryUser,
  FavoritesApi,
  GameApi,
  GameState,
  Group,
  GroupsApi,
  InsightsApi,
  Lesson,
  LessonType,
  MeResult,
  MeetingsApi,
  MessagesApi,
  Module,
  OnboardingApi,
  OnboardingProfile,
  OnboardingStatus,
  Post,
  PostsApi,
  ProblemOption,
  Program,
  Quote,
  Snippet,
  Thread,
  VideoItem,
  WheelEntryInput,
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
  posts,
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

// Called when an authenticated request comes back 401 — i.e. the user's access
// token is expired/invalid. The auth layer registers a handler that refreshes
// the session or, failing that, drops to guest so the login gate takes over.
// Without this, an expired session silently 401s and every adapter falls back
// to seed data — the app looks "logged in" but shows generic content.
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb;
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
  // A 401 only happens with a bad/expired bearer token; the anon key never
  // 401s. So a 401 here means a signed-in user's token died — signal the auth
  // layer rather than letting the caller swallow it into a seed fallback.
  if (res.status === 401 && authToken) onUnauthorized?.();
  if (!res.ok) throw new Error(`Supabase ${view} → ${res.status}`);
  return (await res.json()) as T;
}

// --- row → domain mappers (views return snake_case) ---
type ProgramRow = { id: number | string; name: string; active: boolean };
type ModuleRow = { id: number | string; program_id: number | string; title: string; order: number };
type LessonRow = {
  id: number | string;
  module_id: number | string;
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
  accessible?: boolean;
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
  favorite?: boolean;
};

/** Fall back to constructing a Vimeo watch URL from the numeric id when the
 *  url column is empty, so videos with only a vimeo_id still play. */
const vimeoUrlFrom = (url: string | null, id: number | null): string | null =>
  url || (id != null ? `https://vimeo.com/${id}` : null);

/** Seconds → "m:ss" for video duration labels. */
const fmtDuration = (sec: number): string => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const toLesson = (r: LessonRow): Lesson => ({
  id: String(r.id),
  moduleId: String(r.module_id),
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
  accessible: r.accessible,
});

/** Query mobile_snippets and map to VideoItem[] (thumbnails derive from Vimeo). */
async function snippetsToVideos(query: Record<string, string>): Promise<VideoItem[]> {
  try {
    const rows = await rest<SnippetRow[]>('mobile_snippets', query);
    return rows.map(
      (r) =>
        ({
          id: String(r.id),
          title: r.title || r.description || 'SPARx video',
          duration: r.length_seconds ? fmtDuration(r.length_seconds) : '',
          image: '',
          presenter: 'SPARx',
          views: '',
          description: r.summary || '',
          vimeoUrl: vimeoUrlFrom(r.vimeo_url, r.vimeo_id) ?? undefined,
        }) satisfies VideoItem,
    );
  } catch {
    return [];
  }
}

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
      module_id: `eq.${moduleId}`,
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
  // The recommendation engine's per-user picks (mobile_recommended_videos over
  // user_snippets), newest-first. Falls back to seed videos if the view is empty
  // or unavailable, so the rail is never blank. Thumbnails derive from Vimeo
  // client-side (snippets carry no image), same as lessons.
  async recommendedVideos() {
    type RecRow = {
      id: number | string;
      title: string | null;
      description: string | null;
      length_seconds: number | null;
      vimeo_url: string | null;
      vimeo_id: number | null;
    };
    // When the per-user recommendation view is empty/unavailable, fall back to
    // REAL snippets (newest first) — not the stock seed videos — so the home rail
    // shows genuine content with Vimeo thumbnails, never placeholder stock.
    const snippetVideos = async (): Promise<VideoItem[]> => {
      try {
        const rows = await rest<SnippetRow[]>('mobile_snippets', { order: 'created_at.desc,id.desc', limit: '12' });
        if (!rows.length) return recommendedVideos;
        return rows.map(
          (r) =>
            ({
              id: String(r.id),
              title: r.title || r.description || 'SPARx video',
              duration: r.length_seconds ? fmtDuration(r.length_seconds) : '',
              image: '',
              presenter: 'SPARx',
              views: '',
              description: r.summary || '',
              vimeoUrl: vimeoUrlFrom(r.vimeo_url, r.vimeo_id) ?? undefined,
            }) satisfies VideoItem,
        );
      } catch {
        return recommendedVideos;
      }
    };
    try {
      // Stable secondary sort by id: recommended_at (= user_snippets.created_at)
      // ties for batch-recommended snippets, and an unstable order made the home
      // checklist/rail and the video detail resolve different items for the same
      // slice — so a tapped card could open a different video. id.desc pins it.
      const rows = await rest<RecRow[]>('mobile_recommended_videos', {
        order: 'recommended_at.desc,id.desc',
        limit: '40',
      });
      if (!rows.length) return snippetVideos();
      // De-duplicate by snippet id (a snippet can be recommended more than once),
      // keeping the first = newest since rows arrive recommended_at.desc.
      const seen = new Set<string>();
      const unique = rows.filter((r) => {
        const id = String(r.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      return unique.slice(0, 8).map(
        (r) =>
          ({
            id: String(r.id),
            title: r.title || 'SPARx video',
            duration: r.length_seconds ? fmtDuration(r.length_seconds) : '',
            image: '', // derived from Vimeo oEmbed / gradient in the card
            presenter: 'SPARx',
            views: '',
            description: r.description || '',
            vimeoUrl: vimeoUrlFrom(r.vimeo_url, r.vimeo_id) ?? undefined,
          }) satisfies VideoItem,
      );
    } catch {
      return snippetVideos();
    }
  },
  // The user's saved lessons/workshops (mobile_lessons.favorite) — real, from the
  // production favorites table. Empty on error so the tab just shows nothing.
  async favoriteLessons() {
    try {
      const rows = await rest<LessonRow[]>('mobile_lessons', { favorite: 'is.true', order: 'position' });
      return rows.map(toLesson);
    } catch {
      return [];
    }
  },
  // The user's saved snippet videos (mobile_snippets.favorite).
  async favoriteVideos() {
    return snippetsToVideos({ favorite: 'is.true', order: 'created_at.desc' });
  },
  async lessonsByIds(ids) {
    if (!ids.length) return [];
    try {
      const rows = await rest<LessonRow[]>('mobile_lessons', { id: `in.(${ids.join(',')})` });
      return rows.map(toLesson);
    } catch {
      return [];
    }
  },
  async videosByIds(ids) {
    if (!ids.length) return [];
    return snippetsToVideos({ id: `in.(${ids.join(',')})` });
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
  // Record watch progress (app-owned mobile_video_watches) via the
  // mobile_record_watch RPC, which upserts on (auth_uid, video_id) keeping the
  // MAX percent — a partial re-watch never lowers a higher recorded value.
  async markVideoWatched(videoId, appUserId, percent) {
    const idNum = Number(appUserId);
    const pct = Math.max(0, Math.min(100, Math.round(percent)));
    const res = await fetch(`${BASE}/rest/v1/rpc/mobile_record_watch`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${authToken ?? ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        p_video_id: String(videoId),
        p_percent: pct,
        p_app_user_id: Number.isFinite(idNum) ? idNum : null,
      }),
    });
    if (!res.ok) throw new Error(`Video watch save failed (${res.status})`);
  },
  async watchedVideoIds() {
    try {
      // Only completed videos (≥95%) tick the checklist; partial progress is
      // stored but doesn't count as watched here.
      const rows = await rest<{ video_id: string }[]>('mobile_video_watches', {
        select: 'video_id',
        percent: 'gte.95',
      });
      return rows.map((r) => String(r.video_id));
    } catch {
      return [];
    }
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

// comm_channels has no icon column, so assign an Ionicons name + colour by the
// channel's name (deterministic, stable). Falls back to a palette by index.
const CHANNEL_PALETTE = ['#166890', '#38C793', '#FF9D4B', '#7A5AF8', '#E5739B', '#F7C948'];
function channelStyle(name: string, i: number): { icon: string; color: string } {
  const n = name.toLowerCase();
  if (n.includes('women')) return { icon: 'female', color: '#E5739B' };
  if (n.includes('men')) return { icon: 'male', color: '#5B8DEF' };
  if (n.includes('youth')) return { icon: 'happy', color: '#F2A65A' };
  if (n.includes('sober') || n.includes('day')) return { icon: 'leaf', color: '#38C793' };
  if (n.includes('general')) return { icon: 'people', color: '#166890' };
  return { icon: 'chatbubbles', color: CHANNEL_PALETTE[i % CHANNEL_PALETTE.length] };
}

export const supabaseCommunity: CommunityApi = {
  // Real feed communities from mobile_channels (comm_channels). Falls back to the
  // seed set if the view is missing/empty so the tab is never blank.
  async communities() {
    type Row = { id: number | string; name: string; description: string | null; member_count: number | null };
    try {
      const rows = await rest<Row[]>('mobile_channels', { order: 'id' });
      if (!rows.length) return communities;
      return rows.map((r, i) => {
        const { icon, color } = channelStyle(r.name, i);
        return {
          id: String(r.id),
          name: r.name,
          members: r.member_count != null ? String(r.member_count) : '',
          icon,
          color,
          description: r.description ?? undefined,
        } satisfies Community;
      });
    } catch {
      return communities;
    }
  },
};

// --- Community feed (mobile_posts / mobile_comments ∪ app-owned writes) ---
// Author avatars are passed through as-is (empty when the user has none); the
// Avatar component renders a deterministic initials circle in that case.

/** ISO timestamp → short relative label ("now", "5m", "3h", "2d", "4w"). */
function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(d / 365)}y`;
}

type PostRow = {
  id: string;
  comm_channel_id: number | null;
  author_id: number | string | null;
  author: string | null;
  avatar: string | null;
  handle: string | null;
  title: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
  comments_count: number | null;
  reactions_count: number | null;
  reacted: boolean | null;
};

async function channelNameMap(): Promise<Map<string, string>> {
  try {
    const rows = await rest<{ id: number | string; name: string }[]>('mobile_channels', { order: 'id' });
    return new Map(rows.map((r) => [String(r.id), r.name]));
  } catch {
    return new Map();
  }
}

const toPost = (r: PostRow, names: Map<string, string>): Post => ({
  id: String(r.id),
  author: r.author || 'Member',
  authorId: r.author_id != null ? String(r.author_id) : null,
  avatar: r.avatar || '',
  time: relTime(r.created_at),
  community: (r.comm_channel_id != null && names.get(String(r.comm_channel_id))) || 'Community',
  text: r.content ?? '',
  image: r.image_url ?? undefined,
  likes: r.reactions_count ?? 0,
  commentsCount: r.comments_count ?? 0,
  channelId: r.comm_channel_id != null ? String(r.comm_channel_id) : null,
  comments: [],
});

async function postWrite(table: string, body: unknown): Promise<void> {
  const res = await fetch(`${BASE}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${authToken ?? ANON}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${table} write failed (${res.status})`);
}

export const supabasePosts: PostsApi = {
  async feed(channelId) {
    // Falls back to seed posts if mobile_posts is missing/errors, so the tab is
    // never blank. If you see the Maya/David seed posts, the view errored.
    try {
      const [rows, names] = await Promise.all([
        rest<PostRow[]>('mobile_posts', {
          order: 'created_at.desc',
          limit: '100',
          ...(channelId ? { comm_channel_id: `eq.${channelId}` } : {}),
        }),
        channelNameMap(),
      ]);
      return rows.map((r) => toPost(r, names));
    } catch {
      return posts;
    }
  },
  async post(id) {
    const [rows, names] = await Promise.all([
      rest<PostRow[]>('mobile_posts', { id: `eq.${id}`, limit: '1' }),
      channelNameMap(),
    ]);
    return rows.length ? toPost(rows[0], names) : null;
  },
  async comments(postRef) {
    type Row = {
      id: string;
      post_ref: string;
      parent_ref: string | null;
      author: string | null;
      avatar: string | null;
      handle: string | null;
      content: string | null;
      created_at: string;
    };
    const rows = await rest<Row[]>('mobile_comments', { post_ref: `eq.${postRef}`, order: 'created_at' });
    return rows.map((r) => ({
      id: String(r.id),
      postRef: r.post_ref,
      parentRef: r.parent_ref,
      author: r.author || 'Member',
      avatar: r.avatar || '',
      handle: r.handle,
      text: r.content ?? '',
      time: relTime(r.created_at),
    }));
  },
  async createPost({ channelId, title, text, image, appUserId }) {
    const idNum = Number(appUserId);
    await postWrite('mobile_feed_posts', {
      comm_channel_id: channelId != null ? Number(channelId) : null,
      title: title ?? null,
      content: text,
      image_url: image ?? null,
      app_user_id: Number.isFinite(idNum) ? idNum : null,
    });
  },
  async createComment({ postRef, parentRef, text, appUserId }) {
    const idNum = Number(appUserId);
    await postWrite('mobile_feed_comments', {
      post_ref: postRef,
      parent_ref: parentRef ?? null,
      content: text,
      app_user_id: Number.isFinite(idNum) ? idNum : null,
    });
  },
};

type WheelScoreRow = { month_key: string; label: string; year: number; score: number };

export const supabaseInsights: InsightsApi = {
  // anchor is ignored — Supabase returns the user's real monthly history (RLS-scoped).
  async wheelHistory() {
    // Pull the full monthly history (newest-first, then reverse to oldest →
    // newest). The Monthly view slices the recent tail; the Annual view rolls
    // these up per calendar year, so we need more than 12 months here.
    const rows = await rest<WheelScoreRow[]>('mobile_wheel_scores', {
      order: 'month_key.desc',
      limit: '240',
    });
    return rows
      .map((r) => ({ key: r.month_key, label: r.label, year: r.year, score: r.score }) satisfies WheelPoint)
      .reverse();
  },
  // Real per-area current/last from wheel_of_life_scores, merged onto the seed
  // areas (which carry each area's icon/colour/prompt). life_area_id 1..10 maps
  // by order to the seed wheelAreas. Falls back to seed if the user has no scores.
  async wheelAreas() {
    type Row = { life_area_id: number; title: string; current_score: number | null; last_score: number | null };
    try {
      const rows = await rest<Row[]>('mobile_wheel_areas');
      if (!rows.length) return wheelAreas;
      const byId = new Map(rows.map((r) => [Number(r.life_area_id), r]));
      return wheelAreas.map((base, i) => {
        const r = byId.get(i + 1);
        if (!r || r.current_score == null) return base;
        return { ...base, current: r.current_score, last: r.last_score ?? r.current_score };
      });
    } catch {
      return wheelAreas;
    }
  },
  async reports() {
    return reports;
  },
  async leaderboard(board = 'points', period = 'all') {
    // The metric/streak RPCs return `score`; the points RPC returns `points`.
    type Row = {
      user_id: number | string;
      name: string | null;
      avatar: string | null;
      score?: number;
      points?: number;
      you: boolean;
    };
    const toEntries = (rows: Row[]) =>
      rows.map((r, i) => ({
        id: String(r.user_id),
        rank: i + 1,
        name: r.name || 'Member',
        avatar: r.avatar || '',
        points: r.score ?? r.points ?? 0,
        you: !!r.you,
      }));
    try {
      const rows =
        board === 'streak'
          ? await rpc<Row[]>('mobile_streak_leaderboard', { p_period: period })
          : await rpc<Row[]>('mobile_leaderboard_metric', { p_metric: board, p_period: period });
      return toEntries(rows);
    } catch {
      // RPCs not present yet (older DB): only the all-time points board can fall
      // back to the legacy view; every other board is empty until the DB lands.
      if (board !== 'points' || period !== 'all') return [];
      try {
        const rows = await rest<Row[]>('mobile_leaderboard', { order: 'points.desc', limit: '50' });
        return rows.length ? toEntries(rows) : leaderboard;
      } catch {
        return leaderboard;
      }
    }
  },
  async useTracking() {
    // amount/used are the real daily entry; usage_score is the back-compat alias
    // (= amount) so this still works if the view hasn't been updated yet.
    type Row = {
      recorded_at: string;
      amount: number | null;
      used: boolean | null;
      usage_score: number | null;
    };
    try {
      const rows = await rest<Row[]>('mobile_use_tracking', { order: 'recorded_at.asc', limit: '3000' });
      return rows.map((r) => ({
        at: r.recorded_at,
        amount: r.amount ?? r.usage_score,
        used: !!r.used,
      }));
    } catch {
      return [];
    }
  },
  async assessments() {
    type Row = { profile_id: number | string; name: string | null; taken_at: string | null; score: number | null };
    try {
      const rows = await rest<Row[]>('mobile_assessments', { order: 'taken_at.desc', limit: '200' });
      // Keep the latest result per assessment (rows arrive newest-first).
      const seen = new Set<string>();
      return rows
        .filter((r) => {
          const key = String(r.profile_id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((r) => ({
          id: String(r.profile_id),
          name: r.name || 'Assessment',
          takenAt: r.taken_at,
          score: r.score != null ? Math.round(r.score) : null,
        }));
    } catch {
      return [];
    }
  },
  // Persist a retake to mobile_wheel_entries (one row per area). auth_uid is set
  // by the column default auth.uid(); RLS enforces it's the caller's own rows.
  // The mobile_wheel_areas view unions these in, so the retake shows immediately.
  async saveWheel(entries: WheelEntryInput[], appUserId) {
    if (!entries.length) return;
    const idNum = Number(appUserId);
    const rows = entries.map((e) => ({
      life_area_id: e.lifeAreaId,
      score: Math.round(e.score),
      app_user_id: Number.isFinite(idNum) ? idNum : null,
    }));
    const res = await fetch(`${BASE}/rest/v1/mobile_wheel_entries`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${authToken ?? ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error(`Wheel save failed (${res.status})`);
  },
};

// --- Daily check-ins (app-owned mobile_checkins table; RLS-scoped by auth.uid) ---

export const supabaseCheckins: CheckinsApi = {
  async list() {
    type Row = {
      date: string;
      mood: number | null;
      positive: string[] | null;
      negative: string[] | null;
      behavior: string | null;
      amount: string | null;
      use_count: string | null;
      affirmation: string | null;
    };
    try {
      // Reads the union of app check-ins + production daily_assessments so
      // streaks/history reflect the full record. Writes still go to the table.
      const rows = await rest<Row[]>('mobile_checkin_history', { order: 'date.desc', limit: '400' });
      return rows.map((r) => ({
        date: r.date,
        mood: r.mood ?? 0,
        positive: r.positive ?? [],
        negative: r.negative ?? [],
        behavior: (r.behavior as CheckinRecord['behavior']) ?? null,
        amount: (r.amount as CheckinRecord['amount']) ?? null,
        count: r.use_count ?? '',
        affirmation: r.affirmation ?? '',
      }));
    } catch {
      return [];
    }
  },
  async save(entry, appUserId) {
    const idNum = Number(appUserId);
    const body = {
      date: entry.date,
      mood: entry.mood,
      positive: entry.positive,
      negative: entry.negative,
      behavior: entry.behavior,
      amount: entry.amount,
      use_count: entry.count,
      affirmation: entry.affirmation,
      app_user_id: Number.isFinite(idNum) ? idNum : null,
      updated_at: new Date().toISOString(),
    };
    // Upsert on (auth_uid, date): one check-in per user per day. auth_uid is set
    // by the column default auth.uid(); RLS enforces it's the caller's.
    const res = await fetch(`${BASE}/rest/v1/mobile_checkins?on_conflict=auth_uid,date`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${authToken ?? ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Check-in save failed (${res.status})`);
  },
};

// --- Favorites (app-owned mobile_favorites; merged with prod favorites client-side) ---

export const supabaseFavorites: FavoritesApi = {
  async list() {
    type Row = { kind: string; item_id: string; active: boolean };
    try {
      const rows = await rest<Row[]>('mobile_favorites', { order: 'updated_at.desc' });
      return rows.map((r) => ({
        kind: (r.kind === 'video' ? 'video' : 'lesson') as 'lesson' | 'video',
        itemId: String(r.item_id),
        active: r.active,
      }));
    } catch {
      return [];
    }
  },
  async set(kind, itemId, on) {
    const res = await fetch(`${BASE}/rest/v1/mobile_favorites?on_conflict=auth_uid,kind,item_id`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${authToken ?? ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ kind, item_id: itemId, active: on, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`Favorite save failed (${res.status})`);
  },
};

// --- Chat / direct messages (app-owned mobile_messages + mobile_blocks) ---
// Reads the RLS-scoped views (mobile_threads / mobile_thread_messages /
// mobile_directory); writes go to the tables. "DM anyone unless blocked."

/** Call a Postgres function over PostgREST (/rpc/<fn>) and return its result. */
async function rpc<T>(fn: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${authToken ?? ANON}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401 && authToken) onUnauthorized?.();
  if (!res.ok) throw new Error(`rpc ${fn} → ${res.status}`);
  return (await res.json()) as T;
}

export const supabaseMessages: MessagesApi = {
  async threads(): Promise<Thread[]> {
    type Row = {
      conversation_id: number | string;
      is_group: boolean;
      name: string | null;
      avatar: string | null;
      peer_id: number | string | null;
      other_count: number | null;
      last_message: string | null;
      last_at: string | null;
      unread: number | null;
    };
    try {
      const rows = await rest<Row[]>('mobile_threads', {});
      return rows.map((r) => ({
        conversationId: String(r.conversation_id),
        name: r.name || 'Conversation',
        avatar: r.avatar || '',
        isGroup: !!r.is_group,
        otherCount: r.other_count ?? 0,
        peerId: r.peer_id != null ? String(r.peer_id) : null,
        last: r.last_message ?? '',
        time: r.last_at ? relTime(r.last_at) : '',
        unread: r.unread ?? 0,
      }));
    } catch {
      return [];
    }
  },
  async messages(conversationId): Promise<ChatMessage[]> {
    type Row = {
      id: string;
      conversation_id: number | string;
      mine: boolean;
      sender_id: number | string | null;
      sender_name: string | null;
      sender_avatar: string | null;
      content: string | null;
      created_at: string;
    };
    try {
      const rows = await rest<Row[]>('mobile_thread_messages', {
        conversation_id: `eq.${conversationId}`,
        order: 'created_at',
      });
      return rows.map((r) => ({
        id: String(r.id),
        mine: !!r.mine,
        senderId: r.sender_id != null ? String(r.sender_id) : null,
        senderName: r.sender_name || 'Member',
        senderAvatar: r.sender_avatar || '',
        text: r.content ?? '',
        time: relTime(r.created_at),
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },
  async send(conversationId, text, senderId) {
    const idNum = Number(senderId);
    // auth_uid fills from the column default auth.uid(); RLS blocks the insert
    // if a member of the conversation has blocked me.
    await postWrite('mobile_messages', {
      sender_id: Number.isFinite(idNum) ? idNum : null,
      conversation_id: Number(conversationId),
      content: text,
    });
  },
  async markRead(conversationId) {
    // Set my last_read_at on this conversation. RLS restricts the update to my
    // own member row, so filtering by conversation_id alone is safe.
    const res = await fetch(
      `${BASE}/rest/v1/mobile_conversation_members?conversation_id=eq.${Number(conversationId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${authToken ?? ANON}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ last_read_at: new Date().toISOString() }),
      },
    );
    if (!res.ok && res.status !== 404) {
      /* best-effort: a failed read-receipt shouldn't surface an error */
    }
  },
  async startDirect(otherUserId) {
    try {
      const id = await rpc<number | string>('mobile_start_direct', { other: Number(otherUserId) });
      return id != null ? String(id) : null;
    } catch {
      return null;
    }
  },
  async startGroup(memberIds, title) {
    try {
      const id = await rpc<number | string>('mobile_start_group', {
        members: memberIds.map((m) => Number(m)).filter((n) => Number.isFinite(n)),
        title: title ?? null,
      });
      return id != null ? String(id) : null;
    } catch {
      return null;
    }
  },
  async directory(search): Promise<DirectoryUser[]> {
    type Row = { id: number | string; name: string | null; avatar: string | null; handle: string | null };
    try {
      const q: Record<string, string> = { order: 'name', limit: '200' };
      const term = search?.trim();
      if (term) q.or = `(name.ilike.*${term}*,handle.ilike.*${term}*)`;
      const rows = await rest<Row[]>('mobile_directory', q);
      return rows.map((r) => ({
        userId: String(r.id),
        name: r.name || 'Member',
        avatar: r.avatar || '',
        handle: r.handle,
      }));
    } catch {
      return [];
    }
  },
  async blockedIds() {
    type Row = { blocked_id: number | string };
    try {
      const rows = await rest<Row[]>('mobile_blocks', { active: 'is.true', select: 'blocked_id' });
      return rows.map((r) => String(r.blocked_id));
    } catch {
      return [];
    }
  },
  async setBlock(userId, on, blockerId) {
    const idNum = Number(blockerId);
    const res = await fetch(`${BASE}/rest/v1/mobile_blocks?on_conflict=auth_uid,blocked_id`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${authToken ?? ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        blocker_id: Number.isFinite(idNum) ? idNum : null,
        blocked_id: Number(userId),
        active: on,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) throw new Error(`Block save failed (${res.status})`);
  },
};

// --- Group coaching / meetings (real sds_groups via mobile_groups) ---

export const supabaseGroups: GroupsApi = {
  async list(): Promise<Group[]> {
    type Row = {
      id: number | string;
      title: string | null;
      coach_name: string | null;
      coach_avatar: string | null;
      description: string | null;
      meet_day: string | null;
      meet_time_char: string | null;
      meet_length_char: string | null;
      source_tz: string | null;
      zoom_meeting_id: number | string | null;
      signed_up: boolean | null;
      join_url: string | null;
    };
    try {
      const rows = await rest<Row[]>('mobile_groups', {});
      return rows.map((r) => ({
        id: String(r.id),
        title: r.title || 'Coaching group',
        coachName: r.coach_name || 'SPARx Coach',
        coachAvatar: r.coach_avatar || '',
        description: r.description || '',
        meetDay: r.meet_day || '',
        meetTimeChar: r.meet_time_char || '',
        meetLengthChar: r.meet_length_char,
        sourceTz: r.source_tz || 'America/Los_Angeles',
        zoomMeetingId: r.zoom_meeting_id != null ? String(r.zoom_meeting_id) : null,
        signedUp: !!r.signed_up,
        joinUrl: r.join_url,
      }));
    } catch {
      return [];
    }
  },
  async setSignup(groupId, on, appUserId) {
    const idNum = Number(appUserId);
    const res = await fetch(`${BASE}/rest/v1/mobile_group_signups?on_conflict=auth_uid,sds_group_id`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${authToken ?? ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        sds_group_id: Number(groupId),
        app_user_id: Number.isFinite(idNum) ? idNum : null,
        active: on,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) throw new Error(`Group signup failed (${res.status})`);
  },
};

// --- Auth (Supabase GoTrue over REST; no SDK, same as the data layer) ---

type GoTrueUser = {
  id: string;
  email: string;
  user_metadata?: { name?: string; full_name?: string; avatar_url?: string } | null;
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
    avatarUrl: u.user_metadata?.avatar_url ?? null,
    appUserId: null,
    // Rich fields are null/false until enriched by apply() → me()
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
  };
}

/** data:image/...;base64,xxxx → a Blob the Storage API can take. */
function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const [meta, b64] = dataUrl.split(',');
  const contentType = meta.match(/data:(.*?);base64/)?.[1] ?? 'image/png';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: contentType }), contentType };
}

/** An auth call that couldn't reach the server at all (offline / DNS / CORS),
 *  as opposed to the server rejecting the credentials. Callers use `.network`
 *  to decide whether to keep a cached session or force a fresh sign-in. */
export class AuthNetworkError extends Error {
  network = true as const;
  constructor() {
    super('Could not reach the sign-in server.');
    this.name = 'AuthNetworkError';
  }
}

async function goTrue(path: string, body: unknown): Promise<GoTrueSession> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/auth/v1/${path}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    });
  } catch {
    // fetch only rejects when the request never got a response (network down,
    // DNS, CORS) — never for a 4xx/5xx. Treat that as a transient network error.
    throw new AuthNetworkError();
  }
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
  async me(email): Promise<MeResult | null> {
    // mobile_me maps the auth email → the production users row (and rich
    // personalisation fields). Falls back to null until the view exists.
    // MeRow column names mirror the mobile_me view (canonical snake_case); each
    // maps mechanically to the camelCase MeResult field. See db/field-dictionary.md.
    type MeRow = {
      app_user_id: string | number;
      name: string | null;
      avatar_url: string | null;
      program_id: string | number | null;
      subscribed: boolean | null;
      stripe_active: boolean | null;
      advanced_coaching: boolean | null;
      addiction_label: string | null;
      days_count: number | null;
      days_updated_at: string | null;
      user_handle: string | null;
      time_zone: string | null;
      team_id: string | number | null;
      zoom_email: string | null;
    };
    try {
      const rows = await rest<MeRow[]>('mobile_me', { email: `eq.${email}`, limit: '1' });
      if (!rows.length) return null;
      const r = rows[0];
      return {
        appUserId: String(r.app_user_id),
        name: r.name,
        avatarUrl: r.avatar_url,
        programId: r.program_id != null ? String(r.program_id) : null,
        subscribed: r.subscribed ?? false,
        stripeActive: r.stripe_active ?? false,
        advancedCoaching: r.advanced_coaching ?? false,
        addictionLabel: r.addiction_label,
        daysCount: r.days_count,
        daysUpdatedAt: r.days_updated_at,
        userHandle: r.user_handle,
        timeZone: r.time_zone,
        teamId: r.team_id != null ? String(r.team_id) : null,
        zoomEmail: r.zoom_email,
      } satisfies MeResult;
    } catch {
      return null;
    }
  },
  oauthUrl(provider, redirectTo) {
    return `${BASE}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;
  },
  async sessionFromTokens(accessToken, refreshToken) {
    const res = await fetch(`${BASE}/auth/v1/user`, {
      headers: { apikey: ANON, Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Couldn't complete sign-in (${res.status}).`);
    const user = (await res.json()) as GoTrueUser;
    return { user: toAuthUser(user), accessToken, refreshToken };
  },
  async updateAvatar(dataUrl, userId) {
    // Upload to the public `avatars` bucket, then record the URL on the user.
    const { blob, contentType } = dataUrlToBlob(dataUrl);
    const path = `${userId}/avatar.${contentType.split('/')[1] || 'png'}`;
    const up = await fetch(`${BASE}/storage/v1/object/avatars/${path}`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${authToken ?? ANON}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: blob,
    });
    if (!up.ok) throw new Error(`Avatar upload failed (${up.status}).`);
    // Cache-bust so a re-upload to the same path shows immediately.
    const publicUrl = `${BASE}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`;
    await fetch(`${BASE}/auth/v1/user`, {
      method: 'PUT',
      headers: { apikey: ANON, Authorization: `Bearer ${authToken ?? ANON}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { avatar_url: publicUrl } }),
    }).catch(() => {});
    return publicUrl;
  },
};

type GameStateRow = {
  video_points: number;
  streak_bonus_points: number;
  streak_credited_days: number;
  streak_run_start: string | null;
  streak_badges: Record<string, number> | null;
};

// --- Onboarding (app-owned mobile_onboarding_profile; RLS-scoped by auth.uid) ---
// New users collect demographics + primary/secondary problems here; existing
// production users skip it. The status view drives the routing gate.

type OnboardingRow = {
  birth_date: string | null;
  gender: string | null;
  gender_self: string | null;
  orientation: string | null;
  race: string | null;
  primary_problem: string | null;
  secondary_problems: string[] | null;
  accepted_terms_at: string | null;
  completed_at: string | null;
};

export const supabaseOnboarding: OnboardingApi = {
  async status(): Promise<OnboardingStatus> {
    // Fail OPEN: if the view is missing/errors, treat the user as not needing
    // onboarding so a backend hiccup never traps them behind the gate.
    try {
      const rows = await rest<
        {
          completed: boolean;
          is_existing_user: boolean;
          needs_onboarding: boolean;
          completed_at: string | null;
        }[]
      >('mobile_onboarding_status', { limit: '1' });
      const r = rows[0];
      if (!r) {
        return { completed: false, isExistingUser: false, needsOnboarding: false, completedAt: null };
      }
      return {
        completed: !!r.completed,
        isExistingUser: !!r.is_existing_user,
        needsOnboarding: !!r.needs_onboarding,
        completedAt: r.completed_at ?? null,
      };
    } catch {
      return { completed: false, isExistingUser: false, needsOnboarding: false, completedAt: null };
    }
  },
  async problems(): Promise<ProblemOption[]> {
    type Row = { id: number | string; enum_id: number | null; title: string; category: string };
    try {
      const rows = await rest<Row[]>('mobile_problems', {});
      return rows.map((r) => ({
        id: String(r.id),
        enumId: r.enum_id,
        title: r.title,
        category: r.category,
      }));
    } catch {
      return [];
    }
  },
  async get(): Promise<OnboardingProfile | null> {
    try {
      const rows = await rest<OnboardingRow[]>('mobile_onboarding_profile', { limit: '1' });
      const r = rows[0];
      if (!r) return null;
      return {
        birthDate: r.birth_date,
        gender: (r.gender as OnboardingProfile['gender']) ?? null,
        genderSelf: r.gender_self,
        orientation: r.orientation,
        race: r.race,
        primaryProblem: r.primary_problem,
        secondaryProblems: r.secondary_problems ?? [],
        acceptedTermsAt: r.accepted_terms_at,
        completedAt: r.completed_at,
      };
    } catch {
      return null;
    }
  },
  async save(input, appUserId) {
    const idNum = Number(appUserId);
    // Only send fields the caller actually set, so a partial save (e.g. just the
    // birth date on one screen) never clobbers already-stored answers with null.
    const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (Number.isFinite(idNum)) body.app_user_id = idNum;
    if ('birthDate' in input) body.birth_date = input.birthDate;
    if ('gender' in input) body.gender = input.gender;
    if ('genderSelf' in input) body.gender_self = input.genderSelf;
    if ('orientation' in input) body.orientation = input.orientation;
    if ('race' in input) body.race = input.race;
    if ('primaryProblem' in input) body.primary_problem = input.primaryProblem;
    if ('secondaryProblems' in input) body.secondary_problems = input.secondaryProblems;
    if ('acceptedTermsAt' in input) body.accepted_terms_at = input.acceptedTermsAt;
    if ('completedAt' in input) body.completed_at = input.completedAt;
    // Upsert on auth_uid (the PK, defaulted to auth.uid()): one profile per user.
    const res = await fetch(`${BASE}/rest/v1/mobile_onboarding_profile?on_conflict=auth_uid`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${authToken ?? ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Onboarding save failed (${res.status})`);
  },
};

// --- Assessments (app-owned mobile_assessment_responses; RLS by auth.uid) ---

export const supabaseAssessments: AssessmentsApi = {
  async list() {
    type Row = {
      instrument: string;
      profile_id: number | null;
      score: number | null;
      severity: string | null;
      answers: Record<string, number> | null;
      taken_at: string;
    };
    try {
      const rows = await rest<Row[]>('mobile_assessment_responses', {
        select: 'instrument,profile_id,score,severity,answers,taken_at',
        order: 'taken_at.desc',
        limit: '500',
      });
      return rows.map((r) => ({
        instrument: r.instrument,
        profileId: r.profile_id,
        score: r.score,
        severity: r.severity,
        answers: r.answers ?? {},
        takenAt: r.taken_at,
      }));
    } catch {
      return [];
    }
  },
  async save(input, appUserId) {
    const idNum = Number(appUserId);
    const res = await fetch(`${BASE}/rest/v1/mobile_assessment_responses`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${authToken ?? ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        instrument: input.instrument,
        profile_id: input.profileId,
        score: input.score,
        severity: input.severity,
        answers: input.answers,
        app_user_id: Number.isFinite(idNum) ? idNum : null,
      }),
    });
    if (!res.ok) throw new Error(`Assessment save failed (${res.status})`);
  },
};

// --- XP ledger (app-owned mobile_xp_events; RLS by auth.uid) -----------------

export const supabaseXp: XpApi = {
  async record(input, appUserId) {
    if (!input.points) return;
    const idNum = Number(appUserId);
    const res = await fetch(`${BASE}/rest/v1/mobile_xp_events`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${authToken ?? ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        source: input.source,
        ref_id: input.refId ?? null,
        points: Math.round(input.points),
        app_user_id: Number.isFinite(idNum) ? idNum : null,
      }),
    });
    if (!res.ok) throw new Error(`XP record failed (${res.status})`);
  },
  async project(added, period = 'week'): Promise<XpProjection | null> {
    type Row = {
      my_points: number;
      current_rank: number;
      projected_rank: number;
      total_players: number;
    };
    try {
      const rows = await rpc<Row[]>('mobile_xp_project', {
        p_added: Math.round(added),
        p_period: period,
      });
      const r = rows[0];
      if (!r) return null;
      return {
        myPoints: r.my_points ?? 0,
        currentRank: r.current_rank ?? 0,
        projectedRank: r.projected_rank ?? 0,
        totalPlayers: r.total_players ?? 0,
      };
    } catch {
      return null;
    }
  },
  async leaderboard(period: XpPeriod = 'week'): Promise<LeaderboardEntry[]> {
    type Row = {
      user_id: number | string;
      name: string | null;
      avatar: string | null;
      points: number;
      you: boolean;
    };
    try {
      const rows = await rpc<Row[]>('mobile_xp_leaderboard', { p_period: period });
      return rows.map((r, i) => ({
        id: String(r.user_id),
        rank: i + 1,
        name: r.name || 'Member',
        avatar: r.avatar || '',
        points: r.points ?? 0,
        you: !!r.you,
      }));
    } catch {
      return [];
    }
  },
};

export const supabaseGame: GameApi = {
  async get() {
    try {
      const rows = await rest<GameStateRow[]>('mobile_game_state', {
        select: 'video_points,streak_bonus_points,streak_credited_days,streak_run_start,streak_badges',
        limit: '1',
      });
      const r = rows[0];
      if (!r) return null;
      return {
        videoPoints: r.video_points ?? 0,
        streakBonusPoints: r.streak_bonus_points ?? 0,
        streakCreditedDays: r.streak_credited_days ?? 0,
        streakRunStart: r.streak_run_start ?? null,
        streakBadges: r.streak_badges ?? {},
      } satisfies GameState;
    } catch {
      return null;
    }
  },
  async save(state, appUserId) {
    const idNum = Number(appUserId);
    const res = await fetch(`${BASE}/rest/v1/rpc/mobile_save_game_state`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${authToken ?? ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        p_video_points: Math.max(0, Math.round(state.videoPoints)),
        p_streak_bonus_points: Math.max(0, Math.round(state.streakBonusPoints)),
        p_streak_credited_days: Math.max(0, Math.round(state.streakCreditedDays)),
        p_streak_run_start: state.streakRunStart,
        p_streak_badges: state.streakBadges ?? {},
        p_app_user_id: Number.isFinite(idNum) ? idNum : null,
      }),
    });
    if (!res.ok) throw new Error(`Game state save failed (${res.status})`);
  },
};

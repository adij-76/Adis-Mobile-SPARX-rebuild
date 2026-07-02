/**
 * Backend-agnostic domain types + the `Api` interface the app calls.
 *
 * Screens never talk to Supabase (or later tRPC) directly — they call `api.*`.
 * Swapping the backend = swapping the adapter behind this interface, so the
 * Supabase(A) → tRPC/Drizzle(C) move never touches a screen.
 *
 * Shapes mirror the production Postgres: programs → portions(modules) → lessons
 * (lesson_type: lesson|workshop); snippets are standalone short videos.
 */
// Auxiliary surfaces (meetings, community, quotes, …) don't have their own
// Supabase views yet, so their domain shapes still live with the seed data in
// src/data/content. Re-using them here keeps one source of truth until each
// gets a real backend view.
import type {
  Challenge,
  Coach,
  Community,
  LeaderboardEntry,
  Meeting,
  Post,
  Quote,
  Report,
  VideoItem,
  WheelArea,
} from '@/data/content';

export type { Challenge, Coach, Community, LeaderboardEntry, Meeting, Post, Quote, Report, VideoItem, WheelArea };

export type LessonType = 'lesson' | 'workshop';

export type Program = { id: string; name: string; active: boolean };

/** A `portion` in the DB = a module within a program. */
export type Module = { id: string; programId: string; title: string; order: number };

export type Lesson = {
  id: string;
  moduleId: string; // portion_id
  title: string;
  navTitle: string;
  position: number;
  description: string;
  vimeoUrl: string | null;
  vimeoId: number | null;
  lessonType: LessonType;
  worksheetUrl: string | null;
  thumbnail: string | null;
  // per-user, when available
  progress?: number; // 0-100
  rating?: number;
  favorite?: boolean;
  /** Whether the user's subscription role unlocks this lesson/workshop.
   *  Undefined from backends that don't compute gating (mock) → treat as
   *  accessible; only an explicit `false` locks the content. */
  accessible?: boolean;
};

/** A workshop is a Lesson with lessonType === 'workshop'. */
export type Workshop = Lesson;

export type Snippet = {
  id: string;
  lessonId: string | null;
  title: string | null;
  description: string | null;
  lengthSeconds: number | null;
  vimeoUrl: string | null;
  vimeoId: number | null;
  aiGenerated: boolean;
};

export type ContentApi = {
  programs(): Promise<Program[]>;
  modules(programId: string): Promise<Module[]>;
  module(id: string): Promise<Module | null>;
  moduleLessons(moduleId: string): Promise<Lesson[]>;
  lesson(id: string): Promise<Lesson | null>;
  workshops(): Promise<Workshop[]>;
  snippets(): Promise<Snippet[]>;
  /** Curated "recommended videos" rail (home + check-in + favorites). */
  recommendedVideos(): Promise<VideoItem[]>;
  /** Shareable daily quotes. */
  quotes(): Promise<Quote[]>;
  /** Home "Challenges" tab. */
  challenges(): Promise<Challenge[]>;
};

export type MeetingsApi = {
  all(): Promise<Meeting[]>;
  upcoming(): Promise<Meeting[]>;
  get(id: string): Promise<Meeting | null>;
  /** The coach shown in the booking flow. */
  coach(): Promise<Coach>;
};

export type CommunityApi = {
  /** The user's communities / groups. */
  communities(): Promise<Community[]>;
};

/** A comment or reply on a feed post. `parentRef` set = it's a reply to that
 *  comment; null = top-level. `postRef`/`id` are opaque ('p'/'a', 'c'/'ac'). */
export type PostComment = {
  id: string;
  postRef: string;
  parentRef: string | null;
  author: string;
  avatar: string;
  handle: string | null;
  text: string;
  /** Short relative label for display ("2h", "3d"). */
  time: string;
};

export type PostsApi = {
  /** The community feed, newest first; optionally filtered to one channel. */
  feed(channelId?: string): Promise<Post[]>;
  /** A single post by opaque id. */
  post(id: string): Promise<Post | null>;
  /** Comments + replies for a post (by its opaque ref). */
  comments(postRef: string): Promise<PostComment[]>;
  /** Create a post in a channel (writes to the app-owned table). */
  createPost(input: {
    channelId: string | null;
    title?: string | null;
    text: string;
    image?: string | null;
    appUserId: string | null;
  }): Promise<void>;
  /** Add a comment or reply (parentRef set = reply). */
  createComment(input: {
    postRef: string;
    parentRef?: string | null;
    text: string;
    appUserId: string | null;
  }): Promise<void>;
};

/** One month's overall Wheel of Life score (for the Monthly/Annual trend views). */
export type WheelPoint = { key: string; label: string; year: number; score: number };

/** One day's substance-use entry from the daily assessment: how much was used
 *  (`amount`, 0 on clean days) and whether any use happened (`used`). Higher =
 *  more use, so the UI treats a drop as improvement. */
export type UseTrackingPoint = { at: string; amount: number | null; used: boolean };

/** A clinical/self assessment the user has completed (AUDIT, ASSIST, Quality of
 *  Life, …), with its most recent score. `score` is null for unscored ones. */
export type AssessmentResult = { id: string; name: string; takenAt: string | null; score: number | null };

/** One area's score in a Wheel of Life retake. `lifeAreaId` is the production
 *  life_areas.id (1..10, same order as the app's wheel areas); `score` is 0-100. */
export type WheelEntryInput = { lifeAreaId: number; score: number };

export type InsightsApi = {
  /**
   * Trailing months of the user's overall Wheel score, oldest → newest.
   * `anchor` lets the mock pin the two most recent points to the values the
   * screen already computed; the Supabase adapter reads real history and
   * ignores it.
   */
  wheelHistory(anchor?: { current: number; last: number }): Promise<WheelPoint[]>;
  /** The Wheel of Life areas with current/previous scores. */
  wheelAreas(): Promise<WheelArea[]>;
  /** Generated reports / summaries. */
  reports(): Promise<Report[]>;
  /** Community points leaderboard. */
  leaderboard(): Promise<LeaderboardEntry[]>;
  /** Substance-use tracking history (usage + AUDIT score over time), oldest → newest. */
  useTracking(): Promise<UseTrackingPoint[]>;
  /** Assessments the user has completed (latest result per assessment), newest first. */
  assessments(): Promise<AssessmentResult[]>;
  /** Persist a Wheel of Life retake — one entry per area (score 0-100). Writes to
   *  the app-owned mobile_wheel_entries store so the retake becomes the current
   *  value in wheelAreas()/wheelHistory(). Best-effort; a no-op on the mock. */
  saveWheel(entries: WheelEntryInput[], appUserId: string | null): Promise<void>;
};

/** The signed-in user. `id` is the Supabase auth user id; `appUserId` (when
 *  resolved via the mobile_me view) is the production users.id that owns their
 *  real data. Rich fields below are null/false until mobile_me is queried. */
export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  appUserId: string | null;

  // -- resolved from public.users via mobile_me --
  /** The program the user is enrolled in (program_id). */
  programId: string | null;
  /** Whether the user has an active subscription (subscribed OR stripe_active). */
  subscribed: boolean;
  /** Stripe subscription is live. */
  stripeActive: boolean;
  /** Has advanced coaching access. */
  advancedCoaching: boolean;
  /** Text label for their primary struggle (e.g. "Alcohol"). Used by
   *  addictionStruggle() to personalise the check-in and Sparky AI. */
  addictionLabel: string | null;
  /** Current sobriety / behaviour-free day count (days_counter_amount). */
  daysCount: number | null;
  /** When the days counter was last reset (days_counter_updated_at). */
  daysUpdatedAt: string | null;
  /** Community display handle (user_handle). */
  userHandle: string | null;
  /** IANA time-zone string for scheduling and notifications. */
  timeZone: string | null;
  /** Coach / team assignment (team_id). */
  teamId: string | null;
  /** Email address used for Zoom meeting booking. */
  zoomEmail: string | null;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type OAuthProvider = 'google' | 'apple' | 'facebook';

/** What mobile_me returns after sign-in enrichment. */
export type MeResult = {
  appUserId: string;
  name: string | null;
  avatarUrl: string | null;
  programId: string | null;
  subscribed: boolean;
  stripeActive: boolean;
  advancedCoaching: boolean;
  addictionLabel: string | null;
  daysCount: number | null;
  daysUpdatedAt: string | null;
  userHandle: string | null;
  timeZone: string | null;
  teamId: string | null;
  zoomEmail: string | null;
};

export type AuthApi = {
  signIn(email: string, password: string): Promise<AuthSession>;
  signUp(email: string, password: string): Promise<AuthSession>;
  signOut(accessToken: string | null): Promise<void>;
  /** Exchange a refresh token for a fresh session (expired access tokens). */
  refresh(refreshToken: string): Promise<AuthSession>;
  /** Resolve the production user that owns this email's data (mobile_me view). */
  me(email: string): Promise<MeResult | null>;
  /** Hosted-provider sign-in URL to redirect to (web). Empty string if the
   *  backend can't do OAuth (e.g. the mock). */
  oauthUrl(provider: OAuthProvider, redirectTo: string): string;
  /** Build a session from tokens handed back by an OAuth redirect. */
  sessionFromTokens(accessToken: string, refreshToken: string): Promise<AuthSession>;
  /** Persist a new avatar (uploads when a backend exists) and return its URL. */
  updateAvatar(dataUrl: string, userId: string): Promise<string>;
};

/** A saved daily check-in (mirrors the local store's CheckinEntry). */
export type CheckinRecord = {
  date: string; // YYYY-MM-DD
  mood: number; // 0-100
  positive: string[];
  negative: string[];
  behavior: 'yes' | 'no' | null;
  amount: 'less' | 'same' | 'more' | null;
  count: string;
  affirmation: string;
};

export type CheckinsApi = {
  /** The signed-in user's check-ins, newest first. */
  list(): Promise<CheckinRecord[]>;
  /** Upsert one day's check-in (one row per user per day). */
  save(entry: CheckinRecord, appUserId: string | null): Promise<void>;
};

export type Api = {
  /** Which backend is serving requests — handy for debugging. */
  backend: 'mock' | 'supabase';
  auth: AuthApi;
  content: ContentApi;
  insights: InsightsApi;
  meetings: MeetingsApi;
  community: CommunityApi;
  posts: PostsApi;
  checkins: CheckinsApi;
};

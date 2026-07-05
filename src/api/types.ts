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
  /** The user's saved (favorited) lessons + workshops. */
  favoriteLessons(): Promise<Lesson[]>;
  /** The user's saved (favorited) snippet videos. */
  favoriteVideos(): Promise<VideoItem[]>;
  /** Lessons/workshops by id (for rendering saved items). */
  lessonsByIds(ids: string[]): Promise<Lesson[]>;
  /** Snippet videos by id (for rendering saved items). */
  videosByIds(ids: string[]): Promise<VideoItem[]>;
  /** Shareable daily quotes. */
  quotes(): Promise<Quote[]>;
  /** Home "Challenges" tab. */
  challenges(): Promise<Challenge[]>;
  /** Record watch progress for a video — `percent` is the furthest point reached
   *  (0-100); the server keeps the max. 100 (or ≥95) counts as completed, ticking
   *  the checklist and enabling rewards. Persists cross-device. Best-effort. */
  markVideoWatched(videoId: string, appUserId: string | null, percent: number): Promise<void>;
  /** Ids of videos the user has *completed* (percent ≥ 95) — hydrates the local
   *  watched set / checklist. Partial progress is stored but doesn't tick here. */
  watchedVideoIds(): Promise<string[]>;
};

export type MeetingsApi = {
  all(): Promise<Meeting[]>;
  upcoming(): Promise<Meeting[]>;
  get(id: string): Promise<Meeting | null>;
  /** The coach shown in the booking flow. */
  coach(): Promise<Coach>;
};

/** A weekly coaching group (production `sds_groups`) the user is entitled to.
 *  Recurs on `meetDay` at `meetTimeChar` in `sourceTz`; the app computes the
 *  next occurrence and shows it in the viewer's own zone. `joinUrl` is only
 *  present once the user has signed up (and is shown ~1h before start). */
export type Group = {
  id: string;
  title: string;
  coachName: string;
  coachAvatar: string;
  description: string;
  meetDay: string;
  meetTimeChar: string;
  meetLengthChar: string | null;
  sourceTz: string;
  zoomMeetingId: string | null;
  signedUp: boolean;
  joinUrl: string | null;
};

export type GroupsApi = {
  /** The groups the user's subscription role unlocks (active only). */
  list(): Promise<Group[]>;
  /** Sign up for / cancel a group. `appUserId` is the caller's production id. */
  setSignup(groupId: string, on: boolean, appUserId: string | null): Promise<void>;
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

/** A conversation summary in the messages list. A conversation is a thread with
 *  N members; a 1:1 DM is a 2-member, non-group conversation. */
export type Thread = {
  /** The conversation id — used to open and post to the thread. */
  conversationId: string;
  /** Display name: the group title (or joined member names), else the other person. */
  name: string;
  /** The other person's avatar for a 1:1; empty for a group. */
  avatar: string;
  isGroup: boolean;
  /** Number of other members (1 for a DM). */
  otherCount: number;
  /** The other person's production users.id for a 1:1 (for block); null for a group. */
  peerId: string | null;
  /** Preview of the most recent message. */
  last: string;
  /** Short relative label of the last activity ("2m", "3h"). */
  time: string;
  /** Count of others' messages I haven't read. */
  unread: number;
};

/** One message in a conversation. `mine` picks the bubble side; sender fields
 *  label who spoke (shown in group threads). */
export type ChatMessage = {
  id: string;
  mine: boolean;
  senderId: string | null;
  senderName: string;
  senderAvatar: string;
  text: string;
  /** Short relative label for display. */
  time: string;
  /** ISO timestamp, for ordering + dedupe. */
  createdAt: string;
};

/** A person you can start a chat with (from mobile_directory). */
export type DirectoryUser = { userId: string; name: string; avatar: string; handle: string | null };

export type MessagesApi = {
  /** The user's conversations, newest activity first. */
  threads(): Promise<Thread[]>;
  /** All messages in a conversation, oldest → newest. */
  messages(conversationId: string): Promise<ChatMessage[]>;
  /** Post a message to a conversation. `senderId` is the caller's production id. */
  send(conversationId: string, text: string, senderId: string | null): Promise<void>;
  /** Mark a conversation read up to now (my last_read_at). */
  markRead(conversationId: string): Promise<void>;
  /** People you can message (optionally filtered by a name/handle search). */
  directory(search?: string): Promise<DirectoryUser[]>;
  /** Production ids of people I've blocked (active blocks). */
  blockedIds(): Promise<string[]>;
  /** Block/unblock a user. `blockerId` is the caller's production id. */
  setBlock(userId: string, on: boolean, blockerId: string | null): Promise<void>;
  /** Find-or-create a 1:1 conversation with a user; returns its id (null if
   *  blocked or the call fails). */
  startDirect(otherUserId: string): Promise<string | null>;
  /** Create a group conversation with the given members; returns its id. */
  startGroup(memberIds: string[], title?: string | null): Promise<string | null>;
};

/** Leaderboard window: all-time, or a rolling last-30 / last-7 days. */
export type LeaderboardPeriod = 'all' | 'month' | 'week';

/** Which leaderboard to rank. All are counts of real, server-awarded actions
 *  (or points / longest check-in streak) — never self-reported scores. */
export type LeaderboardBoard =
  | 'points'
  | 'streak'
  | 'lessons'
  | 'workshops'
  | 'community'
  | 'videos'
  | 'checkins';

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
  /** A leaderboard `board` (points / streak / lessons / …) over a `period`
   *  (all-time / last 30 / last 7 days), ranked highest-first. `points` on each
   *  entry carries the board's value (points, count, or streak length). */
  leaderboard(board?: LeaderboardBoard, period?: LeaderboardPeriod): Promise<LeaderboardEntry[]>;
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

/** One favorite record from the app-owned store. `active=false` is a tombstone
 *  that un-saves a production favorite. */
export type FavoriteRecord = { kind: 'lesson' | 'video'; itemId: string; active: boolean };

export type FavoritesApi = {
  /** All of the user's app-owned favorite rows (active + tombstones). */
  list(): Promise<FavoriteRecord[]>;
  /** Persist a bookmark toggle (upsert on kind+item). */
  set(kind: 'lesson' | 'video', itemId: string, on: boolean): Promise<void>;
};

/** Durable app-side gamification state (points + streak badges), persisted so it
 *  survives reinstall, follows the user across devices, and reconciles into
 *  production `user_points` / `user_rewards` at cutover. */
export type GameState = {
  videoPoints: number;
  streakBonusPoints: number;
  streakCreditedDays: number;
  streakRunStart: string | null; // YYYY-MM-DD, start of the run credited_days applies to
  streakBadges: Record<string, number>; // milestone days (as string) -> times reached
};

export type GameApi = {
  /** Load the stored gamification state, or null if none yet. */
  get(): Promise<GameState | null>;
  /** Persist the state. The backend MAX-merges every total, so a stale/offline
   *  write can never lower points or badge counts. Best-effort. */
  save(state: GameState, appUserId: string | null): Promise<void>;
};

/** A selectable problem from the DB-driven taxonomy (mobile_problems = the
 *  production `addictions` table). `id` is the addictions.id the profile stores,
 *  so it reconciles 1:1 to users.addiction_id at cutover. `category` groups the
 *  picker (substance / mental_health / behavioral). */
export type ProblemOption = { id: string; enumId: number | null; title: string; category: string };

/** Gender identity captured at onboarding. Maps to users.gender at cutover;
 *  'male'/'female' also drive gendered community/group gating. */
export type OnboardingGender = 'male' | 'female' | 'nonbinary' | 'self' | 'undisclosed';

/** The onboarding profile the app collects for a new user (mirrors the
 *  production intake → users columns). All optional until the user fills them. */
export type OnboardingProfile = {
  birthDate: string | null; // YYYY-MM-DD → users.birth_date
  gender: OnboardingGender | null; // → users.gender
  genderSelf: string | null; // free text when gender === 'self'
  orientation: string | null; // → users.identify
  race: string | null; // → users.race
  primaryProblem: string | null; // addictions.id → users.addiction(_id)
  secondaryProblems: string[]; // addictions.ids → users.secondary_addictions
  acceptedTermsAt: string | null;
  completedAt: string | null;
};

/** Whether the caller should be routed through onboarding. `needsOnboarding` is
 *  true only for a new user (no production row) who hasn't finished yet. */
export type OnboardingStatus = {
  completed: boolean;
  isExistingUser: boolean;
  needsOnboarding: boolean;
  /** When onboarding was finished (ISO), or null. Used to anchor the day-1
   *  assessment window. */
  completedAt: string | null;
};

export type OnboardingApi = {
  /** Should this user go through onboarding? Fails open (needsOnboarding=false)
   *  so a backend hiccup never traps anyone in the flow. */
  status(): Promise<OnboardingStatus>;
  /** The DB-driven problem taxonomy for the primary + "what else" pickers. */
  problems(): Promise<ProblemOption[]>;
  /** The caller's saved onboarding profile, or null if none yet. */
  get(): Promise<OnboardingProfile | null>;
  /** Upsert the caller's onboarding profile (one row per user). Pass
   *  `completedAt` on the final step to close the gate. */
  save(input: Partial<OnboardingProfile>, appUserId: string | null): Promise<void>;
};

/** One completed assessment (app-owned mobile_assessment_responses row). */
export type AssessmentResponseRecord = {
  instrument: string; // AssessmentId ('gad7' | 'phq9' | …)
  profileId: number | null;
  score: number | null;
  severity: string | null;
  answers: Record<string, number>;
  takenAt: string; // ISO
};

export type AssessmentsApi = {
  /** The caller's assessment responses, newest first. */
  list(): Promise<AssessmentResponseRecord[]>;
  /** Record a completed instrument (append-only — each take is a new row). */
  save(
    input: {
      instrument: string;
      profileId: number | null;
      score: number | null;
      severity: string | null;
      answers: Record<string, number>;
    },
    appUserId: string | null,
  ): Promise<void>;
};

/** Leaderboard window for the XP boards. */
export type XpPeriod = 'today' | 'week' | 'month' | 'all';

/** One XP award to append to the ledger (mobile_xp_events). */
export type XpAwardInput = { source: string; refId?: string | null; points: number };

/** Where the caller sits on an XP board, and where +added points would put them. */
export type XpProjection = {
  myPoints: number;
  currentRank: number;
  projectedRank: number;
  totalPlayers: number;
};

export type XpApi = {
  /** Append an XP award to the ledger (the shared gamification source). */
  record(input: XpAwardInput, appUserId: string | null): Promise<void>;
  /** Rank the caller now vs. with `added` more points, for the movement feedback.
   *  Call BEFORE recording the award so current=pre and projected=post. */
  project(added: number, period?: XpPeriod): Promise<XpProjection | null>;
  /** The XP leaderboard for a window (today / this week / all-time). */
  leaderboard(period?: XpPeriod): Promise<LeaderboardEntry[]>;
};

export type Api = {
  /** Which backend is serving requests — handy for debugging. */
  backend: 'mock' | 'supabase';
  auth: AuthApi;
  onboarding: OnboardingApi;
  assessments: AssessmentsApi;
  xp: XpApi;
  content: ContentApi;
  insights: InsightsApi;
  meetings: MeetingsApi;
  community: CommunityApi;
  posts: PostsApi;
  favorites: FavoritesApi;
  checkins: CheckinsApi;
  messages: MessagesApi;
  groups: GroupsApi;
  game: GameApi;
};

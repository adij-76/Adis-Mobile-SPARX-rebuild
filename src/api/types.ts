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
};

/** One month's overall Wheel of Life score (for the Monthly/Annual trend views). */
export type WheelPoint = { key: string; label: string; year: number; score: number };

export type InsightsApi = {
  /**
   * Trailing months of the user's overall Wheel score, oldest → newest.
   * `anchor` lets the mock pin the two most recent points to the values the
   * screen already computed; the Supabase adapter reads real history and
   * ignores it.
   */
  wheelHistory(anchor?: { current: number; last: number }): Promise<WheelPoint[]>;
};

export type Api = {
  /** Which backend is serving requests — handy for debugging. */
  backend: 'mock' | 'supabase';
  content: ContentApi;
  insights: InsightsApi;
  // Future seams (kept here so adapters grow uniformly):
  // auth: AuthApi; checkins: CheckinApi; community: CommunityApi;
};

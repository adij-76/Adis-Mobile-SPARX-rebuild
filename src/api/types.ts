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
  vimeoUrl: string;
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
  description: string;
  lengthSeconds: number | null;
  vimeoUrl: string | null;
  vimeoId: number | null;
  aiGenerated: boolean;
};

export type ContentApi = {
  programs(): Promise<Program[]>;
  modules(programId: string): Promise<Module[]>;
  moduleLessons(moduleId: string): Promise<Lesson[]>;
  workshops(): Promise<Workshop[]>;
  snippets(): Promise<Snippet[]>;
};

export type Api = {
  /** Which backend is serving requests — handy for debugging. */
  backend: 'mock' | 'supabase';
  content: ContentApi;
  // Future seams (kept here so adapters grow uniformly):
  // auth: AuthApi; checkins: CheckinApi; community: CommunityApi;
};

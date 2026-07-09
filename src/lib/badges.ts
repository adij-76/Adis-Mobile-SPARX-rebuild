/**
 * Achievements / badges.
 *
 * A data-driven catalogue: each badge computes its own count from a snapshot of
 * the user's activity (BadgeContext). `count` is how many times it's been earned
 * — 0 = not yet, ≥1 = earned (repeating badges climb, e.g. Week Warrior ×3).
 *
 * All rules are pure functions of the snapshot, so counts are idempotent and
 * survive recompute. Thresholds are meant to be tuned.
 *
 * Phase 1 covered everything computable from check-ins, community activity, XP
 * and profile. Phase 2 adds the client-side categories that only needed a little
 * extra data the app already has: connection (accepted allies), assessment
 * (screener battery + improvement), and tenure (days since joining). Meeting
 * (needs attendance tracking) and time-window learning (needs per-completion
 * timestamps) still await plumbing — see GitHub #195.
 */
export type BadgeCategory = 'streaks' | 'recovery' | 'learning' | 'community' | 'profile';

export type BadgeCheckin = {
  date: string; // YYYY-MM-DD (local)
  mood: number; // 0-100
  behavior: 'yes' | 'no' | null; // 'no' = didn't use (a free day)
  affirmation: string;
  at?: string; // ISO timestamp of when it was logged (new check-ins only)
};

/** One completed assessment take, for the assessment badges (lower score = better
 *  on the wellbeing screeners, so a drop over time is improvement). */
export type BadgeAssessment = {
  instrument: string; // AssessmentId ('gad7' | 'phq9' | …)
  score: number | null;
  takenAt: string; // ISO
};

export type BadgeContext = {
  checkins: BadgeCheckin[];
  xp: number;
  posts: number;
  comments: number;
  reactions: number;
  lessonsCompleted: number;
  profileComplete: boolean;
  /** Accepted member connections ("allies"). */
  connections: number;
  /** The user's completed assessment takes (for Self-Aware / On the Upswing). */
  assessments: BadgeAssessment[];
  /** Whole days since the user joined (earliest of onboarding completion / first
   *  check-in). 0 when unknown. */
  tenureDays: number;
};

export type BadgeDef = {
  id: string;
  category: BadgeCategory;
  emoji: string;
  title: string;
  /** How to earn it (shown on locked badges). */
  hint: string;
  /** 'once' badges cap at 1; 'repeat' badges climb (show ×N). */
  kind: 'once' | 'repeat';
  /** Times earned given the snapshot (0 = locked). */
  evaluate: (ctx: BadgeContext) => number;
};

// ---- date helpers (all local, YYYY-MM-DD) ----------------------------------

const dayMs = 86400000;
const parse = (d: string) => new Date(`${d}T00:00:00`).getTime();
const uniqSorted = (dates: string[]) => Array.from(new Set(dates)).sort();

/** Lengths of maximal consecutive-day runs in a set of dates. */
function runLengths(dates: string[]): number[] {
  const ds = uniqSorted(dates);
  if (!ds.length) return [];
  const runs: number[] = [];
  let len = 1;
  for (let i = 1; i < ds.length; i++) {
    if (parse(ds[i]) - parse(ds[i - 1]) === dayMs) len++;
    else {
      runs.push(len);
      len = 1;
    }
  }
  runs.push(len);
  return runs;
}

/** Completed 7-day blocks summed across all runs (Week Warrior). */
const weekBlocks = (dates: string[]) => runLengths(dates).reduce((s, l) => s + Math.floor(l / 7), 0);

/** Number of distinct runs that reached at least `n` days. */
const runsReaching = (dates: string[], n: number) => runLengths(dates).filter((l) => l >= n).length;

/** Count fully-covered calendar weeks (Mon–Sun) / months in the date set. */
function perfectWeeks(dates: string[]): number {
  const set = new Set(dates);
  const seen = new Set<string>();
  let count = 0;
  for (const d of uniqSorted(dates)) {
    const t = parse(d);
    const dow = (new Date(t).getDay() + 6) % 7; // 0 = Monday
    const monday = t - dow * dayMs;
    const key = String(monday);
    if (seen.has(key)) continue;
    seen.add(key);
    let all = true;
    for (let i = 0; i < 7; i++) if (!set.has(iso(monday + i * dayMs))) { all = false; break; }
    if (all) count++;
  }
  return count;
}

function perfectMonths(dates: string[]): number {
  const set = new Set(dates);
  const months = new Set(dates.map((d) => d.slice(0, 7)));
  let count = 0;
  for (const ym of months) {
    const [y, m] = ym.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    let all = true;
    for (let day = 1; day <= days; day++) {
      if (!set.has(`${ym}-${String(day).padStart(2, '0')}`)) { all = false; break; }
    }
    if (all) count++;
  }
  return count;
}

function iso(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Completed 7-day blocks among consecutive days that satisfy `ok` (mood/affirmation runs). */
function qualifyingWeekBlocks(checkins: BadgeCheckin[], ok: (c: BadgeCheckin) => boolean): number {
  const dates = checkins.filter(ok).map((c) => c.date);
  return weekBlocks(dates);
}

function hourOf(c: BadgeCheckin): number | null {
  if (!c.at) return null;
  const d = new Date(c.at);
  return Number.isNaN(d.getTime()) ? null : d.getHours();
}

// The universal wellbeing screeners everyone takes — used for the assessment
// badges. Lower scores are better, so a later score below an earlier one is
// improvement ("On the Upswing").
const SCREENERS = ['gad7', 'phq9'];

/** True once the user has completed the core screening battery (GAD-7 + PHQ-9). */
function batteryComplete(assessments: BadgeAssessment[]): boolean {
  const taken = new Set(assessments.map((a) => a.instrument));
  return SCREENERS.every((id) => taken.has(id));
}

/** True when a screener's most recent score is below its earliest — the user is
 *  trending better on at least one instrument. Needs ≥2 scored takes of it. */
function screenersImproving(assessments: BadgeAssessment[]): boolean {
  return SCREENERS.some((id) => {
    const takes = assessments
      .filter((a) => a.instrument === id && a.score != null)
      .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    return takes.length >= 2 && (takes[takes.length - 1].score as number) < (takes[0].score as number);
  });
}

// ---- catalogue -------------------------------------------------------------

export const BADGES: BadgeDef[] = [
  // Streaks & consistency
  { id: 'week_warrior', category: 'streaks', emoji: '🔥', title: 'Week Warrior', hint: 'Keep a check-in streak going for a full 7 days — earned again every week.', kind: 'repeat', evaluate: (c) => weekBlocks(c.checkins.map((x) => x.date)) },
  { id: 'streak_30', category: 'streaks', emoji: '🌙', title: '30-Day Streak', hint: 'Reach a 30-day check-in streak.', kind: 'repeat', evaluate: (c) => runsReaching(c.checkins.map((x) => x.date), 30) },
  { id: 'streak_60', category: 'streaks', emoji: '💪', title: '60-Day Streak', hint: 'Reach a 60-day check-in streak.', kind: 'repeat', evaluate: (c) => runsReaching(c.checkins.map((x) => x.date), 60) },
  { id: 'streak_100', category: 'streaks', emoji: '💎', title: '100-Day Streak', hint: 'Reach a 100-day check-in streak.', kind: 'repeat', evaluate: (c) => runsReaching(c.checkins.map((x) => x.date), 100) },
  { id: 'streak_180', category: 'streaks', emoji: '🏆', title: '6-Month Streak', hint: 'Reach a 180-day check-in streak.', kind: 'repeat', evaluate: (c) => runsReaching(c.checkins.map((x) => x.date), 180) },
  { id: 'streak_365', category: 'streaks', emoji: '👑', title: '1-Year Streak', hint: 'Reach a 365-day check-in streak.', kind: 'repeat', evaluate: (c) => runsReaching(c.checkins.map((x) => x.date), 365) },
  { id: 'comeback_kid', category: 'streaks', emoji: '🌱', title: 'Comeback Kid', hint: 'Rebuild a 7-day streak after a lapse.', kind: 'repeat', evaluate: (c) => Math.max(0, runsReaching(c.checkins.map((x) => x.date), 7) - 1) },
  { id: 'perfect_week', category: 'streaks', emoji: '📅', title: 'Perfect Week', hint: 'Check in every day of a calendar week (Mon–Sun).', kind: 'repeat', evaluate: (c) => perfectWeeks(c.checkins.map((x) => x.date)) },
  { id: 'perfect_month', category: 'streaks', emoji: '🗓️', title: 'Perfect Month', hint: 'Check in every day of a calendar month.', kind: 'repeat', evaluate: (c) => perfectMonths(c.checkins.map((x) => x.date)) },
  { id: 'early_bird', category: 'streaks', emoji: '🌅', title: 'Early Bird', hint: 'Check in before 8am.', kind: 'repeat', evaluate: (c) => c.checkins.filter((x) => { const h = hourOf(x); return h !== null && h < 8; }).length },
  { id: 'night_owl', category: 'streaks', emoji: '🦉', title: 'Night Owl', hint: 'Check in after 10pm.', kind: 'repeat', evaluate: (c) => c.checkins.filter((x) => { const h = hourOf(x); return h !== null && h >= 22; }).length },

  // Recovery & check-ins
  { id: 'honest_start', category: 'recovery', emoji: '🌟', title: 'Honest Start', hint: 'Complete your first check-in.', kind: 'once', evaluate: (c) => (c.checkins.length ? 1 : 0) },
  { id: 'freedom_streak', category: 'recovery', emoji: '🕊️', title: 'Freedom Streak', hint: 'Log behavior-free days — earned again every 30.', kind: 'repeat', evaluate: (c) => Math.floor(c.checkins.filter((x) => x.behavior === 'no').length / 30) },
  { id: 'positive_pattern', category: 'recovery', emoji: '☀️', title: 'Positive Pattern', hint: 'Log a positive mood 7 days in a row.', kind: 'repeat', evaluate: (c) => qualifyingWeekBlocks(c.checkins, (x) => x.mood >= 60) },
  { id: 'affirmation_master', category: 'recovery', emoji: '💬', title: 'Affirmation Master', hint: 'Write an affirmation 7 days in a row.', kind: 'repeat', evaluate: (c) => qualifyingWeekBlocks(c.checkins, (x) => x.affirmation.trim().length > 0) },
  { id: 'self_aware', category: 'recovery', emoji: '🧭', title: 'Self-Aware', hint: 'Complete your first full check-in battery (anxiety + mood).', kind: 'once', evaluate: (c) => (batteryComplete(c.assessments) ? 1 : 0) },
  { id: 'on_the_upswing', category: 'recovery', emoji: '📈', title: 'On the Upswing', hint: 'Retake a check-in and score better than your first.', kind: 'once', evaluate: (c) => (screenersImproving(c.assessments) ? 1 : 0) },

  // Learning
  { id: 'first_steps', category: 'learning', emoji: '📗', title: 'First Steps', hint: 'Complete your first lesson.', kind: 'once', evaluate: (c) => (c.lessonsCompleted >= 1 ? 1 : 0) },

  // Community
  { id: 'icebreaker', category: 'community', emoji: '👋', title: 'Icebreaker', hint: 'Make your first community post.', kind: 'once', evaluate: (c) => (c.posts >= 1 ? 1 : 0) },
  { id: 'storyteller', category: 'community', emoji: '📣', title: 'Storyteller', hint: 'Share posts — earned again every 5.', kind: 'repeat', evaluate: (c) => Math.floor(c.posts / 5) },
  { id: 'encourager', category: 'community', emoji: '🫶', title: 'Encourager', hint: 'Leave comments — earned again every 10.', kind: 'repeat', evaluate: (c) => Math.floor(c.comments / 10) },
  { id: 'supporter', category: 'community', emoji: '❤️', title: 'Supporter', hint: 'React to others — earned again every 10.', kind: 'repeat', evaluate: (c) => Math.floor(c.reactions / 10) },
  { id: 'connector', category: 'community', emoji: '🤝', title: 'Connector', hint: 'Make your first member connection.', kind: 'once', evaluate: (c) => (c.connections >= 1 ? 1 : 0) },
  { id: 'inner_circle', category: 'community', emoji: '👥', title: 'Inner Circle', hint: 'Build 5 member connections.', kind: 'once', evaluate: (c) => (c.connections >= 5 ? 1 : 0) },

  // Profile & meta
  { id: 'all_dressed_up', category: 'profile', emoji: '✨', title: 'All Dressed Up', hint: 'Add your name and a profile photo.', kind: 'once', evaluate: (c) => (c.profileComplete ? 1 : 0) },
  { id: 'one_month_in', category: 'profile', emoji: '📆', title: 'One Month In', hint: 'Stay with SPARx for 30 days.', kind: 'once', evaluate: (c) => (c.tenureDays >= 30 ? 1 : 0) },
  { id: 'anniversary', category: 'profile', emoji: '🎉', title: 'Anniversary', hint: 'Reach one year with SPARx.', kind: 'once', evaluate: (c) => (c.tenureDays >= 365 ? 1 : 0) },
  { id: 'level_100', category: 'profile', emoji: '🥉', title: '100 XP', hint: 'Earn 100 XP.', kind: 'once', evaluate: (c) => (c.xp >= 100 ? 1 : 0) },
  { id: 'level_500', category: 'profile', emoji: '🥈', title: '500 XP', hint: 'Earn 500 XP.', kind: 'once', evaluate: (c) => (c.xp >= 500 ? 1 : 0) },
  { id: 'level_1000', category: 'profile', emoji: '🥇', title: '1,000 XP', hint: 'Earn 1,000 XP.', kind: 'once', evaluate: (c) => (c.xp >= 1000 ? 1 : 0) },
  { id: 'level_5000', category: 'profile', emoji: '🏅', title: '5,000 XP', hint: 'Earn 5,000 XP.', kind: 'once', evaluate: (c) => (c.xp >= 5000 ? 1 : 0) },
];

const BADGE_COLLECTOR: BadgeDef = {
  id: 'badge_collector',
  category: 'profile',
  emoji: '🎖️',
  title: 'Badge Collector',
  hint: 'Earn 10 different badges.',
  kind: 'once',
  evaluate: () => 0, // computed after the rest (meta-badge)
};

export type EarnedBadge = { def: BadgeDef; count: number };

/** Compute every badge's count from the snapshot, including the meta Badge
 *  Collector (earned once you hold 10 distinct badges). */
export function computeBadges(ctx: BadgeContext): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of BADGES) out[b.id] = b.evaluate(ctx);
  const distinct = Object.values(out).filter((n) => n > 0).length;
  out[BADGE_COLLECTOR.id] = distinct >= 10 ? 1 : 0;
  return out;
}

/** The full catalogue including the meta-badge, for the Achievements screen. */
export const ALL_BADGES: BadgeDef[] = [...BADGES, BADGE_COLLECTOR];

export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  streaks: 'Streaks & consistency',
  recovery: 'Recovery & check-ins',
  learning: 'Learning',
  community: 'Community',
  profile: 'Profile & milestones',
};

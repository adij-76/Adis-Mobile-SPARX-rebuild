/**
 * XP — the unified "everything except check-ins earns points, scaled by the
 * streak" model.
 *
 * The streak MULTIPLIER (and any bonus-day multiplier) applies to EVERY XP
 * source: watching videos, finishing lessons/modules, completing assessments,
 * community posts + replies, and anything else we decide should earn XP. It does
 * NOT apply to daily check-in points, which have their own schedule
 * (src/lib/checkin.ts, 1·2·3·4·5·6·10/day).
 *
 *   earned = round(base × streakMultiplier(streak) × bonusMultiplier)
 *
 * Multiplier tiers are capped so tenure never dominates the board:
 *   ×1 (streak < 7) · ×1.5 (7-day streak) · ×2 (14+).
 *
 * All numbers here are meant to be tuned — this is the one place to do it.
 */

/** Streak → multiplier applied to every XP award (capped at ×2). */
export const STREAK_MULTIPLIER: { minStreak: number; mult: number }[] = [
  { minStreak: 14, mult: 2 }, // maintaining two weeks+
  { minStreak: 7, mult: 1.5 }, // reached a week
  { minStreak: 0, mult: 1 }, // no/short streak
];

/** Multiplier for the current daily-check-in streak. */
export function streakMultiplier(streak: number): number {
  for (const s of STREAK_MULTIPLIER) if (streak >= s.minStreak) return s.mult;
  return 1;
}

/**
 * Base XP per earning activity, BEFORE the streak/bonus multiplier. Videos use
 * their own progress-tiered points (src/lib/video-points.ts, 1/2/3 by tier).
 *
 * `module_complete` is wired ahead of the feature that will fire it (module
 * completion isn't tracked yet).
 */
export type XpActivity =
  | 'lesson_complete'
  | 'module_complete'
  | 'assessment_complete'
  | 'worksheet_complete'
  | 'community_post'
  | 'community_reply';

export const XP_BASE: Record<XpActivity, number> = {
  lesson_complete: 10,
  module_complete: 25,
  assessment_complete: 15,
  worksheet_complete: 15, // finishing one lesson exercise worksheet (a `profile`)
  community_post: 5,
  community_reply: 3,
};

/** XP earned for a base amount at the given streak, times any bonus-day multiplier. */
export function xpEarned(base: number, streak: number, bonusMultiplier = 1): number {
  return Math.max(0, Math.round(base * streakMultiplier(streak) * bonusMultiplier));
}

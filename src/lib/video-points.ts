/**
 * Points for watching videos — non-linear, with a daily-streak multiplier.
 *
 * A video is worth up to 3 base points, earned as the user progresses (not
 * proportional to percent — starting already banks a point, and finishing is the
 * big step):
 *
 *   started (≥1%) → 1 · 25% → 1 · 50% → 2 · 75% → 2 · finished (≥95%) → 3   (cumulative)
 *
 * Points are earned incrementally: crossing into a higher tier awards the
 * difference, so someone who watches half and leaves keeps 2 points, and a
 * partial re-watch never re-awards. The furthest tier reached is what counts.
 *
 * Every award is scaled by the STREAK MULTIPLIER — the same daily check-in streak
 * that drives check-in points (see src/lib/checkin.ts). Integer multipliers keep
 * the math exact (no rounding drift): a finished video (3 base) on a 7-day streak
 * is worth 3 × 3 = 9 points.
 *
 * All the numbers below are meant to be tuned — this is the one place to do it.
 */

/** Cumulative base points at each progress tier (highest reached wins). */
const TIERS: { minPercent: number; cumulative: number }[] = [
  { minPercent: 95, cumulative: 3 }, // finished
  { minPercent: 50, cumulative: 2 }, // past halfway (covers 50–94%)
  { minPercent: 1, cumulative: 1 }, // started (covers 1–49%)
];

/** Streak → integer multiplier applied to every point earned. */
const STREAK_MULTIPLIER: { minStreak: number; mult: number }[] = [
  { minStreak: 7, mult: 3 }, // a week+ running
  { minStreak: 3, mult: 2 }, // building momentum
  { minStreak: 0, mult: 1 }, // no/short streak
];

/** Cumulative base points for the furthest percent reached (0 if not started). */
export function basePointsForPercent(percent: number): number {
  const p = Math.max(0, Math.min(100, percent));
  for (const t of TIERS) if (p >= t.minPercent) return t.cumulative;
  return 0;
}

/** Integer multiplier for the current daily-check-in streak (≥1). */
export function streakMultiplier(streak: number): number {
  for (const s of STREAK_MULTIPLIER) if (streak >= s.minStreak) return s.mult;
  return 1;
}

/**
 * Points earned by advancing a video's furthest-watched from `prevPercent` to
 * `newPercent` at the given streak. Only forward progress into a higher tier
 * pays out; going backwards or re-watching earns 0. Exact (integer multiplier).
 */
export function videoPointsEarned(prevPercent: number, newPercent: number, streak: number): number {
  const gain = basePointsForPercent(newPercent) - basePointsForPercent(prevPercent);
  return gain > 0 ? gain * streakMultiplier(streak) : 0;
}

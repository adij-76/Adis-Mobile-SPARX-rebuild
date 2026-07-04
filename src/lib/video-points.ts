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
 * Every award is scaled by the shared XP STREAK MULTIPLIER (src/lib/xp.ts) —
 * capped so tenure never dominates the board: ×1 under a week, ×1.5 at a 7-day
 * streak, ×2 at 14+. A finished video (3 base) is worth 3 / ~5 / 6 at those tiers.
 *
 * An optional bonus-event multiplier (special/double-points days, see
 * bonus-events.ts) stacks on top of the streak multiplier for POINTS only — it
 * never touches the raw watched/percent leaderboards, which count real activity.
 *
 * All the numbers below are meant to be tuned — this is the one place to do it.
 */
import { streakMultiplier } from '@/lib/xp';

/** Cumulative base points at each progress tier (highest reached wins). */
const TIERS: { minPercent: number; cumulative: number }[] = [
  { minPercent: 95, cumulative: 3 }, // finished
  { minPercent: 50, cumulative: 2 }, // past halfway (covers 50–94%)
  { minPercent: 1, cumulative: 1 }, // started (covers 1–49%)
];

/** Cumulative base points for the furthest percent reached (0 if not started). */
export function basePointsForPercent(percent: number): number {
  const p = Math.max(0, Math.min(100, percent));
  for (const t of TIERS) if (p >= t.minPercent) return t.cumulative;
  return 0;
}

/**
 * Points earned by advancing a video's furthest-watched from `prevPercent` to
 * `newPercent` at the given streak, times an optional bonus-event multiplier.
 * Only forward progress into a higher tier pays out; going backwards or
 * re-watching earns 0.
 *
 * Rounds the CUMULATIVE multiplied total and takes the difference (not each step
 * rounded on its own), so a fractional multiplier like ×1.5 can't inflate a
 * straight-through watch — the per-video total is always round(base × multiplier).
 */
export function videoPointsEarned(
  prevPercent: number,
  newPercent: number,
  streak: number,
  bonusMultiplier = 1,
): number {
  const m = streakMultiplier(streak) * bonusMultiplier;
  const gain =
    Math.round(basePointsForPercent(newPercent) * m) - Math.round(basePointsForPercent(prevPercent) * m);
  return gain > 0 ? gain : 0;
}

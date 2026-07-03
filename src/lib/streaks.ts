/**
 * Streak milestones + badges.
 *
 * A milestone is credited once per streak RUN that reaches its length — a single
 * 30-day run credits the 7-, 14-, and 30-day milestones (each once). Badges track
 * how many times each length has been reached across all runs, so the "7-day"
 * badge can read ×10 while the "30-day" badge reads ×2.
 *
 * Reaching a milestone also pays a chunky one-time BONUS (loss-aversion +
 * competence: the number you protect, plus a real payout for tenure). Bonuses are
 * flat — they are NOT scaled by the streak multiplier (that would double-count the
 * streak). All numbers here are meant to be tuned.
 */
export type StreakMilestone = { days: number; bonus: number; label: string; emoji: string };

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 7, bonus: 25, label: '7-day', emoji: '🔥' },
  { days: 14, bonus: 50, label: '2-week', emoji: '⚡️' },
  { days: 30, bonus: 150, label: '30-day', emoji: '🌙' },
  { days: 60, bonus: 300, label: '60-day', emoji: '💪' },
  { days: 100, bonus: 600, label: '100-day', emoji: '💎' },
  { days: 180, bonus: 1200, label: '6-month', emoji: '🏆' },
  { days: 365, bonus: 3000, label: '1-year', emoji: '👑' },
];

/**
 * Milestones newly reached this run: length > what's already been credited for
 * the current run AND ≤ the current streak. Ascending by length.
 */
export function milestonesReached(streak: number, creditedDays: number): StreakMilestone[] {
  return STREAK_MILESTONES.filter((m) => m.days > creditedDays && m.days <= streak);
}

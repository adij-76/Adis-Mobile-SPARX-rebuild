/**
 * Special "bonus point" windows — an admin-defined point multiplier over a date
 * range (e.g. a double-points weekend, a launch-week promo, a recovery-month
 * event). Stacks on top of the streak multiplier.
 *
 * IMPORTANT: this multiplier applies to POINTS ONLY. It never affects the raw
 * leaderboards (videos watched, percent watched, check-in counts) — those count
 * real activity, not multiplied points, so a bonus day can't distort who actually
 * did the most work. Keep that invariant.
 *
 * Empty by default. Add a window here to run a promotion (dates are inclusive,
 * `YYYY-MM-DD`, compared in the device's local day). Later this can be sourced
 * from a DB table so promos ship without an app release.
 */
export type BonusEvent = { start: string; end: string; multiplier: number; label: string };

export const BONUS_EVENTS: BonusEvent[] = [
  // Example (disabled): a double-points New Year push.
  // { start: '2027-01-01', end: '2027-01-07', multiplier: 2, label: 'New Year 2× points' },
];

const dayStr = (d: Date) => d.toISOString().slice(0, 10);

/** The bonus event active on `now` (local day), or null. */
export function activeBonusEvent(now: Date = new Date()): BonusEvent | null {
  const today = dayStr(now);
  return BONUS_EVENTS.find((e) => today >= e.start && today <= e.end) ?? null;
}

/** Point multiplier from any active bonus event (1 when none). */
export function activeBonusMultiplier(now: Date = new Date()): number {
  return activeBonusEvent(now)?.multiplier ?? 1;
}

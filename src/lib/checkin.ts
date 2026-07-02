import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Daily check-in streak + points.
 * Points scale with the current streak, capped at 10/day from a 7-day streak.
 */
const STREAK_POINTS = [1, 3, 4, 6, 7, 9, 10]; // day 1..7+
const KEY = 'igntd.checkin.v1';

export type CheckinState = {
  lastDate: string | null; // YYYY-MM-DD
  streak: number;
  totalPoints: number;
};

const EMPTY: CheckinState = { lastDate: null, streak: 0, totalPoints: 0 };

function dayStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getCheckinState(): Promise<CheckinState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export async function isDoneToday(): Promise<boolean> {
  const s = await getCheckinState();
  return s.lastDate === dayStr(new Date());
}

export type CheckinResult = {
  pointsEarned: number;
  streak: number;
  totalPoints: number;
  alreadyDone: boolean;
};

/**
 * Consecutive check-in days ending today (or yesterday if today's isn't in yet,
 * so a streak still shows until the day actually lapses). Computed from the
 * real check-in history — not a standalone counter that drifts out of sync
 * across devices / after the server check-ins hydrate.
 */
export function computeStreak(dates: string[]): number {
  const set = new Set(dates);
  if (!set.size) return 0;
  const today = dayStr(new Date());
  const yesterday = dayStr(new Date(Date.now() - 86400000));
  let cursor = set.has(today) ? today : set.has(yesterday) ? yesterday : null;
  if (!cursor) return 0;
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    const d = new Date(`${cursor}T00:00:00`); // local midnight — no UTC drift
    d.setDate(d.getDate() - 1);
    cursor = dayStr(d);
  }
  return streak;
}

/** Points for a given streak length (1..7+), capped at 10/day from day 7. */
export function pointsForStreak(streak: number): number {
  return STREAK_POINTS[Math.min(Math.max(streak, 1), STREAK_POINTS.length) - 1];
}

/**
 * Records today's check-in, deriving the streak from the full check-in history
 * (`historyDates`, e.g. the hydrated store dates) rather than a lone counter.
 * Idempotent per day: points are awarded once, but the streak always reflects
 * the true history.
 */
export async function recordCheckin(historyDates: string[] = []): Promise<CheckinResult> {
  const today = dayStr(new Date());
  const s = await getCheckinState();
  const already = s.lastDate === today;

  const streak = computeStreak([today, ...historyDates]);
  const pointsEarned = already ? 0 : pointsForStreak(streak);
  const totalPoints = already ? s.totalPoints : s.totalPoints + pointsEarned;

  if (!already) {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify({ lastDate: today, streak, totalPoints }));
    } catch {
      /* best effort */
    }
  }

  return { pointsEarned, streak, totalPoints, alreadyDone: already };
}

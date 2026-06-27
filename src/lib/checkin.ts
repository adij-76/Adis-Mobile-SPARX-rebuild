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

/** Records today's check-in, updating streak + points. Idempotent per day. */
export async function recordCheckin(): Promise<CheckinResult> {
  const now = new Date();
  const today = dayStr(now);
  const yesterday = dayStr(new Date(now.getTime() - 86400000));
  const s = await getCheckinState();

  if (s.lastDate === today) {
    return { pointsEarned: 0, streak: s.streak, totalPoints: s.totalPoints, alreadyDone: true };
  }

  const streak = s.lastDate === yesterday ? s.streak + 1 : 1;
  const pointsEarned = STREAK_POINTS[Math.min(streak, STREAK_POINTS.length) - 1];
  const totalPoints = s.totalPoints + pointsEarned;

  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ lastDate: today, streak, totalPoints }));
  } catch {
    /* best effort */
  }

  return { pointsEarned, streak, totalPoints, alreadyDone: false };
}

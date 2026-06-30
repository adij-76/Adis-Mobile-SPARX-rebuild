/**
 * Recommends a daily quote from the user's most recent check-in, and picks a
 * matching background. Pure + deterministic so the same day shows the same
 * quote/background (no reshuffling on every render).
 */
import type { Quote, QuoteMood } from '@/data/content';
import type { CheckinEntry } from '@/lib/store';

/** Map a check-in to the mood bucket whose quotes best support it. */
export function moodFromCheckin(c?: CheckinEntry | null): QuoteMood {
  if (!c) return 'steady';
  // A flagged behaviour (acted on an urge) → meet them with compassion + a fresh start.
  if (c.behavior === 'yes') return 'craving';
  if (c.mood <= 35) return 'struggling';
  if (c.mood <= 60) return 'low';
  if (c.mood >= 80) return 'growth';
  return 'steady';
}

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Pick a quote that speaks to the latest check-in. Prefers quotes tagged with
 * the matching mood; falls back to the whole list. Stable per (day, mood).
 */
export function recommendQuote(quotes: Quote[], latest?: CheckinEntry | null): Quote | null {
  if (!quotes.length) return null;
  const mood = moodFromCheckin(latest);
  const pool = quotes.filter((q) => q.mood === mood);
  const list = pool.length ? pool : quotes;
  const seed = latest ? `${latest.date}:${mood}` : 'default';
  return list[hash(seed) % list.length];
}

/** Stable background index for a quote, given how many backgrounds exist. */
export function backgroundIndexFor(quoteId: string, count: number): number {
  if (count <= 0) return 0;
  return hash(quoteId) % count;
}

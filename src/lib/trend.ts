/**
 * Buckets a flat list of dated values into the four trend periods the data page
 * shows — Most recent / Weekly / Monthly / Annual — as `TrendSeries` for the
 * shared `MetricTrend` component. Averages values that fall in the same bucket.
 */
import type { TrendPoint, TrendSeries } from '@/components/ui/metric-trend';

export type DatedValue = { at: string; value: number };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ISO-ish week key (year + week number) for weekly bucketing. */
function weekInfo(d: Date): { key: string; label: string } {
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (day.getUTCDay() + 6) % 7; // Mon=0
  day.setUTCDate(day.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(day.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((day.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return { key: `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`, label: `W${week}` };
}

/** Average the values sharing a bucket key, keep chronological order, take last N. */
function bucket(points: DatedValue[], keyFn: (d: Date) => { key: string; label: string }, limit: number): TrendPoint[] {
  const groups = new Map<string, { label: string; sum: number; n: number; order: number }>();
  points.forEach((p, i) => {
    const d = new Date(p.at);
    if (isNaN(d.getTime())) return;
    const { key, label } = keyFn(d);
    const g = groups.get(key);
    if (g) {
      g.sum += p.value;
      g.n += 1;
      g.order = i;
    } else {
      groups.set(key, { label, sum: p.value, n: 1, order: i });
    }
  });
  return [...groups.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .slice(-limit)
    .map(([key, g]) => ({ key, label: g.label, value: Math.round(g.sum / g.n) }));
}

/** Build the recent/weekly/monthly/annual series from dated values (any order). */
export function buildTrendSeries(input: DatedValue[]): TrendSeries[] {
  const points = [...input]
    .filter((p) => p.value != null && !isNaN(new Date(p.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  if (!points.length) return [];

  const recent: TrendPoint[] = points.slice(-6).map((p, i) => {
    const d = new Date(p.at);
    return { key: `${p.at}-${i}`, label: `${d.getMonth() + 1}/${d.getDate()}`, value: Math.round(p.value) };
  });
  const weekly = bucket(points, weekInfo, 8);
  const monthly = bucket(points, (d) => ({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()] }), 12);
  const annual = bucket(points, (d) => ({ key: `${d.getFullYear()}`, label: `${d.getFullYear()}` }), 5);

  const series: TrendSeries[] = [
    { key: 'recent', label: 'Most recent', points: recent },
    { key: 'weekly', label: 'Weekly', points: weekly },
    { key: 'monthly', label: 'Monthly', points: monthly },
    { key: 'annual', label: 'Annual', points: annual },
  ];
  // Drop periods that don't have at least 2 points (nothing to trend).
  return series.filter((s) => s.points.length >= (s.key === 'recent' ? 1 : 2));
}

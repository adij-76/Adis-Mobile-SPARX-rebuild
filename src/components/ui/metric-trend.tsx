/**
 * Reusable metric trend card — the shared "most recent / weekly / monthly /
 * annual" pattern with a bar chart, a % (or point) change, an up/down arrow, and
 * direction-aware colour. Used by the data page for Wheel of Life, drink/use
 * tracking, and clinical assessments (GAD-7 / PHQ-9 / AUDIT …).
 *
 * `higherIsBetter` flips the colour semantics: for wheel/mood a rise is good
 * (green up); for substance use or anxiety/depression scores a DROP is good
 * (green down, red up).
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';

// Tallest bar's pixel height. Bars use explicit px (not %) heights so they
// render on react-native-web, where a %-height child of a flex-sized parent
// collapses to nothing (leaving only the labels, no bars).
const BAR_AREA = 120;

/** One-decimal round so small real values (1.8) survive. */
const round1 = (n: number) => Math.round(n * 10) / 10;

export type TrendPoint = { key: string; label: string; value: number };
export type TrendPeriodKey = 'recent' | 'weekly' | 'monthly' | 'annual';
export type TrendSeries = { key: TrendPeriodKey; label: string; points: TrendPoint[] };

const PERIOD_LABEL: Record<TrendPeriodKey, string> = {
  recent: 'Most recent',
  weekly: 'Weekly',
  monthly: 'Monthly',
  annual: 'Annual',
};

/** Coloured change pill. `higherIsBetter=false` inverts red/green (use, anxiety). */
export function DeltaChip({
  value,
  unit = '',
  higherIsBetter = true,
  suffix,
  compact,
}: {
  value: number;
  unit?: string;
  higherIsBetter?: boolean;
  suffix?: string;
  compact?: boolean;
}) {
  const flat = value === 0;
  const good = higherIsBetter ? value > 0 : value < 0;
  const color = flat ? Colors.textSub : good ? Colors.success : Colors.danger;
  const icon = flat ? 'remove' : value > 0 ? 'arrow-up' : 'arrow-down';
  return (
    <View style={[styles.delta, compact && { paddingVertical: 1 }, { backgroundColor: `${color}1A` }]}>
      <Ionicons name={icon as never} size={compact ? 11 : 13} color={color} />
      <Txt variant="caption" color={color}>
        {value > 0 ? '+' : ''}
        {value}
        {unit}
        {suffix ? ` ${suffix}` : ''}
      </Txt>
    </View>
  );
}

export function MetricTrend({
  series,
  unit = '',
  higherIsBetter = true,
  accent = Colors.primary,
  max,
}: {
  series: TrendSeries[];
  unit?: string;
  higherIsBetter?: boolean;
  accent?: string;
  /** Bar-scale ceiling. Defaults to the series max (min 100 when unit is %). */
  max?: number;
}) {
  const available = series.filter((s) => s.points.length > 0);
  const [active, setActive] = useState<TrendPeriodKey>(available[0]?.key ?? 'recent');
  const current = available.find((s) => s.key === active) ?? available[0];
  if (!current) return null;

  const points = current.points;
  const latest = points[points.length - 1]?.value ?? 0;
  const prev = points.length > 1 ? points[points.length - 2].value : latest;

  return (
    <View style={{ gap: Spacing.lg }}>
      {available.length > 1 && (
        <View style={styles.tabs}>
          {available.map((s) => {
            const on = s.key === active;
            return (
              <Pressable key={s.key} onPress={() => setActive(s.key)} style={[styles.tab, on && { backgroundColor: accent }]}>
                <Txt variant="caption" color={on ? Colors.white : Colors.textSub}>
                  {s.label || PERIOD_LABEL[s.key]}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      )}

      {active === 'recent' ? (
        <RecentView latest={latest} delta={latest - prev} unit={unit} higherIsBetter={higherIsBetter} accent={accent} />
      ) : (
        <BarsView points={points} unit={unit} higherIsBetter={higherIsBetter} accent={accent} max={max} />
      )}
    </View>
  );
}

function RecentView({
  latest,
  delta,
  unit,
  higherIsBetter,
  accent,
}: {
  latest: number;
  delta: number;
  unit: string;
  higherIsBetter: boolean;
  accent: string;
}) {
  return (
    <View style={styles.recentWrap}>
      <View style={[styles.ring, { borderColor: Colors.soft }]}>
        <Txt variant="titleLg" color={accent}>
          {latest}
          {unit}
        </Txt>
      </View>
      <DeltaChip value={delta} unit={unit} higherIsBetter={higherIsBetter} suffix="vs previous" />
    </View>
  );
}

function BarsView({
  points,
  unit,
  higherIsBetter,
  accent,
  max,
}: {
  points: TrendPoint[];
  unit: string;
  higherIsBetter: boolean;
  accent: string;
  max?: number;
}) {
  const ceiling = max ?? Math.max(...points.map((p) => p.value), unit === '%' ? 100 : 1);
  const net = points[points.length - 1].value - points[0].value;
  const improved = points.filter((p, i) => i > 0 && (higherIsBetter ? p.value > points[i - 1].value : p.value < points[i - 1].value)).length;
  const dirWord = net === 0 ? 'Holding steady' : (higherIsBetter ? net > 0 : net < 0) ? 'Improving' : 'Needs attention';

  // Average across THIS period's points, drawn as a reference line.
  const avg = points.reduce((s, p) => s + p.value, 0) / points.length;
  const avgY = Math.max(0, Math.min(BAR_AREA, (avg / (ceiling || 1)) * BAR_AREA));
  // Colour each value by where it sits vs the average, in the metric's "good"
  // direction: better-than-average green, worse orange, on the line teal.
  const valueColor = (v: number) => {
    if (Math.abs(v - avg) < 0.05) return accent;
    const good = higherIsBetter ? v > avg : v < avg;
    return good ? Colors.success : Colors.orange;
  };

  return (
    <View style={{ gap: Spacing.lg }}>
      <View style={styles.summary}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="bodySmBold">{dirWord}</Txt>
          <Txt variant="caption" color={Colors.textSub}>
            {improved} of {points.length - 1} periods {higherIsBetter ? 'improved' : 'lower'}
          </Txt>
        </View>
        <DeltaChip value={net} unit={unit} higherIsBetter={higherIsBetter} />
      </View>

      <View>
        <View style={styles.plotArea}>
          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            const barHeight = Math.max(6, Math.round((p.value / (ceiling || 1)) * BAR_AREA));
            return (
              <View key={p.key} style={styles.barCol}>
                <Txt variant="caption" style={[styles.barValue, { color: valueColor(p.value) }]}>
                  {p.value}
                  {unit}
                </Txt>
                <View
                  style={[
                    styles.barFill,
                    // The bar carries the same good/bad/at-average colour as its
                    // value; the current period keeps a subtle darker edge.
                    { height: barHeight, backgroundColor: valueColor(p.value), opacity: isLast ? 1 : 0.85 },
                  ]}
                />
              </View>
            );
          })}
          {/* Average reference line for this period. */}
          <View style={[styles.avgLine, { bottom: avgY }]} pointerEvents="none" />
          <View style={[styles.avgTag, { bottom: avgY + 1 }]} pointerEvents="none">
            <Txt variant="caption" style={styles.avgTagTxt}>
              avg {round1(avg)}
              {unit}
            </Txt>
          </View>
        </View>
        <View style={styles.plotLabels}>
          {points.map((p, i) => (
            <Txt
              key={p.key}
              variant="caption"
              color={i === points.length - 1 ? accent : Colors.textSub}
              style={styles.barLabel}>
              {p.label}
            </Txt>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: Spacing.xs, backgroundColor: Colors.soft, borderRadius: Radius.pill, padding: 3 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: Radius.pill },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill },
  recentWrap: { alignItems: 'center', gap: Spacing.md },
  ring: { width: 150, height: 150, borderRadius: 75, borderWidth: 14, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  // Fixed-height plot so the average line and bars share one baseline. Extra
  // headroom above BAR_AREA leaves room for the value label atop a full bar.
  plotArea: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    height: BAR_AREA + 16,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barValue: { fontSize: 11, fontFamily: FontFamily.bold },
  barFill: { width: '72%', minWidth: 8, borderRadius: Radius.sm },
  avgLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: Colors.textSub, opacity: 0.55 },
  avgTag: { position: 'absolute', right: 0, paddingHorizontal: 4, backgroundColor: Colors.white, borderRadius: 4 },
  avgTagTxt: { fontSize: 10, fontFamily: FontFamily.bold, color: Colors.textSub },
  plotLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.xs, marginTop: 4 },
  barLabel: { fontSize: 11, fontFamily: FontFamily.semibold, flex: 1, textAlign: 'center' },
});

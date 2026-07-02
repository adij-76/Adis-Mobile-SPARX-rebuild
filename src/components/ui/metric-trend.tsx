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
import { Colors, Radius, Spacing } from '@/constants/theme';

// Tallest bar's pixel height. Bars use explicit px (not %) heights so they
// render on react-native-web, where a %-height child of a flex-sized parent
// collapses to nothing (leaving only the labels, no bars).
const BAR_AREA = 120;

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

      <View style={styles.bars}>
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          const barHeight = Math.max(6, Math.round((p.value / ceiling) * BAR_AREA));
          return (
            <View key={p.key} style={styles.barCol}>
              <Txt variant="caption" color={Colors.textSub} style={styles.barValue}>
                {p.value}
              </Txt>
              <View
                style={[
                  styles.barFill,
                  { height: barHeight, backgroundColor: isLast ? accent : Colors.lightBlue },
                ]}
              />
              <Txt variant="caption" color={isLast ? accent : Colors.textSub} style={styles.barLabel}>
                {p.label}
              </Txt>
            </View>
          );
        })}
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
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.xs },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 10 },
  barFill: { width: '72%', minWidth: 8, borderRadius: Radius.sm },
  barLabel: { fontSize: 10 },
});

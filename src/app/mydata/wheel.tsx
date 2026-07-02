import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { WheelChart } from '@/components/ui/wheel-chart';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { type WheelMonth } from '@/data/content';
import { useAsync } from '@/hooks/use-async';
import { useStore } from '@/lib/store';

type Period = 'recent' | 'monthly' | 'annual';
const PERIODS: { key: Period; label: string }[] = [
  { key: 'recent', label: 'Most recent' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'annual', label: 'Annual' },
];

export default function WheelOfLife() {
  const router = useRouter();
  const { wheelScores } = useStore();
  const [period, setPeriod] = useState<Period>('recent');
  const [menuOpen, setMenuOpen] = useState(false);

  const wheelAreas = useAsync(() => api.insights.wheelAreas(), []).data ?? [];
  const scored = wheelAreas.map((a) => {
    const current = wheelScores[a.id] ?? a.current;
    return { ...a, current, value: current };
  });

  const overall = scored.length ? Math.round(scored.reduce((s, c) => s + c.value, 0) / scored.length) : 0;
  const lastOverall = scored.length ? Math.round(scored.reduce((s, c) => s + c.last, 0) / scored.length) : 0;
  const history = useAsync(
    () => api.insights.wheelHistory({ current: overall, last: lastOverall }),
    [overall, lastOverall],
  ).data ?? [];
  // Annual view: collapse the monthly history into one average per calendar year.
  const yearly = useMemo<WheelMonth[]>(() => {
    const byYear = new Map<number, number[]>();
    for (const m of history) {
      const arr = byYear.get(m.year) ?? [];
      arr.push(m.score);
      byYear.set(m.year, arr);
    }
    return [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, scores]) => ({
        key: String(year),
        label: String(year),
        year,
        score: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      }));
  }, [history]);
  const periodLabel = PERIODS.find((p) => p.key === period)!.label;

  if (scored.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]} edges={['top']}>
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const best = scored.reduce((a, b) => (b.value > a.value ? b : a));
  const worst = scored.reduce((a, b) => (b.value < a.value ? b : a));
  const improved = scored.reduce((a, b) => (b.current - b.last > a.current - a.last ? b : a));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="SPARx Wheel of Life" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <WheelChart data={scored} size={320} />
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(122,90,248,0.32)' }]} />
              <Txt variant="caption" color={Colors.textSub}>
                Last Month
              </Txt>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(122,90,248,0.85)' }]} />
              <Txt variant="caption" color={Colors.textSub}>
                Current Month
              </Txt>
            </View>
          </View>
        </Card>

        {/* Activities / scores */}
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <View style={[styles.row, styles.rowDivider]}>
            <Txt variant="bodySmBold" color={Colors.textSub} style={{ flex: 1 }}>
              Activities
            </Txt>
            <Txt variant="bodySmBold" color={Colors.textSub}>
              Scores
            </Txt>
          </View>
          {scored.map((c, i) => (
            <View key={c.id} style={[styles.row, i < scored.length - 1 && styles.rowDivider]}>
              <View style={[styles.dot, { backgroundColor: c.color }]} />
              <Txt variant="bodyMedium" style={{ flex: 1 }}>
                {c.label}
              </Txt>
              <Txt variant="bodySmBold">{c.value}</Txt>
            </View>
          ))}
        </Card>

        <Txt variant="titleSm">SPARx Life scores</Txt>
        <InsightCard title="Best Performing" item={best.label} color={best.color} />
        <InsightCard title="Most support needed" item={worst.label} color={worst.color} />
        <InsightCard title="Most Improved" item={improved.label} color={improved.color} />

        <Card style={{ gap: Spacing.lg }}>
          {/* The header (and its absolutely-positioned menu) must paint ABOVE the
              ring/trend below it, or the lower menu items overlap the ring and
              their taps get swallowed. zIndex + elevation lift the whole row. */}
          <View style={[styles.cardHead, styles.headStack]}>
            <Txt variant="titleSm">Wheel of life</Txt>
            <View style={styles.menuAnchor}>
              <Pressable style={styles.daily} onPress={() => setMenuOpen((o) => !o)}>
                <Txt variant="caption" color={Colors.textSub}>
                  {periodLabel}
                </Txt>
                <Ionicons name={menuOpen ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textSub} />
              </Pressable>
              {menuOpen && (
                <View style={styles.menu}>
                  {PERIODS.map((p) => (
                    <Pressable
                      key={p.key}
                      style={styles.menuItem}
                      onPress={() => {
                        setPeriod(p.key);
                        setMenuOpen(false);
                      }}>
                      <Txt variant="bodySm" color={p.key === period ? Colors.primary : Colors.textMain}>
                        {p.label}
                      </Txt>
                      {p.key === period && <Ionicons name="checkmark" size={15} color={Colors.primary} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {period === 'recent' && (
            <View style={styles.ringWrap}>
              <ProgressRing pct={overall} />
              <DeltaChip value={overall - lastOverall} suffix="vs last month" />
            </View>
          )}

          {period === 'monthly' &&
            (history.length > 1 ? (
              <TrendView months={history.slice(-6)} span="6 months" rows />
            ) : (
              <Txt variant="bodySm" color={Colors.textSub} center>
                Not enough history yet — check back after a few monthly retakes.
              </Txt>
            ))}
          {period === 'annual' &&
            (yearly.length > 1 ? (
              <TrendView months={yearly} span={`${yearly.length} years`} unit="years" />
            ) : (
              <Txt variant="bodySm" color={Colors.textSub} center>
                Not enough history yet — check back after a full year of data.
              </Txt>
            ))}

          <Button
            title="Contact my coach"
            variant="outline"
            iconLeft="calendar-outline"
            onPress={() => router.push('/meetings/book')}
          />
        </Card>

        <Pressable
          onPress={() => router.push('/mydata/wheel-assessment')}
          style={{ alignSelf: 'center', paddingVertical: Spacing.md }}
          hitSlop={8}>
          <Txt variant="bodySm" color={Colors.textSub}>
            Retake assessment
          </Txt>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/** A real progress ring: a grey track with a primary arc filled to `pct` (0-100),
 *  starting at 12 o'clock and sweeping clockwise, with the value in the centre. */
function ProgressRing({ pct, size = 150, stroke = 14 }: { pct: number; size?: number; stroke?: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (clamped / 100) * circumference;
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={Colors.soft} strokeWidth={stroke} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={Colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <Txt variant="titleLg" color={Colors.primary}>
        {clamped}%
      </Txt>
    </View>
  );
}

function DeltaChip({ value, suffix, compact }: { value: number; suffix?: string; compact?: boolean }) {
  const up = value > 0;
  const flat = value === 0;
  const color = flat ? Colors.textSub : up ? Colors.success : Colors.danger;
  const icon = flat ? 'remove' : up ? 'arrow-up' : 'arrow-down';
  return (
    <View style={[styles.delta, compact && { paddingVertical: 1 }, { backgroundColor: `${color}1A` }]}>
      <Ionicons name={icon as never} size={compact ? 11 : 13} color={color} />
      <Txt variant="caption" color={color}>
        {up ? '+' : ''}
        {value}%{suffix ? ` ${suffix}` : ''}
      </Txt>
    </View>
  );
}

// Tallest bar's pixel height. Bars use explicit px (not %) heights so they
// render on react-native-web, where a %-height child of a flex-sized parent
// collapses to nothing.
const BAR_AREA = 120;

function TrendView({
  months,
  span,
  rows,
  unit = 'months',
}: {
  months: WheelMonth[];
  span: string;
  rows?: boolean;
  unit?: string;
}) {
  const first = months[0].score;
  const last = months[months.length - 1].score;
  const net = last - first;
  const improved = months.filter((m, i) => i > 0 && m.score > months[i - 1].score).length;
  const max = Math.max(...months.map((m) => m.score), 100);
  const trend = net > 2 ? 'Trending up' : net < -2 ? 'Trending down' : 'Holding steady';

  return (
    <View style={{ gap: Spacing.lg }}>
      <View style={styles.trendSummary}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="bodySmBold">{trend}</Txt>
          <Txt variant="caption" color={Colors.textSub}>
            {improved} of {months.length - 1} {unit} improved over the last {span}
          </Txt>
        </View>
        <DeltaChip value={net} />
      </View>

      <View style={styles.bars}>
        {months.map((m, i) => {
          const isLast = i === months.length - 1;
          const barHeight = Math.max(6, Math.round((m.score / max) * BAR_AREA));
          return (
            <View key={m.key} style={styles.barCol}>
              <Txt variant="caption" color={Colors.textSub} style={styles.barValue}>
                {m.score}
              </Txt>
              <View
                style={[
                  styles.barFill,
                  { height: barHeight, backgroundColor: isLast ? Colors.primary : Colors.lightBlue },
                ]}
              />
              <Txt variant="caption" color={isLast ? Colors.primary : Colors.textSub} style={styles.barLabel}>
                {m.label}
              </Txt>
            </View>
          );
        })}
      </View>

      {rows && (
        <View style={styles.monthRows}>
          {[...months]
            .map((m, i) => ({ m, delta: i === 0 ? 0 : m.score - months[i - 1].score }))
            .reverse()
            .map(({ m, delta }, idx, arr) => (
              <View
                key={m.key}
                style={[styles.monthRow, idx < arr.length - 1 && styles.monthRowDivider]}>
                <Txt variant="bodySm" style={{ flex: 1 }}>
                  {m.label} {m.year}
                </Txt>
                <Txt variant="bodySmBold" style={{ width: 44, textAlign: 'right' }}>
                  {m.score}%
                </Txt>
                <View style={{ width: 92, alignItems: 'flex-end' }}>
                  <DeltaChip value={delta} compact />
                </View>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

function InsightCard({ title, item, color }: { title: string; item: string; color: string }) {
  return (
    <View style={styles.insight}>
      <View style={styles.insightHead}>
        <Txt variant="bodySmBold" color={Colors.white}>
          {title}
        </Txt>
      </View>
      <View style={styles.insightBody}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Txt variant="bodyMedium">{item}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  legend: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendDot: { width: 14, height: 14, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.stroke },
  dot: { width: 12, height: 12, borderRadius: 3 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Lift the header above the ring/trend so the open menu isn't covered by them.
  headStack: { zIndex: 30, elevation: 30 },
  menuAnchor: { position: 'relative', zIndex: 30 },
  daily: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  menu: {
    position: 'absolute',
    top: 30,
    right: 0,
    minWidth: 150,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    paddingVertical: 4,
    zIndex: 20,
    shadowColor: '#0A0D14',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  trendSummary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 10 },
  barFill: { width: '72%', minWidth: 8, borderRadius: Radius.sm },
  barLabel: { fontSize: 10 },
  monthRows: {
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  monthRowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.stroke },
  ringWrap: { alignItems: 'center', gap: Spacing.md },
  insight: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  insightHead: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  insightBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
  },
});

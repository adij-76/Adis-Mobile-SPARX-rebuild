import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { WheelChart } from '@/components/ui/wheel-chart';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { wheelAreas } from '@/data/content';
import { useStore } from '@/lib/store';

export default function WheelOfLife() {
  const router = useRouter();
  const { wheelScores } = useStore();
  const scored = wheelAreas.map((a) => {
    const current = wheelScores[a.id] ?? a.current;
    return { ...a, current, value: current };
  });
  const best = scored.reduce((a, b) => (b.value > a.value ? b : a));
  const worst = scored.reduce((a, b) => (b.value < a.value ? b : a));
  const improved = scored.reduce((a, b) => (b.current - b.last > a.current - a.last ? b : a));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="IGNTD Wheel of Life" />
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

        <Txt variant="titleSm">IGNTD Life scores</Txt>
        <InsightCard title="Best Performing" item={best.label} color={best.color} />
        <InsightCard title="Most support needed" item={worst.label} color={worst.color} />
        <InsightCard title="Most Improved" item={improved.label} color={improved.color} />

        <Card style={{ gap: Spacing.lg }}>
          <View style={styles.cardHead}>
            <Txt variant="titleSm">Wheel of life</Txt>
            <View style={styles.daily}>
              <Txt variant="caption" color={Colors.textSub}>
                Daily
              </Txt>
              <Ionicons name="chevron-down" size={14} color={Colors.textSub} />
            </View>
          </View>
          <View style={styles.ringWrap}>
            <View style={styles.ring}>
              <Txt variant="titleLg" color={Colors.primary}>
                {Math.round(scored.reduce((s, c) => s + c.value, 0) / scored.length)}%
              </Txt>
            </View>
          </View>
          <Button
            title="Contact my coach"
            variant="outline"
            iconLeft="calendar-outline"
            onPress={() => router.push('/meetings/book')}
          />
        </Card>

        <Button
          title="Retake assessment"
          variant="primary"
          onPress={() => router.push('/mydata/wheel-assessment')}
        />
      </ScrollView>
    </SafeAreaView>
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
  ringWrap: { alignItems: 'center' },
  ring: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 14,
    borderColor: Colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

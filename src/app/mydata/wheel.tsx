import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { lifeAreas } from '@/data/content';

export default function WheelOfLife() {
  const avg = (lifeAreas.reduce((s, a) => s + a.score, 0) / lifeAreas.length).toFixed(1);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Back" largeTitle="Wheel of Life" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Balance ring (CSS) */}
        <View style={styles.ringWrap}>
          <View style={styles.ring}>
            <Txt variant="display" color={Colors.primary}>
              {avg}
            </Txt>
            <Txt variant="caption" color={Colors.textSub}>
              balance score
            </Txt>
          </View>
        </View>

        <Txt variant="body" color={Colors.textSub} center>
          Rate each area of your life from 1–10 to see where you feel balanced and where you&apos;d
          like to grow.
        </Txt>

        <Card padded={false} style={{ overflow: 'hidden' }}>
          {lifeAreas.map((a, i) => (
            <View
              key={a.id}
              style={[styles.row, i < lifeAreas.length - 1 && styles.rowDivider]}>
              <View style={[styles.iconCircle, { backgroundColor: `${a.color}22` }]}>
                <Ionicons name={a.icon as never} size={18} color={a.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Txt variant="bodyMedium">{a.label}</Txt>
                  <Txt variant="bodySmBold" color={a.color}>
                    {a.score}/10
                  </Txt>
                </View>
                <View style={styles.track}>
                  <View
                    style={[styles.fill, { width: `${a.score * 10}%`, backgroundColor: a.color }]}
                  />
                </View>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screen },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  ringWrap: { alignItems: 'center', marginTop: Spacing.sm },
  ring: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.stroke },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: Radius.pill, backgroundColor: Colors.soft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
});

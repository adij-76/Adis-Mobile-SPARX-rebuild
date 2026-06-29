import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/layout/screen';
import { Card } from '@/components/ui/card';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { reports, wheelCategories, wheelScore } from '@/data/content';

export default function DataScreen() {
  const router = useRouter();
  const scored = wheelCategories.map((c) => ({ ...c, score: wheelScore(c) }));
  const balance = Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length);

  return (
    <Screen style={styles.root}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 2 }}>
          <Txt variant="titleLg">My Data</Txt>
          <Txt variant="bodySm" color={Colors.textSub}>
            Track your progress and check-ins over time
          </Txt>
        </View>
        {/* Wheel of Life summary */}
        <Pressable onPress={() => router.push('/mydata/wheel')}>
          <Card style={{ gap: Spacing.lg }}>
            <View style={styles.cardHead}>
              <Txt variant="titleSm">Wheel of Life</Txt>
              <View style={styles.balancePill}>
                <Txt variant="caption" color={Colors.white}>
                  {balance}% balance
                </Txt>
              </View>
            </View>
            {scored.slice(0, 4).map((a) => (
              <View key={a.id} style={styles.areaRow}>
                <Ionicons name={a.icon as never} size={18} color={a.color} />
                <Txt variant="bodySm" style={{ width: 130 }} numberOfLines={1}>
                  {a.short}
                </Txt>
                <View style={styles.track}>
                  <View
                    style={[styles.fill, { width: `${a.score}%`, backgroundColor: a.color }]}
                  />
                </View>
                <Txt variant="bodySmBold" color={Colors.textSub}>
                  {a.score}
                </Txt>
              </View>
            ))}
            <Txt variant="bodySmMedium" color={Colors.primary}>
              View full wheel →
            </Txt>
          </Card>
        </Pressable>

        {/* Daily check-in CTA */}
        <Pressable onPress={() => router.push('/checkin')}>
          <Card style={styles.cta}>
            <View style={styles.ctaIcon}>
              <Ionicons name="clipboard" size={22} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="titleSm">Daily check-in</Txt>
              <Txt variant="bodySm" color={Colors.textSub}>
                1 minute · keeps your streak alive
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSub} />
          </Card>
        </Pressable>

        {/* Quick links */}
        <View style={styles.quick}>
          <Pressable style={styles.quickItem} onPress={() => router.push('/mydata/leaderboard')}>
            <Ionicons name="trophy" size={22} color={Colors.orange} />
            <Txt variant="bodySmMedium">Leaderboard</Txt>
          </Pressable>
          <Pressable style={styles.quickItem} onPress={() => router.push('/mydata/reports')}>
            <Ionicons name="document-text" size={22} color={Colors.primary} />
            <Txt variant="bodySmMedium">Reports</Txt>
          </Pressable>
        </View>

        {/* Reports preview */}
        <View style={styles.sectionHead}>
          <Txt variant="titleSm">Personalised reports</Txt>
          <Pressable onPress={() => router.push('/mydata/reports')}>
            <Txt variant="bodySmMedium" color={Colors.primary}>
              See all
            </Txt>
          </Pressable>
        </View>
        {reports.map((r) => (
          <Card key={r.id} style={{ gap: 4 }}>
            <Txt variant="bodyMedium">{r.title}</Txt>
            <Txt variant="caption" color={Colors.textSub}>
              {r.date}
            </Txt>
            <Txt variant="bodySm" color={Colors.textSub} numberOfLines={2}>
              {r.summary}
            </Txt>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screen },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balancePill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  track: { flex: 1, height: 8, borderRadius: Radius.pill, backgroundColor: Colors.soft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  cta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quick: { flexDirection: 'row', gap: Spacing.lg },
  quickItem: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Screen } from '@/components/layout/screen';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useAssessmentGate } from '@/lib/assessment-gate';
import type { Instrument } from '@/lib/assessments';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  intake: 'clipboard',
  gad7: 'pulse',
  phq9: 'partly-sunny',
  audit_c: 'wine',
  pcl5: 'shield-half',
};

export default function AssessmentsHub() {
  const router = useRouter();
  const gate = useAssessmentGate();
  const responses = useAsync(() => api.assessments.list(), []).data ?? [];

  // XP still on the table today: every pending instrument, plus the one-time
  // +50 for finishing the whole battery.
  const remainingXp = useMemo(
    () => gate.pending.reduce((sum, i) => sum + i.xp, 0) + (gate.pending.length > 0 ? 50 : 0),
    [gate.pending],
  );

  // Precise projection from the shared XP ledger: where finishing today's battery
  // would put them on this week's board.
  const proj = useAsync(
    () => (remainingXp > 0 ? api.xp.project(remainingXp, 'week') : Promise.resolve(null)),
    [remainingXp],
  ).data;
  const projected =
    proj && proj.projectedRank
      ? { rank: proj.projectedRank, moved: Math.max(0, proj.currentRank - proj.projectedRank) }
      : null;

  // Latest response per instrument (rows come newest-first).
  const latest = useMemo(() => {
    const m = new Map<string, { severity: string | null; score: number | null }>();
    for (const r of responses) if (!m.has(r.instrument)) m.set(r.instrument, r);
    return m;
  }, [responses]);

  const goHome = () => router.replace('/');

  const start = (i: Instrument) => router.push(`/assessments/${i.id}`);

  const allDone = gate.pending.length === 0;
  // Monthly instruments that aren't in the day-1 battery (e.g. PCL-5) — shown in
  // their own optional section.
  const extraMonthly = gate.monthlyDue.filter(
    (m) => !gate.applicable.some((a) => a.id === m.id),
  );

  return (
    <Screen variant="modal" style={styles.gutter}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Home" largeTitle="Your assessments" onBack={goHome} />

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Contextual banner */}
          {gate.locked ? (
            <View style={[styles.banner, styles.bannerAlert]}>
              <Ionicons name="lock-closed" size={20} color={Colors.orange} />
              <Txt variant="bodySm" style={{ flex: 1 }} color={Colors.textMain}>
                Finish one quick assessment to unlock videos and lessons for today. It takes about a
                minute — and you&apos;ll earn XP.
              </Txt>
            </View>
          ) : gate.offerDay1 && !allDone ? (
            <View style={[styles.banner, styles.bannerOffer]}>
              <Ionicons name="gift" size={20} color={Colors.primary} />
              <Txt variant="bodySm" style={{ flex: 1 }} color={Colors.textMain}>
                Complete these now to personalize your journey and earn bonus XP. Prefer to wait?
                They&apos;ll be here tomorrow.
              </Txt>
            </View>
          ) : allDone ? (
            <View style={[styles.banner, styles.bannerDone]}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Txt variant="bodySm" style={{ flex: 1 }} color={Colors.textMain}>
                You&apos;re all caught up. We&apos;ll check in again monthly to track your progress.
              </Txt>
            </View>
          ) : null}

          {/* Projected leaderboard rank — a concrete reason to finish today. */}
          {!allDone && projected ? (
            <View style={styles.rankCard}>
              <View style={styles.rankTrophy}>
                <Ionicons name="trophy" size={22} color={Colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyMedium" color={Colors.textMain}>
                  {projected.moved > 0
                    ? `Finish today (+${remainingXp} XP) to climb ${projected.moved} spot${
                        projected.moved > 1 ? 's' : ''
                      } to #${projected.rank} on this week's leaderboard.`
                    : `Finish today (+${remainingXp} XP) to reach #${projected.rank} on this week's leaderboard.`}
                </Txt>
              </View>
            </View>
          ) : null}

          <Txt variant="bodySm" color={Colors.textSub}>
            These are confidential and only used to tailor your support and track your progress over
            time.
          </Txt>

          <View style={{ gap: Spacing.md }}>
            {gate.applicable.map((i) => {
              const done = gate.completedIds.includes(i.id);
              const result = latest.get(i.id);
              const due = done && gate.monthlyDue.some((m) => m.id === i.id);
              return (
                <Pressable
                  key={i.id}
                  onPress={() => start(i)}
                  style={[styles.card, done && !due && styles.cardDone]}>
                  <View style={[styles.cardIcon, done && !due && styles.cardIconDone]}>
                    <Ionicons
                      name={due ? 'refresh' : done ? 'checkmark' : (ICONS[i.id] ?? 'document-text')}
                      size={22}
                      color={done && !due ? Colors.white : Colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="bodyMedium">{i.name}</Txt>
                    {due ? (
                      <Txt variant="bodySm" color={Colors.orange}>
                        Due for your monthly check-in · +{i.xp} XP
                      </Txt>
                    ) : done && result ? (
                      <Txt variant="bodySm" color={Colors.textSub}>
                        {result.severity ?? 'Completed'}
                        {result.score != null ? ` · score ${result.score}` : ''} · tap to retake
                      </Txt>
                    ) : (
                      <Txt variant="bodySm" color={Colors.textSub}>
                        ~{i.estMinutes} min · +{i.xp} XP
                      </Txt>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.strokeStrong} />
                </Pressable>
              );
            })}
          </View>

          {/* Monthly tracking instruments that aren't part of the day-1 battery
              (e.g. PCL-5). Optional, XP-rewarded, never gate content. */}
          {extraMonthly.length > 0 ? (
            <View style={{ gap: Spacing.md }}>
              <Txt variant="titleSm">Track your progress</Txt>
              <Txt variant="bodySm" color={Colors.textSub}>
                Optional monthly check-ins that help us see what&apos;s improving — and earn you XP.
              </Txt>
              {extraMonthly.map((i) => {
                const result = latest.get(i.id);
                return (
                  <Pressable key={i.id} onPress={() => start(i)} style={styles.card}>
                    <View style={styles.cardIcon}>
                      <Ionicons name={ICONS[i.id] ?? 'document-text'} size={22} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="bodyMedium">{i.name}</Txt>
                      <Txt variant="bodySm" color={Colors.textSub}>
                        {result?.severity ? `${result.severity} · retake · ` : `~${i.estMinutes} min · `}
                        +{i.xp} XP
                      </Txt>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.strokeStrong} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {gate.owed ? (
            <Button
              title={`Start: ${gate.owed.shortName}`}
              variant="primary"
              onPress={() => gate.owed && start(gate.owed)}
            />
          ) : (
            <Button title="Back to home" variant="primary" onPress={goHome} />
          )}
          {gate.locked ? (
            <Pressable onPress={goHome} style={styles.homeLink} hitSlop={8}>
              <Txt variant="bodySm" color={Colors.textSub}>
                Not now — back to home
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: { backgroundColor: Colors.screen },
  safe: { flex: 1, backgroundColor: Colors.white },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  bannerAlert: { backgroundColor: Colors.highlight, borderColor: Colors.highlightBorder },
  bannerOffer: { backgroundColor: 'rgba(22,104,144,0.06)', borderColor: 'rgba(22,104,144,0.25)' },
  bannerDone: { backgroundColor: 'rgba(56,199,147,0.08)', borderColor: 'rgba(56,199,147,0.3)' },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,157,75,0.35)',
    backgroundColor: 'rgba(255,157,75,0.1)',
    padding: Spacing.md,
  },
  rankTrophy: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,157,75,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.white,
  },
  cardDone: { backgroundColor: Colors.screen },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconDone: { backgroundColor: Colors.success },
  footer: { padding: Spacing.lg, gap: Spacing.sm },
  homeLink: { alignItems: 'center', paddingVertical: Spacing.xs },
});

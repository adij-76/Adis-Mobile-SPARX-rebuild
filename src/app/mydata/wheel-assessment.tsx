import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { wheelAreas } from '@/data/content';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';

export default function WheelAssessment() {
  const router = useRouter();
  const { saveWheel } = useStore();
  const { user: authUser } = useAuth();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  // The user's REAL current per-area scores. Sliders start here, not from the
  // static seed defaults — otherwise a retake where the user moves 2 sliders
  // would persist 8 fabricated seed scores that then win as newest-per-area and
  // pollute the averages, permanently (mobile_wheel_entries is insert-only —
  // audit D-H3). While it loads, fall back to the seed so a slider always renders.
  const realAreas = useAsync(() => api.insights.wheelAreas(), []);
  // Areas the user actually moved — only these are persisted on Finish.
  const touched = useRef<Set<string>>(new Set());
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    wheelAreas.forEach((a) => (init[a.id] = a.current));
    return init;
  });

  // Once the real scores load, seed the sliders from them — but never clobber an
  // area the user has already adjusted.
  useEffect(() => {
    const areas = realAreas.data;
    if (!areas) return;
    setValues((prev) => {
      const next = { ...prev };
      for (const a of areas) if (!touched.current.has(a.id)) next[a.id] = a.current;
      return next;
    });
  }, [realAreas.data]);

  const cat = wheelAreas[step];
  const isLast = step === wheelAreas.length - 1;

  if (done) {
    return (
      <View style={styles.successRoot}>
        <SafeAreaView style={styles.successSafe} edges={['top', 'bottom']}>
          <View style={styles.successCenter}>
            <View style={styles.star}>
              <Ionicons name="checkmark" size={52} color={Colors.white} />
            </View>
            <Txt variant="titleLg" color={Colors.white} center style={{ marginTop: Spacing.xl }}>
              Assessment complete!
            </Txt>
            <Txt variant="body" color={Colors.textMutedOnDark} center style={{ marginTop: Spacing.sm }}>
              Your updated Wheel of Life is ready. See where you&apos;re thriving and where to focus.
            </Txt>
          </View>
          <Button title="View my wheel" variant="secondary" onPress={() => router.replace('/mydata/wheel')} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Back" />
      <View style={styles.progressWrap}>
        <ProgressBar
          progress={(step + 1) / wheelAreas.length}
          track={Colors.soft}
          fill={cat.color}
        />
        <Txt variant="caption" color={Colors.textSub} style={{ marginTop: Spacing.sm }}>
          {step + 1} of {wheelAreas.length}
        </Txt>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.catHead}>
          <View style={[styles.catIcon, { backgroundColor: `${cat.color}22` }]}>
            <Ionicons name={cat.icon as never} size={22} color={cat.color} />
          </View>
          <Txt variant="title">{cat.label}</Txt>
        </View>

        <View style={styles.qBlock}>
          <Txt variant="bodySm" color={Colors.textSub}>
            {cat.prompt}
          </Txt>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={values[cat.id]}
            onValueChange={(v) => {
              touched.current.add(cat.id);
              setValues((s) => ({ ...s, [cat.id]: v }));
            }}
            accessibilityLabel={`${cat.label} score`}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(values[cat.id]) }}
            minimumTrackTintColor={cat.color}
            maximumTrackTintColor={Colors.soft}
            thumbTintColor={cat.color}
          />
          <View style={styles.scaleRow}>
            <Txt variant="caption" color={Colors.textSub}>
              0
            </Txt>
            <Txt variant="bodySmBold" color={cat.color}>
              {Math.round(values[cat.id])}
            </Txt>
            <Txt variant="caption" color={Colors.textSub}>
              100
            </Txt>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <View style={{ flex: 1 }}>
            <Button title="Previous" variant="secondary" iconLeft="chevron-back" onPress={() => setStep((s) => s - 1)} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Button
            title={isLast ? 'Finish' : 'Next'}
            variant="primary"
            iconRight={isLast ? undefined : 'chevron-forward'}
            onPress={() => {
              if (isLast) {
                // Persist ONLY the areas the user actually moved — never write
                // back untouched baselines as if they were freshly entered (D-H3).
                // life_area_id 1..10 maps by order to the seed wheelAreas.
                const changed = wheelAreas
                  .map((a, i) => ({ id: a.id, lifeAreaId: i + 1, score: values[a.id] }))
                  .filter((e) => touched.current.has(e.id));
                if (changed.length) {
                  const localScores: Record<string, number> = {};
                  changed.forEach((e) => (localScores[e.id] = e.score));
                  saveWheel(localScores);
                  // Best-effort so a write failure never blocks the success screen.
                  api.insights
                    .saveWheel(
                      changed.map((e) => ({ lifeAreaId: e.lifeAreaId, score: e.score })),
                      authUser?.appUserId ?? null,
                    )
                    .catch(() => {});
                }
                setDone(true);
              } else {
                setStep((s) => s + 1);
              }
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  progressWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  body: { padding: Spacing.lg, gap: Spacing.xl },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  catIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  qBlock: { gap: Spacing.sm },
  scaleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
  successRoot: { flex: 1, backgroundColor: Colors.primaryDarker },
  successSafe: { flex: 1, paddingHorizontal: Spacing.lg },
  successCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  star: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

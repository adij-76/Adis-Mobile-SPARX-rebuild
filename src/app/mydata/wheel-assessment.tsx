import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { wheelAreas } from '@/data/content';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';

export default function WheelAssessment() {
  const router = useRouter();
  const { saveWheel } = useStore();
  const { user: authUser } = useAuth();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    wheelAreas.forEach((a) => (init[a.id] = a.current));
    return init;
  });

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
            onValueChange={(v) => setValues((s) => ({ ...s, [cat.id]: v }))}
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
                saveWheel(values);
                // Persist to the backend too. life_area_id 1..10 maps by order
                // to the seed wheelAreas; best-effort so a write failure never
                // blocks the local save / success screen.
                const entries = wheelAreas.map((a, i) => ({ lifeAreaId: i + 1, score: values[a.id] }));
                api.insights.saveWheel(entries, authUser?.appUserId ?? null).catch(() => {});
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
  safe: { flex: 1, backgroundColor: Colors.white },
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

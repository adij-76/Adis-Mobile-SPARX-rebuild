import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { WORKSHOP_STEPS } from '@/data/content';

type NavTarget = '/workshop/intro' | '/workshop/video' | '/workshop/worksheet' | '/workshop/summary';

export type WorkshopScaffoldProps = {
  current: number;
  children: ReactNode;
  prev?: NavTarget;
  next?: NavTarget;
  nextLabel?: string;
  nextDisabled?: boolean;
};

/** Shared chrome for the workshop step screens: back header, progress
 *  stepper, scrollable body and a Previous / Next footer. */
export function WorkshopScaffold({
  current,
  children,
  prev,
  next,
  nextLabel = 'Next',
  nextDisabled,
}: WorkshopScaffoldProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
          <Txt variant="bodyMedium">Back</Txt>
        </Pressable>
      </View>

      <View style={styles.stepperWrap}>
        <Stepper steps={WORKSHOP_STEPS} current={current} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerBtn}>
          <Button
            title="Previous"
            variant="secondary"
            iconLeft="chevron-back"
            disabled={!prev}
            onPress={() => prev && router.push(prev)}
          />
        </View>
        <View style={styles.footerBtn}>
          <Button
            title={nextLabel}
            variant="secondary"
            iconRight="chevron-forward"
            disabled={!next || nextDisabled}
            onPress={() => next && router.push(next)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepperWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  footerBtn: { flex: 1 },
});

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { WorkshopScaffold } from '@/components/workshop-scaffold';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Txt } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type StepRow = {
  n: number;
  label: string;
  action?: { title: string; icon: keyof typeof Ionicons.glyphMap };
};

const STEPS: StepRow[] = [
  { n: 1, label: 'Download worksheet', action: { title: 'Download', icon: 'download-outline' } },
  { n: 2, label: 'Fill worksheet' },
  { n: 3, label: 'Upload worksheet', action: { title: 'Upload', icon: 'cloud-upload-outline' } },
];

export default function WorkshopWorksheet() {
  const [uploaded, setUploaded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <WorkshopScaffold
      current={2}
      prev="/workshop/video"
      next="/workshop/summary"
      nextDisabled={!uploaded}>
      <Txt variant="bodyMedium">Complete this worksheet in 3 steps</Txt>

      <View style={{ gap: Spacing.md }}>
        {STEPS.map((s) => {
          const complete = uploaded || s.n === 1;
          return (
            <View key={s.n} style={styles.row}>
              <View
                style={[
                  styles.badge,
                  complete ? styles.badgeDone : styles.badgeIdle,
                ]}>
                {complete ? (
                  <Ionicons name="checkmark" size={16} color={Colors.white} />
                ) : (
                  <Txt variant="bodySmBold" color={Colors.textSub}>
                    {s.n}
                  </Txt>
                )}
              </View>
              <Txt variant="bodySm" style={{ flex: 1 }}>
                {s.label}
              </Txt>
              {s.action && (
                <View style={{ width: 130 }}>
                  <Button
                    title={s.action.title}
                    iconRight={s.action.icon}
                    variant="primary"
                    size="md"
                    onPress={() => s.n === 3 && setConfirming(true)}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {!uploaded && (
        <Txt variant="caption" color={Colors.textSub} center>
          Upload your completed worksheet to continue.
        </Txt>
      )}

      <ConfirmSheet
        visible={confirming}
        title="Have you filled the worksheet?"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          setUploaded(true);
        }}
      />
    </WorkshopScaffold>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDone: { backgroundColor: Colors.success },
  badgeIdle: { backgroundColor: Colors.soft },
});

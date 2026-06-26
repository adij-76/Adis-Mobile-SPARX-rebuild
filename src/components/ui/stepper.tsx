import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { Txt } from '@/components/ui/text';

export type StepState = 'done' | 'active' | 'locked';

export type Step = {
  key: string;
  label: string;
};

export type StepperProps = {
  steps: Step[];
  /** index of the current (active) step */
  current: number;
};

function stateFor(index: number, current: number): StepState {
  if (index < current) return 'done';
  if (index === current) return 'active';
  return 'locked';
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <View style={styles.row}>
      {steps.map((step, i) => {
        const state = stateFor(i, current);
        const isLast = i === steps.length - 1;
        return (
          <Fragment key={step.key}>
            <View style={styles.item}>
              <View
                style={[
                  styles.circle,
                  state === 'done' && { backgroundColor: Colors.success },
                  state === 'active' && {
                    backgroundColor: Colors.white,
                    borderWidth: 2,
                    borderColor: Colors.success,
                  },
                  state === 'locked' && {
                    backgroundColor: Colors.white,
                    borderWidth: 1,
                    borderColor: Colors.stroke,
                  },
                ]}>
                {state === 'done' && <Ionicons name="checkmark" size={16} color={Colors.white} />}
                {state === 'active' && (
                  <View style={styles.activeDot} />
                )}
                {state === 'locked' && (
                  <Ionicons name="lock-closed" size={12} color={Colors.textSub} />
                )}
              </View>
              <Txt
                variant="caption"
                color={state === 'locked' ? Colors.textSub : Colors.textMain}
                style={styles.label}>
                {step.label}
              </Txt>
            </View>
            {!isLast && (
              <View
                style={[
                  styles.connector,
                  { backgroundColor: i < current ? Colors.success : Colors.stroke },
                ]}
              />
            )}
          </Fragment>
        );
      })}
    </View>
  );
}

const CIRCLE = 28;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xs,
  },
  item: { alignItems: 'center', width: 64 },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  label: { marginTop: Spacing.xs },
  connector: {
    flex: 1,
    height: 1.5,
    marginTop: CIRCLE / 2,
  },
});

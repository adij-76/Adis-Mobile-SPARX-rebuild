import { View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

export type ProgressBarProps = {
  /** 0–1 */
  progress: number;
  height?: number;
  track?: string;
  fill?: string;
};

export function ProgressBar({
  progress,
  height = 6,
  track = 'rgba(255,255,255,0.25)',
  fill = Colors.orange,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View
      style={{
        height,
        backgroundColor: track,
        borderRadius: Radius.pill,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          backgroundColor: fill,
          borderRadius: Radius.pill,
        }}
      />
    </View>
  );
}

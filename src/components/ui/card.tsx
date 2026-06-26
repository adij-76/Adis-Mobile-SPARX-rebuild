import { View, type ViewProps } from 'react-native';

import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

export type CardProps = ViewProps & {
  padded?: boolean;
  elevated?: boolean;
};

/** White rounded surface used throughout the dashboard. */
export function Card({ padded = true, elevated = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.white,
          borderRadius: Radius.lg,
          borderWidth: 1,
          borderColor: Colors.stroke,
        },
        padded && { padding: Spacing.lg },
        elevated && Shadow.card,
        style,
      ]}
      {...rest}
    />
  );
}

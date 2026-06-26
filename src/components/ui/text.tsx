import { Text, type TextProps } from 'react-native';

import { Colors, Typography, type TypographyVariant } from '@/constants/theme';

export type TxtProps = TextProps & {
  variant?: TypographyVariant;
  /** Any color from the theme palette, or a raw color string. */
  color?: string;
  center?: boolean;
};

/**
 * Themed text primitive. Defaults to body type in the main text color.
 * Pass a `variant` from the Figma type ramp and a `color` token.
 */
export function Txt({
  variant = 'body',
  color = Colors.textMain,
  center,
  style,
  ...rest
}: TxtProps) {
  return (
    <Text
      style={[Typography[variant], { color }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}

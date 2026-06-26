/**
 * IGNTD design tokens — extracted from the Figma board
 * (file: IGNTD, "Workshop" section). These map the Figma design
 * variables to a typed theme consumed across the app.
 */

export const Colors = {
  // Brand / blues
  primary: '#166890', // Figma "Main" — primary teal
  primaryDark: '#0A3653', // "Main1" / Foundation/Blue/blue-500 — dark header
  primaryDarker: '#00314E', // "Dark blue" — completion screen bg
  blue600: '#1C3B55', // Foundation/Blue/blue-600
  lightBlue: '#699AC1', // "Light blue" — Prev/Next buttons
  tealLight: '#C2EFFF', // "teal/light"

  // Accents
  orange: '#FF9D4B', // "Orange main" — CTA buttons
  orangePale: '#FFB879', // "Pale" — banner / star
  success: '#38C793', // "state/success" — completed steps
  danger: '#DF1C41', // "red/base"

  // Text
  textMain: '#0A0D14', // text/main-900
  textSub: '#525866', // text/sub-500
  textOnDark: '#FFFFFF',
  textMutedOnDark: 'rgba(255,255,255,0.7)',

  // Surfaces
  white: '#FFFFFF', // bg/white-0
  screen: '#F6F7F9', // light app background
  soft: '#E2E4E9', // bg/soft-200
  stroke: '#E2E4E9', // stroke/soft-200
  strokeStrong: '#CDD0D5',

  // Misc
  star: '#C7D66D', // completion star (olive/lime)
  overlay: 'rgba(10,13,20,0.4)',
} as const;

export type ThemeColorName = keyof typeof Colors;

/** Light/dark maps kept for the framework's ThemeProvider. The app is
 *  predominantly a light experience with dark hero surfaces. */
export const ThemeColors = {
  light: {
    text: Colors.textMain,
    textSecondary: Colors.textSub,
    background: Colors.screen,
    card: Colors.white,
    border: Colors.stroke,
    tint: Colors.primary,
  },
  dark: {
    text: Colors.textOnDark,
    textSecondary: Colors.textMutedOnDark,
    background: Colors.primaryDarker,
    card: Colors.blue600,
    border: 'rgba(255,255,255,0.12)',
    tint: Colors.tealLight,
  },
} as const;

/** Lato is the design's typeface. Standard Lato ships 400/700/900, so the
 *  Figma "Medium"/"SemiBold" steps are approximated with Regular/Bold. */
export const FontFamily = {
  regular: 'Lato_400Regular',
  medium: 'Lato_400Regular',
  semibold: 'Lato_700Bold',
  bold: 'Lato_700Bold',
  black: 'Lato_900Black',
} as const;

/** Type ramp from the Figma text styles (PXs/PS/PM/PL). */
export const Typography = {
  // PXs/12/R
  caption: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 20 },
  // PS/14/*
  bodySm: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  bodySmMedium: { fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 },
  bodySmBold: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  // PM/16/*
  body: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 24 },
  // PL/18/*
  titleSm: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 28 },
  title: { fontFamily: FontFamily.semibold, fontSize: 20, lineHeight: 28 },
  titleLg: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 },
  display: { fontFamily: FontFamily.bold, fontSize: 28, lineHeight: 36 },
} as const;

export type TypographyVariant = keyof typeof Typography;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#1B1C1D',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

import { useWindowDimensions } from 'react-native';

import { Breakpoints } from '@/constants/theme';

export type Breakpoint = {
  width: number;
  isPhone: boolean;
  isTablet: boolean;
  /** ≥ 1024px — render the desktop shell (sidebar + centered column). */
  isDesktop: boolean;
};

/**
 * Single source of truth for responsive layout. Built on useWindowDimensions so
 * it updates live as the browser window resizes.
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return {
    width,
    isPhone: width < Breakpoints.tablet,
    isTablet: width >= Breakpoints.tablet && width < Breakpoints.desktop,
    isDesktop: width >= Breakpoints.desktop,
  };
}

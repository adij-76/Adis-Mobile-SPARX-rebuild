import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * A back handler that never dead-ends.
 *
 * A bare `router.back()` silently does nothing when there's no history entry to
 * pop — which happens constantly on web: a page opened from a direct URL, a
 * refresh, or any screen reached via `router.replace` starts with an empty back
 * stack. That's why back arrows felt "broken" and left users stuck. This pops
 * history when it can, and otherwise navigates to a sensible fallback (Home by
 * default) so every screen always has a working exit.
 */
export function useGoBack(fallback: string = '/') {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback as never);
  }, [router, fallback]);
}

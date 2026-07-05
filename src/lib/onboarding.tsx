/**
 * Onboarding gate. After sign-in, asks the backend whether this user still needs
 * onboarding (a new user with no production row who hasn't finished). The Shell
 * reads `status` to route them to /onboarding and hold them there until done.
 *
 * Fails OPEN: any error (view not deployed yet, network blip) resolves to
 * 'done', so a backend hiccup never traps a user behind the gate. Existing
 * production users are 'done' by definition — they keep their historical data.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api } from '@/api';
import { useAuth } from '@/lib/auth';

/** 'unknown' until the first status check resolves; then 'needed' or 'done'. */
type OnboardingState = 'unknown' | 'needed' | 'done';

type OnboardingValue = {
  status: OnboardingState;
  /** Re-check the gate (e.g. after finishing the flow). */
  refresh: () => void;
  /** Optimistically mark onboarding done (called on the final step) so the Shell
   *  lets the user into the app immediately without waiting for a re-fetch. */
  markComplete: () => void;
};

const OnboardingContext = createContext<OnboardingValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const [state, setState] = useState<OnboardingState>('unknown');

  const refresh = useCallback(() => {
    if (authStatus !== 'authed') {
      setState('unknown');
      return;
    }
    let active = true;
    api.onboarding
      .status()
      .then((s) => {
        if (active) setState(s.needsOnboarding ? 'needed' : 'done');
      })
      .catch(() => {
        if (active) setState('done'); // fail open — never trap a user in onboarding
      });
    return () => {
      active = false;
    };
  }, [authStatus]);

  // Re-check whenever auth state or the signed-in user changes.
  useEffect(() => {
    const cleanup = refresh();
    return cleanup;
  }, [refresh, user?.id]);

  const markComplete = useCallback(() => setState('done'), []);

  const value = useMemo<OnboardingValue>(
    () => ({ status: state, refresh, markComplete }),
    [state, refresh, markComplete],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}

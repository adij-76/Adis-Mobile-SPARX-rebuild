/**
 * Onboarding gate. After sign-in, asks the backend whether this user still needs
 * onboarding (a new user with no production row who hasn't finished). The Shell
 * reads `status` to route them to /onboarding and hold them there until done.
 *
 * Also the single source of truth for onboarding status app-wide — the
 * assessment gate reads `isExistingUser` / `completedAt` from here rather than
 * re-fetching, so sign-in only costs one status round-trip.
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
  /** True for a user with a real production row (never onboards / gates). */
  isExistingUser: boolean;
  /** When onboarding finished (ISO) — anchors the day-1 assessment window. */
  completedAt: string | null;
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
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (authStatus !== 'authed') {
      setState('unknown');
      setIsExistingUser(false);
      setCompletedAt(null);
      return;
    }
    let active = true;
    api.onboarding
      .status()
      .then((s) => {
        if (!active) return;
        setState(s.needsOnboarding ? 'needed' : 'done');
        setIsExistingUser(s.isExistingUser);
        setCompletedAt(s.completedAt);
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

  // Optimistic: flip to done and stamp completedAt = now, so the Shell lets them
  // in AND the day-1 assessment window anchors immediately — without a refetch
  // (which could bounce them back if the profile write hadn't landed yet).
  const markComplete = useCallback(() => {
    setState('done');
    setCompletedAt((prev) => prev ?? new Date().toISOString());
  }, []);

  const value = useMemo<OnboardingValue>(
    () => ({ status: state, isExistingUser, completedAt, refresh, markComplete }),
    [state, isExistingUser, completedAt, refresh, markComplete],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}

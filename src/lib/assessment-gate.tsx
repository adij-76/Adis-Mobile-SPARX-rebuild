/**
 * The day-1 assessment gate. New users are offered the battery on the day they
 * finish onboarding (with XP); if they skip, from the next day the soft gate
 * blocks CONTENT (videos/lessons/workshops) until they complete one instrument
 * that day — home, check-in, and community stay open. Existing users and users
 * who've finished the battery are never gated.
 *
 * All state is derived from three reads (onboarding status, the user's problems,
 * their assessment responses); nothing is stored here. Fails OPEN — any error
 * leaves the gate unlocked so a backend blip never blocks the app.
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
import { applicableBattery, type Instrument } from '@/lib/assessments';
import { useAuth } from '@/lib/auth';

const todayKey = () => new Date().toISOString().slice(0, 10);

type GateData = {
  /** Instruments that apply to this user (substance-only ones included when
   *  substance is a stated concern). */
  applicable: Instrument[];
  /** Instrument ids the user has already completed. */
  completedIds: string[];
  /** Applicable instruments not yet completed, in battery order. */
  pending: Instrument[];
  /** The next instrument owed (pending[0]), or null. */
  owed: Instrument | null;
  /** Day-1 offer window — battery incomplete on the day onboarding finished. */
  offerDay1: boolean;
  /** Content is locked until one instrument is completed today. */
  locked: boolean;
};

type GateValue = GateData & {
  loading: boolean;
  refresh: () => void;
};

const EMPTY: GateData = {
  applicable: [],
  completedIds: [],
  pending: [],
  owed: null,
  offerDay1: false,
  locked: false,
};

const GateContext = createContext<GateValue | null>(null);

export function AssessmentGateProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const [data, setData] = useState<GateData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (authStatus !== 'authed') {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const status = await api.onboarding.status();
      // Only onboarded NEW users are gated. Existing users / not-yet-finished
      // users are never blocked here.
      if (status.isExistingUser || !status.completedAt) {
        setData(EMPTY);
        return;
      }
      const [profile, problems, responses] = await Promise.all([
        api.onboarding.get(),
        api.onboarding.problems(),
        api.assessments.list(),
      ]);
      const substanceIds = new Set(
        problems.filter((p) => p.category === 'substance').map((p) => p.id),
      );
      const selected = [
        ...(profile?.primaryProblem ? [profile.primaryProblem] : []),
        ...(profile?.secondaryProblems ?? []),
      ];
      const hasSubstance = selected.some((id) => substanceIds.has(id));

      const applicable = applicableBattery(hasSubstance);
      const completedIds = Array.from(new Set(responses.map((r) => r.instrument)));
      const completedSet = new Set(completedIds);
      const pending = applicable.filter((i) => !completedSet.has(i.id));

      const day1 = status.completedAt.slice(0, 10);
      const today = todayKey();
      const completedToday = responses.some((r) => r.takenAt.slice(0, 10) === today);
      const offerDay1 = pending.length > 0 && today === day1;
      const locked = pending.length > 0 && today > day1 && !completedToday;

      setData({ applicable, completedIds, pending, owed: pending[0] ?? null, offerDay1, locked });
    } catch {
      setData(EMPTY); // fail open
    } finally {
      setLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, [load, user?.id]);

  const value = useMemo<GateValue>(() => ({ ...data, loading, refresh: load }), [data, loading, load]);

  return <GateContext.Provider value={value}>{children}</GateContext.Provider>;
}

export function useAssessmentGate(): GateValue {
  const ctx = useContext(GateContext);
  if (!ctx) throw new Error('useAssessmentGate must be used within an AssessmentGateProvider');
  return ctx;
}

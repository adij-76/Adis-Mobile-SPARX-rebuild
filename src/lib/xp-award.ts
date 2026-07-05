/**
 * useXpAward — the one place completions log XP to the shared ledger and get
 * back the leaderboard movement to celebrate. Call it right after the local
 * store award so the celebration can show "+N XP · climbed 3 spots → now #7".
 *
 * It projects rank BEFORE recording (so current=pre, projected=post), then
 * appends the event. Best-effort: if the backend is unavailable it still returns
 * the earned XP so the reward always shows — just without the rank line.
 */
import { useCallback } from 'react';

import { api } from '@/api';
import type { XpAwardInput, XpPeriod } from '@/api/types';
import { useAuth } from '@/lib/auth';

export type XpMovement = {
  earned: number;
  /** Post-award rank on the window, or null if unavailable. */
  rank: number | null;
  /** Spots climbed this award (≥ 0). */
  moved: number;
  totalPlayers: number | null;
  period: XpPeriod;
};

export function useXpAward() {
  const { user } = useAuth();
  const appUserId = user?.appUserId ?? null;

  return useCallback(
    async (input: XpAwardInput, period: XpPeriod = 'week'): Promise<XpMovement | null> => {
      const points = Math.round(input.points || 0);
      if (points <= 0) return null;
      let proj = null;
      try {
        proj = await api.xp.project(points, period);
      } catch {
        proj = null;
      }
      // Append to the ledger (fire-and-forget; the reward shouldn't block on it).
      api.xp.record({ ...input, points }, appUserId).catch(() => {});
      if (!proj) return { earned: points, rank: null, moved: 0, totalPlayers: null, period };
      return {
        earned: points,
        rank: proj.projectedRank,
        moved: Math.max(0, proj.currentRank - proj.projectedRank),
        totalPlayers: proj.totalPlayers,
        period,
      };
    },
    [appUserId],
  );
}

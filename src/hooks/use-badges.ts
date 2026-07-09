import { useMemo } from 'react';

import { api } from '@/api';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/lib/auth';
import { ALL_BADGES, computeBadges, type BadgeContext, type BadgeDef } from '@/lib/badges';
import { useStore } from '@/lib/store';

export type BadgeWithCount = { def: BadgeDef; count: number };

const dayMs = 86400000;

/**
 * The signed-in user's badges, computed live from their activity. The core
 * (check-in / community / XP / profile) data is already in the store; the
 * phase-2 categories (connections, assessments, tenure) are fetched once and
 * fold into the same snapshot — their badges stay locked until the data loads.
 */
export function useBadges() {
  const { checkins, xp, badgeStats } = useStore();
  const { user } = useAuth();
  const profileComplete = !!(user?.name?.trim() && user?.avatarUrl);

  // Extra, backend-backed inputs. Fail-soft: any error just leaves that category
  // locked rather than breaking the whole badge computation.
  const extra = useAsync(async () => {
    const [conns, assessments, status] = await Promise.all([
      api.connections.list().catch(() => []),
      api.assessments.list().catch(() => []),
      api.onboarding.status().catch(() => null),
    ]);
    return {
      connections: conns.filter((c) => c.status === 'accepted').length,
      assessments: assessments.map((a) => ({ instrument: a.instrument, score: a.score, takenAt: a.takenAt })),
      completedAt: status?.completedAt ?? null,
    };
  }, []);

  const connections = extra.data?.connections ?? 0;
  const assessments = extra.data?.assessments ?? [];
  const completedAt = extra.data?.completedAt ?? null;

  return useMemo(() => {
    // Tenure anchor = the earliest signal we have that the user is "in the app":
    // their onboarding completion or their first-ever check-in, whichever is older.
    const anchors: number[] = [];
    if (completedAt) {
      const t = new Date(completedAt).getTime();
      if (!Number.isNaN(t)) anchors.push(t);
    }
    if (checkins.length) {
      const first = checkins.map((c) => c.date).sort()[0];
      const t = new Date(`${first}T00:00:00`).getTime();
      if (!Number.isNaN(t)) anchors.push(t);
    }
    const tenureDays = anchors.length ? Math.floor((Date.now() - Math.min(...anchors)) / dayMs) : 0;

    const ctx: BadgeContext = {
      checkins: checkins.map((c) => ({
        date: c.date,
        mood: c.mood,
        behavior: c.behavior,
        affirmation: c.affirmation,
        at: c.at,
      })),
      xp,
      posts: badgeStats.posts,
      comments: badgeStats.comments,
      reactions: badgeStats.reactions,
      lessonsCompleted: badgeStats.lessonsCompleted,
      profileComplete,
      connections,
      assessments,
      tenureDays,
    };
    const counts = computeBadges(ctx);
    const all: BadgeWithCount[] = ALL_BADGES.map((def) => ({ def, count: counts[def.id] ?? 0 }));
    const earned = all.filter((b) => b.count > 0);
    return { all, earned, counts };
  }, [checkins, xp, badgeStats, profileComplete, connections, assessments, completedAt]);
}

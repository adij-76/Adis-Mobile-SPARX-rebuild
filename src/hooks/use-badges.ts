import { useMemo } from 'react';

import { useAuth } from '@/lib/auth';
import { ALL_BADGES, computeBadges, type BadgeContext, type BadgeDef } from '@/lib/badges';
import { useStore } from '@/lib/store';

export type BadgeWithCount = { def: BadgeDef; count: number };

/**
 * The signed-in user's badges, computed live from their activity (no separate
 * persistence — the underlying check-in / community / XP data is already saved).
 */
export function useBadges() {
  const { checkins, xp, badgeStats } = useStore();
  const { user } = useAuth();
  const profileComplete = !!(user?.name?.trim() && user?.avatarUrl);

  return useMemo(() => {
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
    };
    const counts = computeBadges(ctx);
    const all: BadgeWithCount[] = ALL_BADGES.map((def) => ({ def, count: counts[def.id] ?? 0 }));
    const earned = all.filter((b) => b.count > 0);
    return { all, earned, counts };
  }, [checkins, xp, badgeStats, profileComplete]);
}

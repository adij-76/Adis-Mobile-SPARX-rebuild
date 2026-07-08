/**
 * Lightweight app-wide store backed by AsyncStorage.
 *
 * Makes the "feels alive" interactions persist locally (favorites, joined
 * communities, user-created posts, reactions, comments) until a real backend is
 * wired in. Everything here is per-device and survives reloads/restarts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import type { GameState } from '@/api/types';
import { posts as basePosts, type Comment, type Meeting, type Post } from '@/data/content';
import { activeBonusMultiplier } from '@/lib/bonus-events';
import { computeStreak } from '@/lib/checkin';
import { milestonesReached, type StreakMilestone } from '@/lib/streaks';
import { videoPointsEarned } from '@/lib/video-points';
import { XP_BASE, xpEarned, type XpActivity } from '@/lib/xp';

const KEY = 'igntd.store.v1';

export type FavKind = 'video' | 'lesson';
const favKey = (k: FavKind, id: string) => `${k}:${id}`;

export type DmMessage = { id: string; from: 'me' | 'them'; text: string; time: string };
export type DmThread = { id: string; name: string; avatar: string; messages: DmMessage[] };

export type CheckinEntry = {
  date: string; // YYYY-MM-DD
  mood: number; // 0-100
  positive: string[];
  negative: string[];
  behavior: 'yes' | 'no' | null;
  amount: 'less' | 'same' | 'more' | null;
  count: string;
  affirmation: string;
};

/** `date` (YYYY-MM-DD) minus `n` days, in local time (no UTC drift). */
function isoDaysBefore(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Slug used as a DM thread id, derived from a person's name. */
export const chatId = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type Persisted = {
  favorites: string[]; // "video:v1" / "lesson:w2"
  joined: string[]; // community ids
  userPosts: Post[]; // posts the user created
  reactions: Record<string, string>; // postId -> reaction key
  comments: Record<string, Comment[]>; // postId -> added comments
  commentReactions: Record<string, string>; // commentId -> reaction key
  replies: Record<string, Comment[]>; // parent commentId -> replies
  hidden: string[]; // hidden/reported post ids
  dms: Record<string, { name: string; avatar: string; messages: DmMessage[] }>; // chatId -> thread
  checkins: CheckinEntry[]; // saved daily check-in answers (newest first)
  wheel: Record<string, number>; // wheel area id -> current score
  bookings: Meeting[]; // meetings booked via the booking flow
  bookedIds: string[]; // ids of existing meetings the user reserved
  readNotifications: string[]; // notification ids marked read
  completedLessons: string[]; // lesson ids marked complete locally (until auth)
  watchedVideos: string[]; // video ids the user has finished (≥95%) — checklist tick
  watchedLessonVideos: string[]; // lesson ids whose MAIN video was watched to the end
  videoProgress: Record<string, number>; // video id -> furthest percent already scored
  xp: number; // total streak-multiplied XP across all activities (videos, lessons, community, …)
  streakBadges: Record<string, number>; // milestone days (as string) -> times reached
  streakCreditedDays: number; // highest milestone length credited for the current run
  streakRunStart: string | null; // YYYY-MM-DD start of the run credited_days applies to
  streakBonusPoints: number; // running total of one-time streak-milestone bonuses
  communityXpDay: { date: string; count: number }; // per-day community XP awards (anti-farm cap)
  pwaBannerDismissed: boolean; // hide the "Install app" home banner once dismissed
};

const EMPTY: Persisted = {
  favorites: [],
  joined: [],
  userPosts: [],
  reactions: {},
  comments: {},
  commentReactions: {},
  replies: {},
  hidden: [],
  dms: {},
  checkins: [],
  wheel: {},
  bookings: [],
  bookedIds: [],
  readNotifications: [],
  completedLessons: [],
  watchedVideos: [],
  watchedLessonVideos: [],
  videoProgress: {},
  xp: 0,
  streakBadges: {},
  streakCreditedDays: 0,
  streakRunStart: null,
  streakBonusPoints: 0,
  communityXpDay: { date: '', count: 0 },
  pwaBannerDismissed: false,
};

type StoreValue = {
  ready: boolean;
  // favorites
  isFav: (k: FavKind, id: string) => boolean;
  toggleFav: (k: FavKind, id: string) => void;
  favoriteIds: (k: FavKind) => string[];
  /** Replace favorites with the server-computed effective set (on auth). */
  hydrateFavorites: (keys: string[]) => void;
  // communities
  isJoined: (id: string) => boolean;
  toggleJoined: (id: string) => void;
  joinedCount: number;
  // posts (user posts + seed posts, with merged comments)
  allPosts: Post[];
  addPost: (input: {
    community: string;
    text: string;
    image?: string;
    author: { name: string; avatar: string };
  }) => string;
  // reactions
  reactionFor: (postId: string) => string | null;
  setReaction: (postId: string, key: string | null) => void;
  // comments
  addComment: (postId: string, c: Comment) => void;
  // comment reactions + threaded replies
  commentReactionFor: (commentId: string) => string | null;
  setCommentReaction: (commentId: string, key: string | null) => void;
  repliesFor: (commentId: string) => Comment[];
  addReply: (parentCommentId: string, c: Comment) => void;
  // moderation
  isHidden: (postId: string) => boolean;
  hidePost: (postId: string) => void;
  deletePost: (postId: string) => void;
  // direct messages
  chatFor: (id: string) => DmThread | null;
  chatThreads: () => DmThread[];
  sendDm: (id: string, name: string, avatar: string, text: string) => void;
  // daily check-ins
  checkins: CheckinEntry[];
  addCheckin: (e: CheckinEntry) => void;
  /** Merge server check-ins in (cross-device); local entries win for a shared date. */
  mergeRemoteCheckins: (remote: CheckinEntry[]) => void;
  // wheel of life
  wheelScores: Record<string, number>;
  saveWheel: (scores: Record<string, number>) => void;
  // meetings
  bookings: Meeting[];
  addBooking: (m: Meeting) => void;
  isBooked: (id: string) => boolean;
  bookMeeting: (id: string) => void;
  // notifications
  isNotifRead: (id: string) => boolean;
  markNotifRead: (id: string) => void;
  markAllNotifsRead: (ids: string[]) => void;
  // lesson progress (local until auth)
  isLessonComplete: (id: string) => boolean;
  /** Whether the lesson's main video has been watched to the end (gates the
   *  lesson's Complete button together with the exercises). */
  isLessonVideoWatched: (id: string) => boolean;
  markLessonVideoWatched: (id: string) => void;
  /** Mark a lesson complete and award XP (streak/bonus-scaled). Returns the XP
   *  earned, or 0 if it was already complete (so the UI can skip the reward). */
  markLessonComplete: (id: string) => number;
  completedLessonIds: string[];
  // XP — every activity except check-ins earns XP, scaled by the streak multiplier
  /** Total streak-multiplied XP across all activities. */
  xp: number;
  /** Award `base` XP × the current streak & bonus-day multiplier; returns earned. */
  awardXp: (base: number) => number;
  /** Award a flat, one-time bonus (no streak multiplier, no daily cap) — for
   *  activation rewards like the onboarding "introduce yourself" bonus. Returns
   *  the points added. */
  awardBonus: (points: number) => number;
  /** Award community XP for a post/reply, capped per day to deter farming; returns earned. */
  awardCommunityXp: (kind: 'community_post' | 'community_reply') => number;
  // video watches (local until auth)
  isVideoWatched: (id: string) => boolean;
  markVideoWatched: (id: string) => void;
  /** Merge server-recorded video watches in (cross-device). Called once on auth. */
  hydrateWatched: (ids: string[]) => void;
  /** Merge server-recorded lesson completions in (cross-device). Called on auth. */
  hydrateCompletedLessons: (ids: string[]) => void;
  /** Award points for advancing a video's furthest-watched to `percent`, scaled
   *  by the current check-in streak. Returns the points earned this step (0 if no
   *  new tier crossed). Idempotent on re-watch. */
  awardVideoProgress: (videoId: string, percent: number) => number;
  // streak milestones + badges
  /** Milestone length (as string, e.g. "7") → how many times it's been reached. */
  streakBadges: Record<string, number>;
  /** Running total of one-time streak-milestone bonuses earned. */
  streakBonusPoints: number;
  /** Credit any streak milestones newly reached today (call after a check-in).
   *  Awards their bonus, bumps the badge counts, and returns what was earned so
   *  the UI can celebrate. Idempotent per day; resets on a broken streak. */
  creditStreak: () => { milestones: StreakMilestone[]; bonus: number };
  /** The full app-side gamification state, for syncing to the durable backend. */
  gameState: GameState;
  /** Merge server-stored gamification state in (MAX-merge; totals never drop).
   *  Called once on auth to hydrate points/badges cross-device. */
  hydrateGameState: (g: GameState) => void;
  // PWA install banner (home)
  pwaBannerDismissed: boolean;
  dismissPwaBanner: () => void;
  // account
  clearAll: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          try {
            setState({ ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) });
          } catch {
            /* ignore corrupt state */
          }
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  const update = useCallback((fn: (s: Persisted) => Persisted) => setState(fn), []);

  const value = useMemo<StoreValue>(() => {
    const allPosts: Post[] = [...state.userPosts, ...basePosts]
      .filter((p) => !state.hidden.includes(p.id))
      .map((p) => ({
        ...p,
        comments: [...p.comments, ...(state.comments[p.id] ?? [])],
      }));

    return {
      ready,
      isFav: (k, id) => state.favorites.includes(favKey(k, id)),
      toggleFav: (k, id) => {
        const key = favKey(k, id);
        const willBeOn = !state.favorites.includes(key);
        update((s) => ({
          ...s,
          favorites: willBeOn ? [...s.favorites, key] : s.favorites.filter((x) => x !== key),
        }));
        // Persist to the backend (app-owned mobile_favorites); best-effort.
        api.favorites.set(k, id, willBeOn).catch(() => {});
      },
      favoriteIds: (k) =>
        state.favorites.filter((x) => x.startsWith(`${k}:`)).map((x) => x.slice(k.length + 1)),
      // Replace the favorite set with the server-computed effective favorites
      // (production favorites, overridden by app-owned rows). Called once on auth.
      hydrateFavorites: (keys) =>
        update((s) => {
          const next = [...new Set(keys)];
          if (next.length === s.favorites.length && next.every((k) => s.favorites.includes(k))) return s;
          return { ...s, favorites: next };
        }),

      isJoined: (id) => state.joined.includes(id),
      toggleJoined: (id) =>
        update((s) => ({
          ...s,
          joined: s.joined.includes(id) ? s.joined.filter((x) => x !== id) : [...s.joined, id],
        })),
      joinedCount: state.joined.length,

      allPosts,
      addPost: ({ community, text, image, author }) => {
        const id = `u${Date.now()}`;
        const np: Post = {
          id,
          author: author.name,
          avatar: author.avatar,
          time: 'now',
          community,
          text,
          image,
          likes: 0,
          comments: [],
        };
        update((s) => ({ ...s, userPosts: [np, ...s.userPosts] }));
        return id;
      },

      reactionFor: (postId) => state.reactions[postId] ?? null,
      setReaction: (postId, key) =>
        update((s) => {
          const reactions = { ...s.reactions };
          if (key) reactions[postId] = key;
          else delete reactions[postId];
          return { ...s, reactions };
        }),

      addComment: (postId, c) =>
        update((s) => ({
          ...s,
          comments: { ...s.comments, [postId]: [...(s.comments[postId] ?? []), c] },
        })),

      commentReactionFor: (commentId) => state.commentReactions[commentId] ?? null,
      setCommentReaction: (commentId, key) =>
        update((s) => {
          const commentReactions = { ...s.commentReactions };
          if (key) commentReactions[commentId] = key;
          else delete commentReactions[commentId];
          return { ...s, commentReactions };
        }),
      repliesFor: (commentId) => state.replies[commentId] ?? [],
      addReply: (parentCommentId, c) =>
        update((s) => ({
          ...s,
          replies: { ...s.replies, [parentCommentId]: [...(s.replies[parentCommentId] ?? []), c] },
        })),

      isHidden: (postId) => state.hidden.includes(postId),
      hidePost: (postId) =>
        update((s) => (s.hidden.includes(postId) ? s : { ...s, hidden: [...s.hidden, postId] })),
      deletePost: (postId) =>
        update((s) => ({ ...s, userPosts: s.userPosts.filter((p) => p.id !== postId) })),

      chatFor: (id) => {
        const t = state.dms[id];
        return t ? { id, ...t } : null;
      },
      chatThreads: () => Object.entries(state.dms).map(([id, t]) => ({ id, ...t })),
      sendDm: (id, name, avatar, text) =>
        update((s) => {
          const prev = s.dms[id] ?? { name, avatar, messages: [] };
          const msg: DmMessage = { id: `m${Date.now()}`, from: 'me', text, time: 'now' };
          return {
            ...s,
            dms: { ...s.dms, [id]: { name, avatar, messages: [...prev.messages, msg] } },
          };
        }),

      checkins: state.checkins,
      addCheckin: (e) =>
        update((s) => ({ ...s, checkins: [e, ...s.checkins.filter((c) => c.date !== e.date)] })),
      mergeRemoteCheckins: (remote) =>
        update((s) => {
          const byDate = new Map<string, CheckinEntry>();
          remote.forEach((e) => byDate.set(e.date, e));
          s.checkins.forEach((e) => byDate.set(e.date, e)); // local wins for a shared date
          const merged = [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
          // Avoid a needless state churn if nothing changed.
          if (merged.length === s.checkins.length && merged.every((m, i) => m.date === s.checkins[i]?.date)) return s;
          return { ...s, checkins: merged };
        }),

      wheelScores: state.wheel,
      saveWheel: (scores) => update((s) => ({ ...s, wheel: { ...s.wheel, ...scores } })),

      bookings: state.bookings,
      addBooking: (m) => update((s) => ({ ...s, bookings: [m, ...s.bookings] })),
      isBooked: (id) => state.bookedIds.includes(id),
      bookMeeting: (id) =>
        update((s) => (s.bookedIds.includes(id) ? s : { ...s, bookedIds: [...s.bookedIds, id] })),

      isNotifRead: (id) => state.readNotifications.includes(id),
      markNotifRead: (id) =>
        update((s) =>
          s.readNotifications.includes(id)
            ? s
            : { ...s, readNotifications: [...s.readNotifications, id] },
        ),
      markAllNotifsRead: (ids) =>
        update((s) => ({
          ...s,
          readNotifications: Array.from(new Set([...s.readNotifications, ...ids])),
        })),

      isLessonComplete: (id) => state.completedLessons.includes(id),
      markLessonComplete: (id) => {
        // Already done → no re-award (returns 0 so the UI can skip the XP celebration).
        if (state.completedLessons.includes(id)) return 0;
        // Finishing a lesson earns XP (streak- and bonus-scaled).
        const earned = xpEarned(
          XP_BASE.lesson_complete,
          computeStreak(state.checkins.map((c) => c.date)),
          activeBonusMultiplier(),
        );
        update((s) =>
          s.completedLessons.includes(id)
            ? s
            : { ...s, completedLessons: [...s.completedLessons, id], xp: s.xp + earned },
        );
        return earned;
      },
      completedLessonIds: state.completedLessons,

      isLessonVideoWatched: (id) => state.watchedLessonVideos.includes(id),
      markLessonVideoWatched: (id) =>
        update((s) =>
          s.watchedLessonVideos.includes(id)
            ? s
            : { ...s, watchedLessonVideos: [...s.watchedLessonVideos, id] },
        ),
      isVideoWatched: (id) => state.watchedVideos.includes(id),
      markVideoWatched: (id) =>
        update((s) =>
          s.watchedVideos.includes(id) ? s : { ...s, watchedVideos: [...s.watchedVideos, id] },
        ),
      hydrateWatched: (ids) =>
        update((s) => {
          const next = [...new Set([...s.watchedVideos, ...ids])];
          if (next.length === s.watchedVideos.length) return s;
          return { ...s, watchedVideos: next };
        }),
      hydrateCompletedLessons: (ids) =>
        update((s) => {
          const next = [...new Set([...s.completedLessons, ...ids])];
          if (next.length === s.completedLessons.length) return s;
          return { ...s, completedLessons: next };
        }),
      xp: state.xp,
      awardXp: (base) => {
        const streak = computeStreak(state.checkins.map((c) => c.date));
        const earned = xpEarned(base, streak, activeBonusMultiplier());
        if (earned > 0) update((s) => ({ ...s, xp: s.xp + earned }));
        return earned;
      },
      awardBonus: (points) => {
        const p = Math.max(0, Math.round(points));
        if (p > 0) update((s) => ({ ...s, xp: s.xp + p }));
        return p;
      },
      awardCommunityXp: (kind) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const CAP = 5; // max community XP awards counted per day (anti-farm)
        const day = state.communityXpDay.date === todayStr ? state.communityXpDay : { date: todayStr, count: 0 };
        if (day.count >= CAP) return 0;
        const streak = computeStreak(state.checkins.map((c) => c.date));
        const earned = xpEarned(XP_BASE[kind], streak, activeBonusMultiplier());
        update((s) => ({
          ...s,
          xp: s.xp + earned,
          communityXpDay: { date: todayStr, count: day.count + 1 },
        }));
        return earned;
      },
      awardVideoProgress: (videoId, percent) => {
        const prev = state.videoProgress[videoId] ?? 0;
        const pct = Math.max(0, Math.min(100, Math.round(percent)));
        if (pct <= prev) return 0;
        const streak = computeStreak(state.checkins.map((c) => c.date));
        const earned = videoPointsEarned(prev, pct, streak, activeBonusMultiplier());
        update((s) => ({
          ...s,
          videoProgress: { ...s.videoProgress, [videoId]: Math.max(s.videoProgress[videoId] ?? 0, pct) },
          xp: s.xp + earned,
        }));
        return earned;
      },

      streakBadges: state.streakBadges,
      streakBonusPoints: state.streakBonusPoints,
      creditStreak: () => {
        // Streak from the real history (today may not be in the snapshot yet if
        // the check-in that triggered this only just saved — prepend it).
        const today = new Date().toISOString().slice(0, 10);
        const streak = computeStreak([today, ...state.checkins.map((c) => c.date)]);
        // Identify the run by its start date so crediting is idempotent across
        // devices: a milestone is credited once per run. A different start = a new
        // run after a break, so crediting begins from scratch.
        const runStart = streak > 0 ? isoDaysBefore(today, streak - 1) : null;
        const sameRun = runStart !== null && runStart === state.streakRunStart;
        const credited = sameRun ? state.streakCreditedDays : 0;
        const milestones = milestonesReached(streak, credited);
        const bonus = milestones.reduce((sum, m) => sum + m.bonus, 0);
        const newCredited = milestones.length ? milestones[milestones.length - 1].days : credited;
        update((s) => {
          const badges = { ...s.streakBadges };
          milestones.forEach((m) => {
            badges[String(m.days)] = (badges[String(m.days)] ?? 0) + 1;
          });
          return {
            ...s,
            streakBadges: badges,
            streakBonusPoints: s.streakBonusPoints + bonus,
            streakCreditedDays: newCredited,
            streakRunStart: runStart,
          };
        });
        return { milestones, bonus };
      },

      gameState: {
        // wire/DB field `videoPoints` (mobile_game_state.video_points) now carries
        // the unified activity XP total.
        videoPoints: state.xp,
        streakBonusPoints: state.streakBonusPoints,
        streakCreditedDays: state.streakCreditedDays,
        streakRunStart: state.streakRunStart,
        streakBadges: state.streakBadges,
      },
      hydrateGameState: (g) =>
        update((s) => {
          const badges = { ...s.streakBadges };
          for (const [k, v] of Object.entries(g.streakBadges ?? {})) {
            badges[k] = Math.max(badges[k] ?? 0, v);
          }
          const serverRunNewer =
            !!g.streakRunStart && (!s.streakRunStart || g.streakRunStart > s.streakRunStart);
          return {
            ...s,
            xp: Math.max(s.xp, g.videoPoints),
            streakBonusPoints: Math.max(s.streakBonusPoints, g.streakBonusPoints),
            streakCreditedDays: serverRunNewer
              ? g.streakCreditedDays
              : Math.max(s.streakCreditedDays, g.streakCreditedDays),
            streakRunStart:
              (s.streakRunStart ?? '') > (g.streakRunStart ?? '') ? s.streakRunStart : g.streakRunStart ?? s.streakRunStart,
            streakBadges: badges,
          };
        }),

      pwaBannerDismissed: state.pwaBannerDismissed,
      dismissPwaBanner: () => update((s) => (s.pwaBannerDismissed ? s : { ...s, pwaBannerDismissed: true })),

      clearAll: () => setState(EMPTY),
    };
  }, [state, ready, update]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within AppStoreProvider');
  return ctx;
}

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

import { posts as basePosts, user, type Comment, type Meeting, type Post } from '@/data/content';

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
  watchedVideos: string[]; // video ids the user has opened/played (until auth)
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
};

type StoreValue = {
  ready: boolean;
  // favorites
  isFav: (k: FavKind, id: string) => boolean;
  toggleFav: (k: FavKind, id: string) => void;
  favoriteIds: (k: FavKind) => string[];
  // communities
  isJoined: (id: string) => boolean;
  toggleJoined: (id: string) => void;
  joinedCount: number;
  // posts (user posts + seed posts, with merged comments)
  allPosts: Post[];
  addPost: (input: { community: string; text: string; image?: string }) => string;
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
  hidePost: (postId: string) => void;
  deletePost: (postId: string) => void;
  // direct messages
  chatFor: (id: string) => DmThread | null;
  chatThreads: () => DmThread[];
  sendDm: (id: string, name: string, avatar: string, text: string) => void;
  // daily check-ins
  checkins: CheckinEntry[];
  addCheckin: (e: CheckinEntry) => void;
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
  markLessonComplete: (id: string) => void;
  completedLessonIds: string[];
  // video watches (local until auth)
  isVideoWatched: (id: string) => boolean;
  markVideoWatched: (id: string) => void;
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
      toggleFav: (k, id) =>
        update((s) => {
          const key = favKey(k, id);
          return {
            ...s,
            favorites: s.favorites.includes(key)
              ? s.favorites.filter((x) => x !== key)
              : [...s.favorites, key],
          };
        }),
      favoriteIds: (k) =>
        state.favorites.filter((x) => x.startsWith(`${k}:`)).map((x) => x.slice(k.length + 1)),

      isJoined: (id) => state.joined.includes(id),
      toggleJoined: (id) =>
        update((s) => ({
          ...s,
          joined: s.joined.includes(id) ? s.joined.filter((x) => x !== id) : [...s.joined, id],
        })),
      joinedCount: state.joined.length,

      allPosts,
      addPost: ({ community, text, image }) => {
        const id = `u${Date.now()}`;
        const np: Post = {
          id,
          author: user.name,
          avatar: user.avatar,
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
      markLessonComplete: (id) =>
        update((s) =>
          s.completedLessons.includes(id) ? s : { ...s, completedLessons: [...s.completedLessons, id] },
        ),
      completedLessonIds: state.completedLessons,

      isVideoWatched: (id) => state.watchedVideos.includes(id),
      markVideoWatched: (id) =>
        update((s) =>
          s.watchedVideos.includes(id) ? s : { ...s, watchedVideos: [...s.watchedVideos, id] },
        ),

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

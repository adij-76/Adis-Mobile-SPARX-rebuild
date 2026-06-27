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

import { posts as basePosts, user, type Comment, type Post } from '@/data/content';

const KEY = 'igntd.store.v1';

export type FavKind = 'video' | 'lesson';
const favKey = (k: FavKind, id: string) => `${k}:${id}`;

type Persisted = {
  favorites: string[]; // "video:v1" / "lesson:w2"
  joined: string[]; // community ids
  userPosts: Post[]; // posts the user created
  reactions: Record<string, string>; // postId -> reaction key
  comments: Record<string, Comment[]>; // postId -> added comments
};

const EMPTY: Persisted = { favorites: [], joined: [], userPosts: [], reactions: {}, comments: {} };

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
    const allPosts: Post[] = [...state.userPosts, ...basePosts].map((p) => ({
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

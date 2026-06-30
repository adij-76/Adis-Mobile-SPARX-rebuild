/**
 * Auth context: holds the signed-in user + session, persists it across reloads,
 * and points the Supabase data layer at the user's JWT so RLS scopes every
 * request to their real data. Screens read `useAuth()`; the api seam
 * (`api.auth.*`) does the actual sign-in, so swapping auth backends never
 * touches a screen.
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
import { Platform } from 'react-native';

import { api, setSupabaseToken, type AuthSession, type AuthUser } from '@/api';
import type { OAuthProvider } from '@/api/types';

const KEY = 'sparx.auth.v1';

type Status = 'loading' | 'authed' | 'guest';

type AuthValue = {
  status: Status;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: OAuthProvider) => void;
  signOut: () => Promise<void>;
  updateAvatar: (dataUrl: string) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function persist(session: AuthSession | null) {
  if (session) await AsyncStorage.setItem(KEY, JSON.stringify(session));
  else await AsyncStorage.removeItem(KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);

  /** Apply a session: point the data layer at its token, enrich the user with
   *  their production id + all personalisation fields, persist, flip to authed. */
  const apply = useCallback(async (s: AuthSession) => {
    setSupabaseToken(s.accessToken);
    const me = await api.auth.me(s.user.email).catch(() => null);
    const user: AuthUser = me
      ? {
          ...s.user,
          appUserId: me.appUserId,
          // GoTrue user_metadata has precedence for name/avatar (most recently
          // updated by the user); fall back to what the production DB row has.
          name: s.user.name ?? me.name,
          avatarUrl: s.user.avatarUrl ?? me.avatar,
          programId: me.programId,
          subscribed: me.subscribed,
          stripeActive: me.stripeActive,
          advancedCoaching: me.advancedCoaching,
          addictionLabel: me.addictionLabel,
          daysCount: me.daysCount,
          daysUpdatedAt: me.daysUpdatedAt,
          userHandle: me.userHandle,
          timeZone: me.timeZone,
          teamId: me.teamId,
          zoomEmail: me.zoomEmail,
        }
      : s.user;
    const enriched: AuthSession = { ...s, user };
    await persist(enriched);
    setSession(enriched);
    setStatus('authed');
  }, []);

  // On launch: first complete any OAuth redirect (tokens in the URL hash on web),
  // otherwise restore a persisted session.
  useEffect(() => {
    let active = true;
    (async () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const at = params.get('access_token');
        const rt = params.get('refresh_token') ?? '';
        // Strip the hash so a reload doesn't re-process it.
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        if (at) {
          try {
            const s = await api.auth.sessionFromTokens(at, rt);
            if (active) await apply(s);
            return;
          } catch {
            /* fall through to restore */
          }
        }
      }
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) {
          if (active) setStatus('guest');
          return;
        }
        const saved = JSON.parse(raw) as AuthSession;
        setSupabaseToken(saved.accessToken);
        if (active) {
          setSession(saved);
          setStatus('authed');
        }
      } catch {
        if (active) setStatus('guest');
      }
    })();
    return () => {
      active = false;
    };
  }, [apply]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await apply(await api.auth.signIn(email.trim(), password));
    },
    [apply],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      await apply(await api.auth.signUp(email.trim(), password));
    },
    [apply],
  );

  const signInWithProvider = useCallback((provider: OAuthProvider) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      throw new Error('Social sign-in is available on the web app.');
    }
    const redirectTo = window.location.origin + window.location.pathname;
    const url = api.auth.oauthUrl(provider, redirectTo);
    if (!url) throw new Error('Social sign-in needs Supabase + this provider enabled.');
    // Open in a new tab so a misconfigured provider error doesn't strand the
    // user on a raw JSON page. The redirect brings the user back to this origin
    // with tokens in the hash, which the _layout startup handler processes.
    window.open(url, '_self');
  }, []);

  const updateAvatar = useCallback(
    async (dataUrl: string) => {
      if (!session) return;
      const url = await api.auth.updateAvatar(dataUrl, session.user.id);
      const next: AuthSession = { ...session, user: { ...session.user, avatarUrl: url } };
      await persist(next);
      setSession(next);
    },
    [session],
  );

  const signOut = useCallback(async () => {
    await api.auth.signOut(session?.accessToken ?? null).catch(() => {});
    setSupabaseToken(null);
    await persist(null);
    setSession(null);
    setStatus('guest');
  }, [session]);

  const value = useMemo<AuthValue>(
    () => ({ status, user: session?.user ?? null, signIn, signUp, signInWithProvider, signOut, updateAvatar }),
    [status, session, signIn, signUp, signInWithProvider, signOut, updateAvatar],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

/** The signed-in user's first name (or a friendly fallback) for greetings. */
export function useFirstName(): string {
  const { user } = useAuth();
  return (user?.name?.trim() || user?.email?.split('@')[0] || 'there').split(' ')[0];
}

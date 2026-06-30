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

import { api, setSupabaseToken, type AuthSession, type AuthUser } from '@/api';

const KEY = 'sparx.auth.v1';

type Status = 'loading' | 'authed' | 'guest';

type AuthValue = {
  status: Status;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
   *  their production id, persist, and flip to authed. */
  const apply = useCallback(async (s: AuthSession) => {
    setSupabaseToken(s.accessToken);
    const me = await api.auth.me(s.user.email).catch(() => null);
    const user: AuthUser = me ? { ...s.user, appUserId: me.appUserId, name: s.user.name ?? me.name } : s.user;
    const enriched: AuthSession = { ...s, user };
    await persist(enriched);
    setSession(enriched);
    setStatus('authed');
  }, []);

  // Restore a persisted session on launch.
  useEffect(() => {
    let active = true;
    (async () => {
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
  }, []);

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

  const signOut = useCallback(async () => {
    await api.auth.signOut(session?.accessToken ?? null).catch(() => {});
    setSupabaseToken(null);
    await persist(null);
    setSession(null);
    setStatus('guest');
  }, [session]);

  const value = useMemo<AuthValue>(
    () => ({ status, user: session?.user ?? null, signIn, signUp, signOut }),
    [status, session, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

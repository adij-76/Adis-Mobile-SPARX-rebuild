/**
 * Online presence via Supabase Realtime.
 *
 * A single presence channel ("online-users") tracks who currently has the app
 * open. Signed-in users `track({ userId })` on load; `useOnline(userId)` reads
 * the synced presence state and returns a REAL "online now" signal — never a
 * fabricated one.
 *
 * Fails safe: everything is wrapped so a socket/init failure just means everyone
 * reads offline (no dot), never a crash or a stale/fake status. Presence is
 * keyed by the production users.id (app_user_id) — the same id space post
 * authors carry — so `useOnline(post.authorId)` matches. A user with no
 * production id yet simply isn't broadcast (they read as offline to others).
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const PresenceContext = createContext<Set<string>>(new Set());

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const myId = user?.appUserId ?? null;
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Web-only for now (native WS lifecycle differs); needs config + a signed-in
    // user with a production id to key on.
    if (typeof window === 'undefined') return;
    if (!SUPABASE_URL || !ANON || !myId) return;

    let cancelled = false;
    let channel: { unsubscribe: () => void } | null = null;
    let client: { disconnect: () => void } | null = null;

    (async () => {
      try {
        // Imported lazily so a bundling/runtime issue can't take down app start.
        const { RealtimeClient } = await import('@supabase/realtime-js');
        if (cancelled) return;
        const rt = new RealtimeClient(`${SUPABASE_URL.replace(/^http/, 'ws')}/realtime/v1`, {
          params: { apikey: ANON },
        });
        // Authenticate the socket as this user when we have a token (anon otherwise).
        if (accessToken) {
          try {
            (rt as unknown as { setAuth: (t: string) => void }).setAuth(accessToken);
          } catch {
            /* older/newer API — ignore */
          }
        }
        client = rt as unknown as { disconnect: () => void };

        const ch = rt.channel('online-users', { config: { presence: { key: String(myId) } } });
        const sync = () => {
          if (cancelled) return;
          try {
            const state = ch.presenceState();
            setOnline(new Set(Object.keys(state)));
          } catch {
            /* ignore */
          }
        };
        ch.on('presence', { event: 'sync' }, sync);
        ch.on('presence', { event: 'join' }, sync);
        ch.on('presence', { event: 'leave' }, sync);
        ch.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') ch.track({ at: Date.now() }).catch(() => {});
        });
        channel = ch as unknown as { unsubscribe: () => void };
      } catch {
        // Realtime unavailable → everyone reads offline. No dot, no crash.
      }
    })();

    return () => {
      cancelled = true;
      try {
        channel?.unsubscribe();
      } catch {
        /* ignore */
      }
      try {
        client?.disconnect();
      } catch {
        /* ignore */
      }
    };
  }, [myId, accessToken]);

  return <PresenceContext.Provider value={online}>{children}</PresenceContext.Provider>;
}

/** True when the member with this production users.id currently has the app open. */
export function useOnline(userId: string | null): boolean {
  const online = useContext(PresenceContext);
  return !!userId && online.has(String(userId));
}

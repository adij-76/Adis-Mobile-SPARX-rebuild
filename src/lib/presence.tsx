/**
 * Online presence.
 *
 * `useOnline(userId)` reports whether a member currently has the app open. It is
 * deliberately a NO-OP stub for now (always false) so the UI never shows a FAKE
 * "online" dot — the quick-profile card simply omits the indicator until real
 * presence is wired.
 *
 * The real implementation (next PR) opens a Supabase Realtime presence channel:
 * signed-in users `track({ userId })` on app load, and this hook reads the
 * channel's synced presence state. It fails safe — if the socket can't connect,
 * everyone reads offline rather than showing stale/fake status.
 */
export function useOnline(_userId: string | null): boolean {
  return false;
}

import { useEffect, useState } from 'react';

type AsyncState<T> = { data: T | null; loading: boolean; error: Error | null };

/**
 * Runs an async function and tracks loading/error/data. Re-runs when `deps`
 * change or `reload()` is called. Ignores results after unmount/dep-change so
 * stale responses never overwrite fresh state.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => active && setState({ data, loading: false, error: null }),
      (e) =>
        active &&
        setState({ data: null, loading: false, error: e instanceof Error ? e : new Error(String(e)) }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}

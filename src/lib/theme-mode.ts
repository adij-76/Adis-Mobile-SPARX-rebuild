/**
 * Light / dark / system theme control (web).
 *
 * The palette itself is driven by CSS variables (theme.ts + +html.tsx); this just
 * decides which set is active by toggling `data-theme` on <html>:
 *   - 'light' / 'dark' → force that theme (persisted, and pre-applied in +html.tsx
 *     before React mounts so there's no flash).
 *   - 'system' → no attribute, so the `prefers-color-scheme` media query wins.
 *
 * No-ops on native (there are no CSS vars there — the app renders light).
 */
export type ThemeMode = 'light' | 'dark' | 'system';

const KEY = 'igntd.theme';

export function getThemeMode(): ThemeMode {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'system') {
      localStorage.removeItem(KEY);
      root.removeAttribute('data-theme');
    } else {
      localStorage.setItem(KEY, mode);
      root.setAttribute('data-theme', mode);
    }
  } catch {
    /* ignore (SSR / native / storage disabled) */
  }
}

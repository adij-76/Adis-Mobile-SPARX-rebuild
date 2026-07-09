import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import { THEME_DARK, THEME_LIGHT } from '@/constants/theme';

/**
 * Custom HTML shell for the web export (static). Adds a Content-Security-Policy
 * (S-H2): the app can't set response headers on GitHub Pages, so the policy
 * ships as a <meta> tag. It's deliberately compatible with what the app needs —
 * inline styles (React Native Web injects them), https connections (Supabase +
 * the Sparky webhook), and the Vimeo player iframe — while blocking the vectors
 * that matter for a health app: no <object>/<embed>, no injected <base>, forms
 * only to same-origin, images/fonts constrained. `object-src 'none'` +
 * `base-uri 'self'` + `form-action 'self'` are the high-value additions.
 *
 * NOTE: tightening `script-src` to drop 'unsafe-inline'/'unsafe-eval' needs a
 * live check against the deployed bundle (Expo/Hermes bootstrap) before it can
 * be shipped safely.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src https://player.vimeo.com https://*.vimeo.com",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// GitHub Pages serves the app under a sub-path (/Adis-Mobile-SPARX-rebuild), so
// the manifest/icon links must carry that prefix; empty in local dev. Read at
// export time (this shell renders in Node during the static export).
const BASE = (process.env.EXPO_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');

// Dark-mode CSS variables. The themeable neutral tokens (theme.ts) resolve to
// these `--c-*` vars on web, so flipping `data-theme` on <html> re-themes the
// whole app. Default = light; follow the OS when no explicit choice is stored;
// `data-theme="light|dark"` (set by the Theme setting) forces one.
const vars = (map: Record<string, string>) =>
  Object.entries(map)
    .map(([k, v]) => `--c-${k}:${v};`)
    .join('');
const THEME_CSS = `
:root{color-scheme:light;${vars(THEME_LIGHT)}}
:root[data-theme="dark"]{color-scheme:dark;${vars(THEME_DARK)}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;${vars(THEME_DARK)}}}
html,body,#root{background-color:var(--c-screen);}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />

        {/* Dark-mode CSS variables (see theme.ts). Inline so they apply before
            first paint — no flash. Allowed by the CSP's style-src 'unsafe-inline'. */}
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
        {/* Apply the saved theme choice before React mounts, to avoid a flash of
            the wrong theme on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=localStorage.getItem('igntd.theme');if(m==='dark'||m==='light')document.documentElement.setAttribute('data-theme',m);}catch(e){}",
          }}
        />

        {/* PWA: installable, standalone, themed status bar (F-H1). */}
        <link rel="manifest" href={`${BASE}/manifest.webmanifest`} />
        <meta name="theme-color" content="#0A3653" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SPARx" />
        <link rel="apple-touch-icon" href={`${BASE}/icon-512.png`} />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

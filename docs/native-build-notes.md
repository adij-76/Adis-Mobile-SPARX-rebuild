# Native build — outstanding requirements

Things the current **web** build fakes or skips that must be handled before/at
the time we ship real native (iOS/Android) builds.

## Video playback (Sparky + check-in recommendations)

The Vimeo player (`src/components/video-player-modal.tsx`) currently:

- **Web:** embeds the Vimeo player in an `<iframe>` — full inline playback. ✅
- **Native:** falls back to opening the video in the system browser / Vimeo app
  via `Linking.openURL`. There is **no inline playback on native yet.**

### To get inline video on native

1. **Add `react-native-webview`** (`npx expo install react-native-webview`).
2. In `video-player-modal.tsx`, replace the native fallback branch with a
   `<WebView source={{ uri: vimeoEmbedUrl(video.url) }} allowsFullscreenVideo />`.
   Keep the web branch on the `<iframe>` (WebView doesn't run on web).
   Easiest split: `vimeo-frame.web.tsx` (iframe) + `vimeo-frame.native.tsx`
   (WebView), imported as `./vimeo-frame`.
3. `react-native-webview` is a native module → it requires a **dev/EAS build**,
   not Expo Go, and won't affect the web export.

### Completion + percent-watched tracking on native ⚠️ REQUIRES the WebView

The app records **how much of a video was watched** (`mobile_video_watches.percent`,
furthest point reached, 0–100) and marks a video **complete** at ≥95% — this powers
the checklist tick and, at cutover, points/leaderboard from watch progress.

This only works when we can **observe the player**, which today we can only do on
**web** via the Vimeo `postMessage` API (`timeupdate.percent` + `ended`, wired in
`video-player-modal.tsx`). On native the current `Linking.openURL` fallback opens
an external browser we cannot observe, so native **cannot** report real progress —
it records a completion-on-open proxy only.

**To get real completion + percent on native**, after adding the WebView (steps
1–3 above), inject the same Vimeo bridge into it and post events back to RN:

```js
// injectedJavaScript in the WebView — forwards Vimeo player events to RN
const f = document.querySelector('iframe');
const post = (m) => f.contentWindow.postMessage(JSON.stringify(m), '*');
window.addEventListener('message', (e) => {
  const d = JSON.parse(e.data);
  if (d.event === 'ready') { post({method:'addEventListener',value:'ended'});
                             post({method:'addEventListener',value:'timeupdate'}); }
  window.ReactNativeWebView.postMessage(e.data); // → onMessage in RN
});
```

Then `onMessage` in RN mirrors the web handler: fire `onProgress(percent)` at the
25/50/75 milestones and `onEnded` at `ended`/≥0.95. Until this lands, native watch
percent is not real — treat native progress as unavailable and lean on web.

### Vimeo settings (applies to web too)

- Videos must **allow embedding on the app's domain**. For the web build that's
  `adij-76.github.io`; for native the embed has no web origin but private videos
  still need "embed anywhere"/whitelist settings enabled.
- Private/domain-restricted videos otherwise show "this video is restricted."
- Unlisted videos with a hash (`vimeo.com/ID/HASH`) are supported — the hash is
  preserved into the player URL by `vimeoEmbedUrl`.

## Other native-only items to revisit

- **Image capture / sharing** (quote cards) already lazy-loads
  `react-native-view-shot` / `expo-sharing` / `expo-media-library` on native —
  verify those once a native build exists.
- **AsyncStorage** (check-in streak) uses `localStorage` on web; native uses the
  real async store — no change needed, just retest persistence.
- **Push notifications**, deep links, and real auth (replace the hard-coded
  Sparky `userId`) are not wired yet.

# Code audit — post-cutover cleanup (2026-06-30)

A scan after the rapid Supabase cutover + desktop/rebrand work. Findings are
grouped by **what to do**, with file:line and risk. Nothing here is changed yet —
this is the menu we work from. Items marked **[quick/safe]** are low-risk and I
can knock out in one pass on your OK; **[decision]** needs your call.

---

## 1. Real bugs (worth fixing first)

1. **Wheel history returns the *oldest* 12 months, not the trailing year.**
   `src/api/supabase.ts` `wheelHistory()` uses `order: month_key.asc` + `limit: 12`,
   so PostgREST limits *after* sorting ascending → the first 12 months ever, not the
   last 12. Once a user has >12 months of history the Monthly/Annual view shows
   ancient data. Fix: `order: month_key.desc, limit: 12`, then reverse client-side.
   *(Not visible yet — needs >12 months of data — but it's a latent data bug.)* **[quick/safe]**

2. **Auto check-in timer isn't cleared on unmount.**
   `src/app/(tabs)/index.tsx` `setTimeout(() => router.push('/checkin'), 400)` has no
   cleanup; navigating away from Home within 400ms still pops the check-in over the new
   screen. Fix: clear the timeout in the effect cleanup. **[quick/safe]**

3. **Tapping *any* workshop card opens the same "Master your belief" workshop.**
   The `/workshop/*` flow always renders the singular mock `workshop`
   (`content.ts` `workshop`, id `master-belief`) regardless of which card was tapped
   (`workshop/intro|video|summary`). Pre-existing (noted in `remaining-work.md`), but
   worth fixing when we cut the workshop flow to real data. **[decision]** (part of cutover)

4. **`useAsync` stale-closure contract is fragile.**
   `src/hooks/use-async.ts` triggers only on `deps` (the `fn` closure is intentionally
   excluded). Safe today because every caller's `deps` covers what `fn` reads — but a
   future caller that closes over a value not in `deps` will silently use stale data.
   Fix: document the contract hard at the hook, and/or make `deps` a required arg. **[quick/safe]**

5. **Breakpoint crossing remounts the navigator.**
   `src/app/_layout.tsx` `Shell` returns a different root tree on each side of 1024px,
   so resizing phone↔desktop unmounts/remounts the whole `<Stack>` (loses nav/scroll
   state). Low real-world impact (rare mid-session resize). Fix: always render the row
   wrapper, only toggle the sidebar's presence. *(Corrects the comment that claims the
   navigator never remounts.)* **[quick/safe]**

---

## 2. Dead code — safe to delete [quick/safe]

All verified to have zero importers.

- `src/data/content.ts`: `dailyAssessment` + type `AssessmentQuestion`, `quoteBackgrounds`,
  and the unused **types** `LeaderboardEntry`, `ChecklistItem`, `Quote`, `Report`
  (the matching `const`s are still used — only the types are dead).
- `src/components/ui/radar-chart.tsx` — entire file orphaned (wheel screens use
  `wheel-chart.tsx`).
- `src/components/workshop-list.tsx` — the `ListHeaderComponent` prop is never passed
  (only `<WorkshopList />` with no props). Trim the prop. **[verify-first]**

**Confirmed NOT dead (don't remove):** the whole `/workshop/*` flow + `workshop-scaffold`
/`workshop-list`/`workshop-card`/`WORKSHOP_STEPS` (still linked from Home, Profile,
Favorites, Notifications); all mock data imported by `src/api/mock.ts`
(`recommendedVideos`, `workshops`, `wheelHistory`, …); `DEMO_VIDEO_URL`; the
`/videos/[id]` detail route (still reached from the home dashboard + favorites).

---

## 3. Duplication — consolidate (medium effort)

Ranked by payoff/risk:

1. **`<SourceBadge/>`** — the "● Live · Supabase / Sample data" dot+text is duplicated
   verbatim in `videos/index.tsx` and `(tabs)/lessons.tsx` (plus identical `sourceRow`/`dot`
   styles). Extract a zero-prop component. *High payoff, low risk.*
2. **`<AsyncBoundary>`** — the loading / error+retry / empty / list branch (with the
   `cloud-offline-outline` + "Couldn't load… {error.message}" + "Try again" triad and the
   identical `center` style) is repeated in `videos/index.tsx`, `module/[id].tsx`,
   `lesson/[id].tsx`, `(tabs)/lessons.tsx`. Extract a render-prop wrapper. *High payoff,
   medium risk (variants: lesson uses early-return + persistent header).*
3. **`<VideoThumb>`** — Vimeo-thumbnail + play-overlay (+ optional duration pill) is
   re-implemented in `SnippetCard` (videos), `LessonRow` (module), `VideoPoster` (lesson),
   and the home video cards. Extract one component with size/variant props; absorbs most
   of the duplicated `thumb`/`thumbImg`/`play`/`duration` styles. *High payoff, medium risk.*
4. **Vimeo helpers** (`src/lib/sparky.ts`): hash-extraction regex is triplicated
   (`vimeoEmbedUrl`, `vimeoWatchUrl`) → extract `vimeoHash(url)`; the oEmbed fetch is
   duplicated (`fetchVimeoMeta`, `validateVideos`) → extract a private `fetchOembed`.
   Consider moving all Vimeo helpers to `src/lib/vimeo.ts` (cohesion — they're unrelated
   to the Sparky chat backend). *Medium payoff, low risk.*
5. **Shared format utils**: `formatLength` + `hasRealDescription` live only in
   `videos/index.tsx`; `lessonTitle` exists in `module/[id].tsx` but is re-implemented
   inline in `lesson/[id].tsx` (real divergence). Move to a `lib/content-format.ts`.
   *Low risk; `lessonTitle` unification fixes an actual inconsistency.*

---

## 4. Consistency / polish

### 4a. Rebrand IGNTD → SPARx (user-facing strings) [quick/safe, but review the list]
~25 user-facing "IGNTD" strings remain. Notable: `profile.tsx` ("Get IGNTD Premium",
"IGNTD · v1.0.0", `okeijoseph@igntd.com`), `sparky.tsx` ("your IGNTD companion" x2),
`content.ts` ("IGNTD Hero Program" badge), `settings/premium|faqs|privacy|terms.tsx`,
`mydata/wheel.tsx` ("IGNTD Wheel of Life"/"IGNTD Life scores"), `pwa-install.tsx` (x3),
`quotes.tsx` (share text + the watermark on quote cards), `videos/[id].tsx`,
`meetings/book.tsx` ("IGNTD Coach"), `favorites.tsx` (`author: 'IGNTD'`).
Also `app.json` display `name` + the photos-permission string.
→ I can do a clean sweep of the text strings in one pass.

### 4b. Identifiers / keys [decision — don't bare-rename]
- `app.json` `slug`/`scheme`/`bundleIdentifier`/`package` still "igntd" — renaming is a
  breaking infra change (URLs, installs). Leave unless you want a hard rename.
- AsyncStorage keys `igntd.checkin.v1` / `igntd.store.v1` (`checkin.ts`, `store.tsx`):
  renaming drops users' existing local data. Leave, or add a one-time migration shim.
- `profile.tsx` hardcodes `'igntd.checkin.v1'` instead of importing the key constant —
  small coupling fix worth doing regardless.

### 4c. Hardcoded hex instead of `Colors.*` [quick/safe where a token exists]
Literals that duplicate existing tokens: `notifications.tsx` (5 colors = primary/orange/
danger/success/star), gradient pairs `['#FF9D4B','#166890']` = `[orange, primary]`
(`(tabs)/index.tsx`, `_layout.tsx`, `sparky.tsx`, `premium.tsx`, `quotes.tsx`), player
`#0A0D14` = `Colors.textMain`. Genuinely off-palette hues (wheel area colors, the 7
reaction colors in `reaction-bar.tsx`, leaderboard medals, some challenge/community
colors) → consider a named palette section in `theme.ts` rather than scattering literals.
Also: `mydata/wheel.tsx` shadow uses `#0A0D14` while `Shadow.card` uses `#1B1C1D`.

### 4d. Naming oddities
- **`Program` type collision**: `content.ts` `Program` (hero card: badge/title/progress)
  vs `api/types.ts` `Program` (id/name/active) — same name, different shapes, both
  imported in different screens. Rename the content one (e.g. `HeroProgramCard`).
- **`wheelCategories`/`wheelScore`** back-compat aliases of `wheelAreas` — two names for
  one export, used inconsistently across My Data screens. Consolidate on `wheelAreas`.
- **`Meeting.via`** stores a full sentence ("Video Meeting via Zoom call"), not a channel.
- **Mock `Snippet.description` is always `null`** (`mock.ts`) even though `recommendedVideos`
  carry real descriptions — so the description path is never exercised under the mock
  backend. Give mock snippets sample descriptions + one null-title case.

---

## 5. Remaining mock → API cutover surface

Screens still reading `src/data/content.ts` directly (not yet through `@/api`):
- **Home dashboard** (`(tabs)/index.tsx`): videos rail, hero program, workshops,
  challenges, upcoming meetings, checklist, daily quote, socials.
- **Community** (`community.tsx`, `feed/explore.tsx`, `feed/new.tsx`): `communities`.
- **Check-in** (`checkin.tsx`): recommended videos, emotion lists.
- **My Data** (`data.tsx`, `mydata/wheel|wheel-assessment|reports|leaderboard.tsx`,
  `settings/assessment-summary.tsx`): wheel areas, reports, leaderboard.
- **Meetings** (`meetings/index|[id]|book.tsx`): meetings, coach.
- **Workshop flow** (`workshop/*`, `favorites.tsx`): the singular `workshop` + steps.
- **Quotes** (`quotes.tsx`).

`ContentApi` already comments these as "future seams." Natural next backends to add:
`workshops` (real, fixes the single-workshop bug), `meetings`, `community`, `checkins`,
`quotes`.

---

## Suggested order of operations
1. **Quick safe wins** (one PR): dead-code deletions (§2), the two real quick bugs
   (wheel-history order, check-in timer cleanup), `SourceBadge` + format-utils extraction.
2. **IGNTD→SPARx text sweep** (§4a) — one PR, after you skim the list.
3. **Bigger refactors** (`AsyncBoundary`, `VideoThumb`, Vimeo helpers) — one focused PR.
4. **Theme token pass** (§4c) + naming fixes (§4d).
5. **Continue the cutover** (§5) — workshops next (fixes the single-workshop bug), then
   meetings/community.

Decisions needed from you: the AsyncStorage-key / app.json-identifier rename (§4b), and
whether to keep the old `/workshop/*` flow or fold it into the new `/lesson/*` flow.

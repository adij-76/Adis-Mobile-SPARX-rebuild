# SPARx Mobile — Comprehensive Improvement Audit

_Full read-only audit of the Expo SDK 56 / React Native Web PWA + Supabase backend
for the SPARx recovery/addiction-treatment app. Deployed to GitHub Pages from
`main` via `.github/workflows/deploy-web.yml`._

**Branch audited:** `claude/mobile-app-audit-report-j37rft` · HEAD `ae98e7c`
(48 commits ahead of `origin/main`; the *live* build predates check-in
persistence, wheel write-back, the use-tracking source switch, and community F1).

This report covers four dimensions — **security**, **data layer & DB contract**,
**code quality & architecture**, and **features / UX / PWA** — and closes with a
prioritized action plan. Every finding was verified in source; file:line
references are cited. Health-related PII is in scope throughout.

> **Verifiability note:** the live Supabase project is unreachable from this
> environment, so runtime facts (whether base tables actually answer PostgREST,
> whether email-confirmation is enabled) are inferred from the SQL/app source and
> the team's own docs. Findings that need a live check say so and give the command.

---

## 0. Executive summary

The app is further along and better engineered than its own older docs suggest:
the auth layer, the mock↔Supabase API seam, the DB view/compat-alias discipline,
and the daily contract audit are genuinely strong work. The gaps that matter now
cluster into five themes:

1. **A pre-launch data breach is latent in the backend.** Production tables were
   imported with **no row-level security** and are exposed through PostgREST with
   the public anon key — including `users.encrypted_password` (bcrypt hashes) and
   every user's substance-use / assessment records. This is called out as
   "deferred hardening" in the team's own docs; it must be closed before launch.
2. **Silent failure is the dominant runtime behavior.** Reads fall back to seed
   data on error; writes are fire-and-forget with empty catches; the app-wide
   `useAsync(...).data ?? []` pattern discards loading and error states. A backend
   outage looks identical to "no data" and users see plausible demo content.
3. **Community & several "features" are illusions.** Feed posts, comments, DMs,
   bookings, notifications, payment, change-password, and theme/language settings
   are local-only or fake — some in ways that mislead the user (fake success
   messages, fake card entry, "offline support" that doesn't exist).
4. **The PWA is not actually installable/offline.** No web manifest, no service
   worker, and dynamic routes 404 on refresh (no SPA fallback in the deploy).
5. **Recovery-app safety and engagement basics are missing.** No in-app crisis
   affordance, no real notifications/reminders (the core engagement loop), no
   reporting/blocking/anonymity for the community.

De-duplicated finding counts across the four audits: **2 Critical, 11 High,
~16 Medium, ~15 Low**, plus a set of confirmed good practices worth preserving.

---

## 1. Security

### 🔴 Critical

**S-C1 — Base tables have no RLS and are exposed directly through PostgREST.**
`db/README.md:57-64` (acknowledged), `db/auth-and-storage.sql:32-35`,
`db/views.sql:15-21`. The security model is "views self-scope by
`auth.jwt() ->> 'email'`, so base tables don't need RLS" — but that only protects
the `mobile_*` views. Production tables (`users`, `daily_assessments`,
`wheel_of_life_scores`, `answer_headers`, …) were imported with no RLS, and
PostgREST serves every table the `anon`/`authenticated` role can `SELECT`.

_Exploit:_ with only the shipped anon key (public in the bundle —
`src/api/supabase.ts:50`, `deploy-web.yml:43`):
`curl "$SUPABASE_URL/rest/v1/users?select=email,encrypted_password" -H "apikey: <anon>"`
returns every user's bcrypt hash (confirmed present, `db/auth-and-storage.sql:42-44`)
→ offline cracking of the entire user base; `daily_assessments` /
`wheel_of_life_scores` → every user's substance-use amounts and relapse flags.
Full breach of sensitive health data with an anonymous, publicly-known key.

_Fix:_ `REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon, authenticated`,
re-grant only the `mobile_*` views, and remove base tables from the exposed
PostgREST schema. The views are `SECURITY DEFINER`-equivalent via ownership, so
they keep working — low-breakage. Add the audit check in §7. **Do before launch.**

**S-C2 — Open sign-up + email-as-identity ⇒ account takeover.**
Every per-user view resolves the caller by `lower(email) = auth.jwt() ->> 'email'`
(`db/views.sql:101,158,183,212,240,262,308`); sign-up is open
(`src/api/supabase.ts:566`). If email-confirmation is disabled (not enforced
anywhere in code) or a production user's email wasn't imported into `auth.users`
(filtered when `encrypted_password` is blank, `auth-and-storage.sql:53-54`), an
attacker can register that victim's email and immediately read their `mobile_me`
and every scoped health view.

_Fix:_ enforce email confirmation; gate sign-up; bind identity to the immutable
`auth.uid()` mapped server-side to `users.id` (mapping table/trigger), not to a
mutable email string; verify email ownership against the pre-existing production
account before granting access to its data.

### 🟠 High

**S-H1 — Sparky AI webhook is unauthenticated with a client-supplied user id.**
`src/lib/sparky.ts:19,36-53`; caller `src/app/(tabs)/sparky.tsx:123`. The
`EXPO_PUBLIC_SPARKY_WEBHOOK` URL is inlined in the public bundle; the POST carries
**no auth token**, and `userId` comes from client state yet drives the flow's
"personalization + crisis-alert nodes". CORS only restricts browsers — a
server-side attacker reads the URL from the bundle and POSTs freely: spoof any
`userId` (forge/misroute crisis alerts, poison another user's chat memory), run up
LLM cost, and note that real recovery disclosures + full `history` are sent to
third-party n8n cloud each turn. _Fix:_ require the Supabase JWT on the webhook,
verify it in n8n, derive `userId` from the token, add rate-limiting.

**S-H2 — Session tokens in JS-readable web storage.** `src/lib/auth.tsx:24,40-43`
persists the full session (access + long-lived refresh token) to `AsyncStorage`
(= `localStorage` on web). Any XSS on the origin exfiltrates both; the refresh
token yields durable takeover. XSS surface is currently small (no
`dangerouslySetInnerHTML` anywhere), but for a health app rendering
third-party-influenced AI content, add a strict CSP, prefer a short access-token
TTL, and avoid persisting the refresh token in `localStorage`.

### 🟡 Medium

**S-M1 — Client-supplied `app_user_id` on check-in / wheel writes.**
`src/api/supabase.ts:395-399,444-456`. Reads/writes are correctly scoped by
`auth_uid` (RLS `USING` + `WITH CHECK` on `auth.uid()`, column default
`auth.uid()` — good), but the app also sends `app_user_id` (the production
`users.id`) and nothing ties it to the caller (`db/mobile-checkins.sql:41-47`,
`db/mobile-wheel-entries.sql:35-37`). The documented sync job keys production
`daily_assessments` / `wheel_of_life_scores` on `app_user_id`, so an attacker can
pre-seed relapse/wheel rows attributed to **another** member's clinical record.
_Fix:_ don't accept `app_user_id` from the client — derive it server-side, or
ignore it at sync time in favor of the `auth_uid` mapping.

**S-M2 — Change-password screen fakes success.** `src/app/settings/change-password.tsx:42-49`
clears fields and shows "Password updated" with no network call. Users believe
their password changed — real risk after a suspected compromise. Also no
current-password re-verification. _Fix:_ implement GoTrue `PUT /user` with
reauthentication; until then, don't display success. (See also X-B1.)

**S-M3 — Leaderboard leaks other users' email local-part and roster.**
`db/views.sql:235-247`. When `first_name` is empty, the display name falls back to
`split_part(u.email,'@',1)`, exposing other members' email local-parts, plus the
full top-50 roster. Meaningful confidentiality leak for a recovery community.
_Fix:_ drop the email fallback (use handle or "Member").

### 🟢 Low

- **S-L1 — Spoofable Sparky `sessionId`** (`src/app/(tabs)/sparky.tsx:101`):
  client-generated, not bound to the user; n8n memory is keyed by it → cross-session
  memory poisoning if guessed. Derive server-side from the verified token.
- **S-L2 — Supabase project ref committed** in `docs/supabase-go-live.md:4,38`.
  Not secret (ships in the client) but eases recon. Confirmed no anon/service keys
  are hardcoded anywhere (grep across `src`, `scripts`, `db`, `.github`, `app.json`).
- **S-L3 — AI crisis handling depends entirely on the remote flow** (see F-H3).

### ✅ Security — done well
- Views are `SECURITY DEFINER` and self-scope with `lower(email)` on both sides
  (no case bypass); per-user enrichment uses scalar subqueries, not joins, so a
  lesson never fans out to duplicate rows (`db/views.sql:60-72`).
- App-owned tables have correct RLS (`USING` **and** `WITH CHECK` on `auth.uid()`,
  `auth_uid` default `auth.uid()`, narrow grants) — clients can't spoof `auth_uid`.
- No HTML-injection surface: zero `dangerouslySetInnerHTML`/`eval`; community/AI
  content renders through RN `Text`; `Linking.openURL` guarded by `safeVimeoUrl()`.
- Sparky validates AI-produced video links against Vimeo oEmbed and drops
  invented/non-Vimeo links (`src/lib/sparky.ts:267-289`) — anti-phishing.
- CI secret hygiene: `service_role`/API keys live in Actions **secrets**, only the
  anon key/URL in **variables**; workflow `inputs` passed via `env:` (no shell
  injection). bcrypt `$2y$`→`$2a$` migration preserves hashes with no plaintext.

---

## 2. Data layer & DB contract

### 🟠 High

**D-H1 — `mobile_use_tracking` truncates the *newest* data.**
`src/api/supabase.ts:356`: `order: recorded_at.asc, limit: 3000`. Ascending + limit
returns the oldest 3000 daily rows; a user with >~8 years of `daily_assessments`
loses their most recent entries and the substance-use trend silently shows stale
history. _Fix:_ order `recorded_at.desc`, limit, reverse client-side (as
`wheelHistory` already does at :300-307), or aggregate server-side.

**D-H2 — Community is AsyncStorage-only; the SQL is absent on this branch.**
`db/community.sql` and `db/community-views.sql` do **not exist** here (only
`views.sql`, `mobile-checkins.sql`, `mobile-wheel-entries.sql`,
`auth-and-storage.sql`, `introspect.sql` are present) — the migration catalogue
marks them ✅, but that status is true only on the un-merged
`claude/mobile-design-app-build-lhqhpm` branch. At HEAD, F1 (`ae98e7c`) only
swapped the hardcoded author for `useCurrentAuthor()`; posts/comments/replies/
reactions/DMs are written exclusively to AsyncStorage (`src/lib/store.tsx:204-269`).
Consequences: community content is per-device only (no other user ever sees it; a
reinstall or `clearAll()` destroys it), and any Supabase community tables already
created per the catalogue are orphaned with no writer. _Fix:_ land the community
tables + adapter write-path before telling users community exists; until then
treat store community state as disposable and disclose "not synced".

**D-H3 — Wheel retake persists seed-default scores as real history.**
`src/app/mydata/wheel-assessment.tsx:24-28` initializes sliders from the **static
seed** `wheelAreas` (hardcoded 68/72/80/… in `src/data/content.ts:357+`), not from
`api.insights.wheelAreas()`. On Finish (:122-123) it writes **all 10 areas** to
the insert-only `mobile_wheel_entries`. A user who adjusts 2 sliders persists 8
fabricated scores that then *win* as newest-per-area and pollute monthly averages
permanently. _Fix:_ initialize from the fetched per-user areas; write only touched
areas (or all, but from real baselines).

**D-H4 — UTC vs local date keys collide check-ins.** The `mobile_checkins` date
key is UTC (`new Date().toISOString().slice(0,10)`, `src/app/checkin.tsx:58`; also
`data.tsx:19`, `index.tsx:72`), but streak/points logic uses the **local** date
(`src/lib/checkin.ts:18-19,44-56`). US/UTC-7 scenario: a 6pm Mon check-in is keyed
Tue (UTC); Tue the checklist already says "Checked in today", and a real Tue
check-in **overwrites Monday's answers** via `on_conflict=(auth_uid,date)` — two
local days collapse into one row (data loss) while the streak lib counts them
separately. _Fix:_ use the local calendar date everywhere, written explicitly;
align the server default `(now() at time zone 'utc')::date`
(`db/mobile-checkins.sql:19`).

### 🟡 Medium

**D-M1 — Fire-and-forget writes with no retry, masked by "local wins".**
`src/app/checkin.tsx:69` and `src/app/mydata/wheel-assessment.tsx:123` both
`.catch(() => {})`. A failed POST (offline, 401 mid-refresh, dropped unique index →
400) leaves the record only on-device, no feedback, no queue;
`mergeRemoteCheckins` "local wins" (`store.tsx:274-283`) then hides the divergence
forever and loses it on any other device. _Fix:_ mark rows "pending sync" and
retry on next launch; surface a non-blocking failure indicator.

**D-M2 — Over-fetching: `rest()` never sends `select=`.** `src/api/supabase.ts:68`.
Every read is `select=*` (e.g. full `description` for the lessons accordion). Waste
plus a wider accidental-contract surface. `mobile_snippets` is also **unbounded**
(`:183`, no limit) — fetches every classified snippet with full text on the videos
screen. _Fix:_ per-call `select` matching the Row types; add limit/pagination.

**D-M3 — Home "Continue to Lesson" N+1.** `src/app/(tabs)/index.tsx:44-57`:
programs → modules → serial `moduleLessons(m.id)` per module in a for-loop,
re-run on every `completedLessonIds.length` change; worst case one request per
module per mount. _Fix:_ single `mobile_lessons?module_id=in.(…)` (or `Promise.all`)
and cache across mounts.

**D-M4 — Audit script coverage is thin.** `scripts/audit-db-contract.mjs:85-143`
checks only three views' columns plus compat aliases and per-user lesson dedupe.
Missing: column assertions for every other view (`mobile_use_tracking`,
`mobile_wheel_scores/areas`, `mobile_assessments`, `mobile_leaderboard`,
`mobile_quotes`, `mobile_checkins/wheel_entries`); per-user scoping / RLS smoke
tests (anon → 0 rows/401); **base-table exposure check** (anon `GET /users?limit=1`
should 401 — operationalizes the S-C1 fix); write-path probe (upsert a check-in,
read it back, confirm the `on_conflict` index still exists); scale checks (wheel
scores ∈ 0..100 — the ×10 class already regressed once). _Fix:_ add these; the
column list is mechanical.

**D-M5 — trend.ts date-only off-by-one (latent).** `src/lib/trend.ts:73-77`:
`new Date('YYYY-MM-DD')` parses as UTC midnight then labels/buckets with local
getters — in negative-offset zones a date-only point renders on the previous
day/month. Only timestamptz feeds it today (use-tracking), so latent; it fires the
moment check-in dates (already date-only) get charted. Weekly `weekInfo` mixes
local getters with UTC math similarly (:28-34).

### 🟢 Low
- **D-L1 — `vimeo_id` type mismatch:** text in SQL (`db/views.sql:56`), `number` in
  TS (`supabase.ts:96`, `types.ts:44`). Works only via string interpolation; any
  future arithmetic/strict-compare breaks.
- **D-L2 — Check-in list capped at 400 rows** (`supabase.ts:429`, ~13 months);
  older check-ins never hydrate to a new device.
- **D-L3 — `life_area_id: i + 1` positional mapping** (`wheel-assessment.tsx:122`)
  assumes `life_areas.id` = 1..10 in seed order — an id gap silently mislabels areas
  and makes cutover lossy.
- **D-L4 — Community cutover is unrecoverable:** local rows store the community
  *name* (not `comm_channel_id`), no author FK (`appUserId` exists in
  `useCurrentAuthor` but isn't persisted on posts), reaction keys with no
  `emoji_id`, DM threads keyed by name slug with no counterpart user id, and every
  `time` is the literal `'now'`. None of the catalogue's mapping columns exist.
  Even in the interim local store, persist `appUserId`, channel id, counterpart id,
  and real ISO timestamps so today's content can migrate later.

### ✅ Data layer — done well
Every view/column the HEAD adapter reads exists in repo SQL; compat aliases
(`portion_id`, `avatar`, `addiction`, `days_counter_updated_at`, `usage_score`)
all present and audited; the wheel ×10/÷10 scale chain is consistent; check-in
upsert is properly idempotent per `(auth_uid,date)`; the wheel batch insert is a
single atomic PostgREST statement; the daily `audit-db.yml` contract check is an
unusually good live-contract guard.

---

## 3. Code quality & architecture

### 🟠 High

**C-H1 — `useAsync(...).data ?? []` discards loading and error states app-wide.**
~25 call sites (home `(tabs)/index.tsx:62-66`, `data.tsx:21-35`, community,
checkin summary, quotes, favorites, meetings, wheel, leaderboard, feed/new,
feed/explore, videos/[id]). On failure or slow network the screen renders blank —
no spinner, message, or retry. The well-designed `AsyncBoundary`
(`src/components/ui/async-boundary.tsx`) is used in only ~3 places. _Fix:_ adopt
`AsyncBoundary` (or at minimum spinner + error) on every primary query — the
component already exists, this is pure adoption.

**C-H2 — Silent seed-fallback in the "real" adapter hides outages.**
`src/api/supabase.ts` returns seed data on *any* error for whole surfaces
(`recommendedVideos` :241, `quotes` :260, `wheelAreas` :322, `leaderboard` :342)
and `[]` / `null` for others (`useTracking` :362, `assessments` :385, `me` :620).
A production outage or RLS misconfig is indistinguishable from "user has no data"
and renders demo content. _Fix:_ distinguish "view doesn't exist yet" (404/42P01)
from real failures; surface errors to `useAsync` so `AsyncBoundary` can retry;
extend the `SourceBadge` (used on Lessons) to every seed-backed surface. Also
key the backend switch off **both** URL and anon key (`index.ts:19` uses URL only —
if the key is missing, the app silently runs on seed while claiming Supabase).

**C-H3 — `feed/[id].tsx` wrong-post fallback + crash.** `src/app/feed/[id].tsx:105`:
`allPosts.find(...) ?? allPosts[0]` renders a *different* post for a stale URL, and
**TypeErrors** on `post.comments` (:106/128) when `allPosts` is empty (hiding all
posts is supported, `store.tsx:251`). Only outright crash found. _Fix:_ render a
"Post not found" state when `find` misses.

### 🟡 Medium

**C-M1 — Monolithic store context re-renders the whole app.**
`src/lib/store.tsx:171-322`: one context whose `value` is memoized on the entire
`state`, so any mutation (a bookmark tap, one DM send, marking a notification read)
recreates ~30 closures and re-renders every `useStore()` consumer — nearly every
screen plus `AppHeader`/`Shell`. `allPosts` recomputes on every change (:172-177).
_Fix:_ split into actions (stable `useCallback`+refs) vs data slices, or move to
zustand selectors. Stabilizing actions also removes the `eslint-disable` in
`_layout.tsx:78`.

**C-M2 — Full-blob persistence on every change.** `store.tsx:165-167`
`JSON.stringify`s the entire store to AsyncStorage on every mutation (synchronous
`localStorage` on web → main-thread jank as `dms`/`userPosts` grow). _Fix:_ debounce
writes (~300ms trailing) and/or persist per-key.

**C-M3 — Mock auth identity bug.** `src/api/mock.ts:125,146` — `refresh()` /
`sessionFromTokens()` return a hardcoded `okeijoseph@sparx.app`; since launch
always calls `refresh` (`auth.tsx:125`), in mock mode any signed-in user becomes
"Okeijoseph" after a reload. _Fix:_ round-trip the email through the refresh token.

**C-M4 — No request timeout/abort anywhere.** `supabase.ts:68-83,532-544`. A hung
fetch leaves screens in an eternal spinner (or eternal "loading" auth on launch).
_Fix:_ `AbortSignal.timeout(15000)` on all fetches; map abort → `AuthNetworkError`.

**C-M5 — Fake commerce/settings UI presented as real.**
`meetings/book.tsx:15-22` hardcodes **July 22–26 "2024"** slots and "Pay & Book"
($49) takes no payment; `settings/payment.tsx:12-15` fake cards;
`settings/add-card.tsx:67` "Save card" just `router.back()` (collects card digits
into dead state); `settings/premium.tsx` fake "7-day free trial" → fake payment.
Trust and App-Store-review liabilities (fake payment, collecting card numbers into
a dead form). _Fix:_ gate behind "coming soon" or hide from nav until backed;
never collect card numbers into a non-functional form.

### 🟢 Low
- **C-L1 — OAuth callback race:** the URL hash is stripped (`auth.tsx:98`) *before*
  `sessionFromTokens` succeeds; a flaky network right after redirect loses the
  tokens and dumps the user back to login. Strip only after `apply()` succeeds.
- **C-L2 — Writes fall back to the anon key when signed out** (`saveWheel` :404,
  `checkins.save` :463 use `authToken ?? ANON`) → guaranteed RLS failure surfaced
  as opaque 401/403. Fail fast with "sign in required".
- **C-L3 — Duplicate components:** `components/ui/video-thumb.tsx` vs
  `components/video-thumbnail.tsx` (overlapping; both used) — merge with props.
- **C-L4 — Dead/placeholder data:** `heroProgram.progress` hardcoded (home hero
  shows fixed % regardless of real progress, `index.tsx:203-213`); `dailyChecklist`
  / `upcomingMeetings` exports dead; `content.ts` is still the live source for
  meetings/coach/communities/posts/reports/challenges/socials.
- **C-L5 — `i.pravatar.cc` used in 18+ places** incl. `DEFAULT_AVATAR`
  (`auth.tsx:245`) → random third-party faces on real users; ship a bundled asset.
- **C-L6 — `lesson/[id].tsx:66`** re-forces the outline open/closed on every
  breakpoint crossing, clobbering the user's manual toggle.

### Tooling, types, dependencies
- **No tests at all** — no runner, no testing deps. Highest-leverage additions:
  unit tests for the pure logic in `src/lib/` (`trend.ts`, `checkin.ts` streak
  math, `sparky.ts` `extractReply`/`stripVideoLinks`/`vimeoEmbedUrl`,
  `quote-pick.ts`) and the row-mappers in `api/supabase.ts` — all dependency-free.
- **Lint not reproducible:** `"lint": "expo lint"` exists but eslint is absent from
  the lockfile and there's no config — add `eslint-config-expo` to devDependencies.
- **No CI gate:** `deploy-web.yml` ships to Pages on every push to `main` with no
  typecheck/lint/test. Add a `ci.yml` on push + PR (`tsc --noEmit` + `expo lint` +
  unit tests) and make `deploy` `needs:` it so `main` can't ship red.
- **TypeScript health is good:** `strict: true`; only 6 deliberate `any`s (web-global
  escapes); hand-written Row types per view. Enabling `experiments.typedRoutes`
  would remove the ~12 `router.push(route as never)` casts and catch broken links
  at compile time.
- **Unused deps** (0 imports in `src/`): `@expo/ui`, `expo-glass-effect`,
  `expo-symbols`, `expo-device`, `expo-web-browser`, `expo-system-ui` (verify
  `react-native-reanimated`/`worklets` aren't needed by a navigator internal before
  removing). Trims install/build time.
- **Theming is strong** (`src/constants/theme.ts` is a real token system, used
  pervasively) but a `ThemeColors.dark` map exists that nothing consumes and
  `settings/theme.tsx` is an unwired picker. i18n is **not ready** — every string
  is a hardcoded English literal and `settings/languages.tsx` is a local radio
  list; route strings through a `t()` shim now if localization is on the roadmap.

### ✅ Code — done well
The API seam (`types.ts` `Api` interface, both adapters implement it fully with no
drift), the auth layer (launch-time OAuth-hash handling, refresh-first restore,
`active` flags on async effects, single-flight 401 refresh via refs — the
strongest file in the repo), `store.tsx`'s functional-update discipline,
`AsyncBoundary`, and `use-vimeo-meta.ts` (sync cache seed + in-flight dedupe + 429
backoff, never blanks an existing thumbnail) are all well-built.

---

## 4. Features, UX & PWA

### 🟠 High

**F-H1 — The PWA is not installable and not offline.**
- **No web app manifest at all** — `app.json:25-28` web config is only
  `{output:"static", favicon}`; no `name/theme_color/display/icons`, no
  `public/manifest.json`. Chrome/Android shows no install prompt; installed icon
  falls back to a screenshot. _Fix:_ add `public/manifest.webmanifest` + a custom
  `+html.tsx` linking it, with maskable icons and `theme_color: #0A3653`.
- **`pwa-install.tsx:39` promises "offline support" that doesn't exist** — there is
  no service worker, so an installed app cold-loads the JS bundle every time and is
  fully network-dependent. The install-guide icon still shows the old "IG" monogram
  (`:35`). _Fix:_ ship a minimal Workbox precache SW or soften the copy; fix the
  monogram.
- **Dynamic routes 404 on refresh** — static export has no per-id HTML for
  `/lesson/[id]`, `/videos/[id]`, `/feed/[id]`, `/meetings/[id]`, and the deploy
  adds only `.nojekyll` (`deploy-web.yml:45-51`), no `404.html` SPA fallback.
  "Copy link" even generates such URLs (`post-card.tsx:34-50`). _Fix:_ copy the
  exported `index.html` to `dist/404.html` in the workflow; verify live.

**F-H2 — No real notifications — the core engagement loop is missing.**
No `expo-notifications`, no push registration, no web push; settings toggles are
ephemeral `useState` (`settings/notifications.tsx:19,42`); the notifications screen
is 5 hardcoded items (`notifications.tsx:24-30`) and the header bell dot is always
on (`app-header.tsx:14`). Daily check-in reminders — the product's engagement
engine, whose check-in half is fully built — cannot fire when the app is closed.
_Fix:_ persist prefs, register push (or at minimum local/web reminders), drive the
bell dot from real unread state.

**F-H3 — No in-app crisis/safety affordance.** Grep `crisis|hotline|988|emergency`:
only a ToS disclaimer and the **server-side** Sparky prompt
(`design/sparky-ai/system-prompt.md:49-57`). If the webhook is down, Sparky's
local fallback has no crisis path (`sparky.tsx:50-61`). For a recovery app this is
the single most important missing feature. _Fix:_ an always-reachable "Get help now"
entry (988 / SAMHSA 1-800-662-4357 / local services) plus a crisis-keyword check in
the local fallback that surfaces it regardless of backend state.

**F-H4 — Accessibility: the app is largely unusable with a screen reader.**
8 `accessibilityLabel` / 11 `accessibilityRole` across ~404 Pressables in 49 files;
zero hints/announcements. Icon-only controls unlabeled (header bell/chat/bookmark
`app-header.tsx:57-62`; bottom-nav tabs `nav/bottom-nav.tsx:63-68`; reaction
buttons ignore their own `label`). Wheel-chart SVG and mood slider have no text
alternative. _Fix:_ label icon controls, add value semantics to slider/wheel.

**F-H5 — Primary CTA contrast fails WCAG.** White on orange `#FF9D4B` ≈ **2.06:1**
(`ui/button.tsx:28,36` — every `variant="primary"`, incl. "Complete check-in");
white on `lightBlue #699AC1` ≈ 3.0:1; orange "Step X/5" on peach ≈ 1.9:1
(`checkin.tsx:108`). Body text passes. _Fix:_ add a darker `Colors.orangeDeep` for
text/fill use, or dark text on orange.

**F-H6 — Change-password and delete-account mislead.** Change-password fakes
success (S-M2). "Delete account" wipes local data + signs out but performs **no
server-side deletion** (`profile.tsx:98-109`) — GDPR / App-Store risk. _Fix:_ wire
both to real endpoints; until then don't claim completion.

### 🟡 Medium

**F-M1 — No pull-to-refresh anywhere.** Grep `RefreshControl`: 0 hits. Data loads
once per mount; stale feed/meetings/wheel data has no user-initiated refresh.
_Fix:_ wire `RefreshControl` → `query.reload()` on Home, Community, Lessons,
Videos, Meetings, My Data.

**F-M2 — Inconsistent keyboard handling.** `KeyboardAvoidingView` is present on
login/check-in/sparky/feed[id]/chat but **missing on the feed composer**
(`feed/new.tsx:87`), change-password, and add-card; `keyboardShouldPersistTaps` is
set nowhere (send/post buttons need two taps with the keyboard up). DM chat also
doesn't auto-scroll to the newest message (`feed/chat.tsx:53-71`).

**F-M3 — Community lacks moderation/anonymity.** "Report post" merely locally hides
(`post-card.tsx:66`, identical to "Hide"); no blocking, no moderation queue, no
anonymity toggle though the rules text mentions anonymity (`feed/new.tsx:28`).
Posts/DMs always carry real name+avatar (`useCurrentAuthor`). Pseudonymity + real
reporting are table stakes before the feed goes server-side.

**F-M4 — Sparky loses its conversation on every reload.** The design gives the
backend Postgres memory keyed by `sessionId`, but the app generates a fresh
`sessionId` per mount (`sparky.tsx:101`) and keeps history only in component state
→ server memory can never span sessions. No streaming, no auto-scroll. _Fix:_
persist `sessionId` + transcript to the store keyed by user.

**F-M5 — Meetings/reports/challenges are seed-via-API but look real.** Meetings
list/detail/booking are static seed (`supabase.ts:269-283`), booking persists
locally only, and the hero card progress is a hardcoded % (`index.tsx:197-213`).
_Fix:_ back with real views or clearly label as sample; gate "Pay & Book" until
payment exists.

**F-M6 — Spinners only, no skeletons; empty-value flashes.** `data.tsx:21-38`
flashes "0%"; `favorites.tsx:25-29` flashes the empty state before data arrives;
community feed and notifications have no `ListEmptyComponent`.

**F-M7 — Bundle weight.** 3.3 MB of quote backgrounds (`assets/images/quote-bg/
bg-1..4.png`, 0.5–1 MB each, loaded in `quotes.tsx`) + a 784 KB `icon.png` ship
full-size on the web export. _Fix:_ compress to WebP (~100–200 KB), resize the icon.

### 🟢 Low
- **F-L1 — `videos/[id].tsx:21`** falls back to `recommendedVideos[0]` for an
  unknown id — plays the wrong video instead of a not-found state.
- **F-L2 — No toasts/haptics** anywhere; failed server syncs are invisible.
- **F-L3 — Touch targets below 44pt:** segmented ≈36pt (`segmented.tsx:55`),
  reaction bar ≈32pt (`reaction-bar.tsx:56`).
- **F-L4 — Identifiers still IGNTD** (`slug: igntd-mobile`, `scheme: igntd`,
  `com.igntd.mobile`, `app.json`) — rebrand before store submission.
- **F-L5 — Placeholder content shipped:** lesson "Exercises"/"Summary" steps say
  "coming soon" (`lesson/[id].tsx:181-204`); star ratings are fake (default 5);
  web quote-download is an `alert()` stub (`quotes.tsx:77-81`); "coach's note" is
  hardcoded.
- **F-L6 — No onboarding / no search.** Fresh signups land on the dashboard with no
  goal/addiction capture (personalization then falls back to generic); there is no
  search input app-wide.

### ✅ Features — done well
Relapse-sensitive, non-judgmental check-in copy ("that's information, not failure")
personalized per addiction; the **streak is check-in-based, not abstinence-based**
(reporting a use day doesn't break it) — the right design, preserve it deliberately
at server-sync time. Responsive desktop shell with sidebar, persistent bottom nav
(no dead ends), `useGoBack` fallback, confetti on check-in, real virtualized
FlatLists on the growable lists, and `expo-image` for thumbnails are all solid.

---

## 5. Prioritized action plan

### Gate 0 — Must fix before any launch (security & trust)
1. **Lock down base tables** (S-C1): revoke anon/authenticated `SELECT` on base
   tables, re-grant only `mobile_*` views, and add the anon-`/users` audit check.
2. **Close open sign-up + verify email ownership; stop keying identity on raw
   email** (S-C2).
3. **Authenticate the Sparky webhook; derive `userId` server-side** (S-H1).
4. **Stop faking security-relevant actions:** wire change-password to GoTrue and
   make delete-account perform real server deletion — or remove the success
   claims (S-M2 / F-H6).
5. **Quarantine fake commerce** (fake card entry, "July 2024" bookings, fake
   trials) behind "coming soon" (C-M5).

### Gate 1 — Correctness & data integrity (before more users write data)
6. Fix the wheel-retake seed-default write (D-H3) and the UTC/local check-in date
   collision (D-H4) — both silently corrupt real user records.
7. Fix `mobile_use_tracking` asc+limit dropping newest data (D-H1).
8. Give writes a retry/pending-sync path instead of empty catches (D-M1).
9. Fix the `feed/[id]` crash / wrong-post fallback (C-H3).
10. Stop silent seed-fallback masking outages; gate the backend switch on the anon
    key too; extend `SourceBadge` (C-H2).
11. Adopt `AsyncBoundary` on every primary query (C-H1).
12. Land community tables + adapter, or clearly disclose "not synced" and persist
    migration keys (appUserId, channel id, counterpart id, ISO timestamps) even in
    the local store (D-H2 / D-L4).

### Gate 2 — Ship-quality PWA & engagement
13. Web manifest + icons + theme color; `404.html` SPA fallback; a real service
    worker or drop the "offline" claim (F-H1).
14. Real notifications + persisted prefs + check-in reminders (F-H2).
15. In-app crisis/safety affordance + crisis keyword net in Sparky's fallback (F-H3).
16. Accessibility pass: label icon controls, fix CTA contrast, slider/wheel
    semantics (F-H4 / F-H5).
17. Pull-to-refresh, keyboard handling on the remaining forms, DM auto-scroll
    (F-M1 / F-M2).
18. Community moderation: real reporting, blocking, pseudonymity before it goes
    server-side (F-M3).

### Gate 3 — Foundations & polish
19. CI gate (`tsc --noEmit` + lint + unit tests) that `deploy` depends on; unit
    tests for `src/lib/` pure logic; reproducible eslint config.
20. Split the store context / stabilize action identities; debounce persistence
    (C-M1 / C-M2).
21. Add request timeouts (C-M4); expand the DB contract audit (D-M4); add `select=`
    projections and fix the home N+1 (D-M2 / D-M3).
22. Persist Sparky session/history (F-M4); compress assets (F-M7); rebrand IGNTD
    identifiers (F-L4); enable typed routes; remove unused deps.

---

## 6. Method & scope

Findings were produced by four parallel deep-dive passes (security, data/DB
contract, code quality, features/UX), each reading the actual source and citing
file:line, then cross-checked and de-duplicated here. The live Supabase project
was not reachable, so a handful of runtime facts are inferred from SQL/app source
and the team's own docs (`db/README.md`, `docs/pre-launch-checklist.md`, the
migration catalogue) — each such item names the command to confirm it live. The
older `docs/feature-liveness-audit.md` and `docs/remaining-work.md` are stale;
`docs/code-audit.md` (2026-06-30) and `docs/pre-launch-checklist.md` are accurate
and were treated as the reliable baseline.

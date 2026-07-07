# SPARx — Project Status

_A single source of truth: what's built, what's in progress, and what's proposed
but not yet decided. Snapshot as of 2026-07-07._

For deep detail, see the referenced docs at the bottom. This is the map.

---

## Architecture in one paragraph

SPARx is an **Expo / React Native app** shipped as a **web PWA** (file-based
Expo Router navigation), deployed **from `main` to GitHub Pages** on every merge.
Its backend is **Supabase** (Postgres + auto-generated REST API + GoTrue auth +
storage), with an **app-owned `mobile_*` layer** (views, tables, RPCs, RLS)
sitting over a **2026 copy of the legacy Rails production database** (which lives
on Heroku). The app talks to the backend through a **single swappable adapter
seam** (`src/api/`), so screens never touch Supabase directly — the backend can
be changed by swapping one layer. The `mobile_*` SQL is **auto-applied to
Supabase by CI on merge**, guarded by a catalogue check.

---

## 1. Built — shipped and live on `main`

### Foundation & design
- Expo SDK 56 / React Native / TypeScript-strict scaffold; Figma-derived design
  system (colors, typography, spacing), shared `AppHeader`, PWA install flow.
- Swappable API seam (`src/api` → Supabase or local mock) with typed `Api`
  surface.

### Content & lessons
- Real lessons + workshops from production data; module/lesson browse.
- Video playback via Vimeo, **watch tracking** (postMessage %), completion at
  ≥95%, cross-device.
- **Recommended videos** (AI-ranked snippets), branded thumbnail fallbacks.
- **Favorites** (lessons + workshops, separate tabs) with a real write path.
- Subscription-role **content gating** (locked unless entitled; July testers
  all-access).

### Home dashboard
- Booking flow, video details, rotating quotes, dismissable install banner.

### My Data
- **Wheel of Life** (radar chart, history, retake write-back, annual per-year).
- **Substance-use / drink tracking** trends from real daily entries (avg line,
  value coloring).
- **Assessment list + trend graphs** from `answer_headers × profiles`.
- Reusable `MetricTrend` primitive.

### Check-ins
- Daily check-in flow (mood, positives/negatives, behavior, affirmation) with
  streak + confetti; **server-side persistence** (`mobile_checkins`),
  cross-device re-prompt; usage question tailored to substance vs. behavioral.

### Community & chat
- Real channels + feed (posts/comments) on production data; rooms (filtered
  feed); **post/comment attribution** to the signed-in user; HTML sanitization;
  real avatars.
- **Chat:** direct + group messages (conversation model), block/mute.
- **Reliable posting** (awaits the write, shows "Posting…", surfaces errors) and
  a **post celebration** (+XP + leaderboard movement).
- **Gender/age forum gating** for all users (incl. existing).

### Meetings
- **1:1 booking** (coach picker → live Acuity scheduler).
- **Group booking** from `sds_groups` (tz-aware, role-gated join link).
- Real upcoming reminders on home + alerts.

### Gamification
- **Points/XP model:** check-in schedule (1·2·3·4·5·6·10/day), multipliers on
  everything else; video-watch economy (badges, milestone bonuses).
- **Durable server-side game state** (`mobile_game_state`, MAX-merge, crosses
  devices/reinstalls).
- **XP events ledger** (`mobile_xp_events`) — the shared, itemized, reconcilable
  source of truth; **every completion celebrates** with +XP and leaderboard
  movement.
- **Check-in XP is once-per-day, enforced server-side** (partial unique index +
  idempotent award RPC — no longer dependent on fragile local storage).
- **Leaderboards:** multiple boards (points, streak, lessons, workshops,
  community, videos, check-ins), rolling windows (all-time / 30d / 7d),
  redesigned gradient-hero podium.

### Onboarding
- New-user flow: **welcome → DOB → gender → primary problem → secondary problems
  → details**; demographics profile (`mobile_onboarding_profile`).
- **DOB field auto-advances** MM→DD→YYYY.
- **Gender/age group gating** (new users gated; existing users bypass).
- **Activation chain:** "Introduce yourself · +50 XP" reliably lands in the
  community composer; skipping still lands in the matched community feed.

### Assessments
- **Day-1 battery** (GAD-7 / PHQ-9 / AUDIT-C / intake), client-scored public-
  domain instruments; soft content gate.
- **PCL-5** + **monthly re-administration** cadence + **trend graphs**.
- Stored in `mobile_assessment_responses` (reconciles to `answer_headers`/
  `answers` at cutover).

### Auth
- Email/password + **social sign-in scaffolding** (Google **live**; Apple +
  Facebook built but **hidden** behind `EXPO_PUBLIC_OAUTH_PROVIDERS` until
  configured). Forced re-login on invalid session.

### Lesson exercises (rollout underway — Modules 1–3 live)
- Interactive exercise renderer over the legacy question engine
  (`mobile_lesson_exercises` view; `mobile_exercise_responses` table, resumable
  upsert-per-question).
- **Gradual module rollout** via `mobile_exercise_rollout` — enable the next
  module with one INSERT, live instantly, no app deploy.
- Modules 1–3 shipped: Likert scales, content blocks with tables/images,
  printable manifesto, composed Power Statement + community share, **worksheet
  scores saved with dates**.

### Sparxy AI
- `mobile_ai_context(auth_uid)` RPC — the whole per-user picture as one JSON,
  **straddling legacy + mobile** layers (assessments, check-ins, gamification,
  posts, safety flags); `authUid` sent in the webhook.

### Admin
- Hidden **`/admin`** dashboard (server-gated by `mobile_admins` allowlist);
  `mobile_admin_overview` (totals, signups/day, active-testers with real XP);
  `mobile_admin_signups` (SQL-editor view of recent signups).

### Data / backend layer & infra
- **~80 `mobile_*` objects** (views/tables/RPCs) with RLS; base-table lockdown.
- **Cutover reconcile** scripts (`db/reconcile.sql`) — write mobile_* back into
  prod at launch; **tester promotion** helper.
- **CI:** auto-apply DB layer on merge (session pooler), migration-catalogue
  guardrail, deploy-web to GitHub Pages (with retries).

---

## 2. In progress

- **Lesson exercises — remaining rollout.** Modules 1–3 are live; the full set is
  **91 lessons / 148 worksheets / 1,616 questions** in the legacy DB. Remaining:
  enable Modules 4+ (one INSERT each via `mobile_exercise_rollout`), plus content
  fixes and any new input-widget handling as later modules surface them.
  Spec: `docs/lesson-exercises-spec.md`.

---

## 3. Proposed / not yet decided

### Backend & hosting
- **DB / backend strategy** — stay on Supabase vs. move the DB to **Neon** vs.
  re-home to **Heroku**. Leading view (given Rails is likely retired): make
  Postgres the single source of truth, keep the lowest-rework path, don't rebuild
  onto the platform being sunset. **Decision open.** → `docs/backend-strategy.md`
- **Rails website retirement** — likely the end goal; needs a **timeline + parity
  checklist** before sunset, and a plan to bring **full history** (pre-2026) into
  the canonical DB.
- **Static hosting** — stay on GitHub Pages vs. move to **Cloudflare Pages /
  Netlify** with a **custom domain** (root path, SPA routing, deploy previews).
  Trigger = wanting a branded domain. **Decision open.**
- **Cutover timing** — when to reconcile mobile→prod and unify the two diverging
  databases (Supabase 2026-copy + new activity vs. Heroku full history).

### Compliance
- **HIPAA / BAA** — this is sensitive mental-health data. Decide whether a BAA is
  required and who provides it (Supabase Team, Neon Business, AWS/Crunchy, etc.).
  **Not yet decided** — but it constrains the hosting choice.

### Auth
- **Apple + Facebook login** — code is built; awaiting provider configuration
  (Apple needs a paid dev account; Facebook needs App Review). Enable via
  `EXPO_PUBLIC_OAUTH_PROVIDERS`.
- **Google consent-screen polish** — set app name/logo; the "continue to
  …supabase.co" text needs a **Supabase custom domain** to fully brand.

### Product / design
- **App icon redesign** — energizing "spark" direction requested; 3 concepts +
  written designer briefs delivered, none chosen. **Awaiting designer.**
- **Native app-store builds** (iOS/Android via Expo EAS) — supported by the
  stack, **not started**. Proposed.
- **Rolling AI summary layer** for Sparxy (a `mobile_ai_profile` cache + refresh)
  — offered, not started.
- **Exercises product calls** (from the spec): keep answer **history** vs.
  latest-only; render read-only **computed widgets** or hide; **XP granularity**
  (per-question / per-worksheet / per-lesson).

---

## Reference docs
- `docs/backend-strategy.md` — Supabase vs Neon vs Heroku, hosting shapes, the
  retire-Rails recommendation.
- `docs/lesson-exercises-spec.md` — the exercises data model, widget mapping,
  renderer plan (confirmed against prod schema).
- `docs/db-migration-catalogue.md` — every `mobile_*` object + the cutover /
  reconcile plan (the migration bible).
- `docs/pre-launch-checklist.md`, `docs/remaining-work.md` — launch/security todo.
- `docs/supabase-go-live.md`, `docs/full-supabase-migration.md` — go-live + data
  import.
- `AGENTS.md` — the deploy-from-main model + additive-views rule.

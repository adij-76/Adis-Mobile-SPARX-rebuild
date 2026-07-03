# Final DB migration — documentation catalogue

The master, all-inclusive index of everything required to re-import / migrate the
production database and re-establish the mobile app's data layer on top of it —
**and** to eventually cut the mobile app over to writing the real production
tables (so mobile-created content reaches web users too).

Legend: ✅ exists · ⚠️ needs writing/updating at cutover · 🔒 dashboard-only (not SQL)

---

## A. SQL to re-run after every import (recreatable read/write layer)

Run in this order; all are idempotent.

Two groups: **(i) app-owned tables** (create first), then **(ii) views + functions**
(they splice the app tables into the read layer, guarded by `to_regclass`).

**(i) App-owned tables + RLS — run first**

| # | File | Creates | Status |
|---|------|---------|--------|
| 1 | `db/mobile-checkins.sql` | App-owned `mobile_checkins` table (RLS) | ✅ |
| 2 | `db/mobile-wheel-entries.sql` | App-owned `mobile_wheel_entries` table (RLS) | ✅ |
| 3 | `db/mobile-favorites.sql` | App-owned `mobile_favorites` table — bookmark toggles (kind/item_id, `active` tombstone) (RLS) | ✅ |
| 4 | `db/community.sql` | App-owned write tables: `mobile_feed_posts`, `mobile_feed_comments`, `mobile_feed_reactions` (the `mobile_dm_*` tables here are superseded by `db/chat.sql`) | ✅ |
| 5 | `db/chat.sql` | Chat (conversation model): helpers `mobile_uid()` / `mobile_is_member()` / `mobile_blocked_in()`; app-owned `mobile_conversations`, `mobile_conversation_members`, `mobile_messages`, `mobile_blocks` (RLS); RPCs `mobile_start_direct()` / `mobile_start_group()`; read views `mobile_directory`, `mobile_threads`, `mobile_thread_messages`. A 1:1 DM is a 2-member, non-group conversation. | ✅ |
| 6 | `db/groups.sql` | Meetings: app-owned `mobile_group_signups` (RLS) + read view `mobile_groups` over `sds_groups` — role-gated via `subscription_role_groups`, coach via `sds_user_id`→`users`, weekly schedule from `meet_day`/`meet_time_char` (anchor tz America/Los_Angeles). `join_url` only for signed-up members; coach `start_url` never exposed. | ✅ |
| 6b | `db/video-watches.sql` | Video progress: app-owned `mobile_video_watches` (RLS) — one row per (user, video) with `percent` (furthest watched, 0-100); ≥95% counts as complete so the checklist ticks off across devices. RPC `mobile_record_watch(video_id, percent, app_user_id)` upserts keeping the MAX percent. Reconciles to a `watched_video` reward + points (percent enables a progress/points board). | ✅ |
| 6c | `db/game-state.sql` | Durable app-side gamification state: app-owned `mobile_game_state` (RLS, one row per user) — `video_points`, `streak_bonus_points`, `streak_credited_days`+`streak_run_start`, `streak_badges` (jsonb). Helper `mobile_jsonb_max_merge`; RPC `mobile_save_game_state(...)` upserts MAX-merging every total so concurrent/offline writes never lower a value. Survives reinstall + crosses devices; reconciles to `user_points`/`user_rewards` at cutover. | ✅ |

**(ii) Read views + functions — run after the tables**

| # | File | Creates | Status |
|---|------|---------|--------|
| 7 | `db/views.sql` | Catalog + per-user read views: `mobile_programs`, `mobile_modules`, `mobile_lessons`, `mobile_snippets`, `mobile_quotes`, `mobile_recommended_videos`, `mobile_use_tracking`, `mobile_wheel_areas`, `mobile_wheel_scores`, `mobile_leaderboard` (legacy all-time), `mobile_assessments`, `mobile_me` | ✅ |
| 8 | `db/checkin-history.sql` | `mobile_checkin_history` view = `mobile_checkins` ∪ `daily_assessments` (deduped by date). Run after files 1 + 7. | ✅ |
| 9 | `db/community-views.sql` | Community read views: `mobile_posts` (exposes `author_id` for DM-from-post), `mobile_comments`, `mobile_channels`, `mobile_notifications`. Run after file 4. | ✅ |
| 10 | `db/leaderboard.sql` | Leaderboard functions (SECURITY DEFINER): `mobile_leaderboard_metric(metric, period)` (points/lessons/workshops/community/videos/check-ins over `user_points`→`user_rewards`→`rewards`), `mobile_streak_leaderboard(period)` (longest check-in run over `daily_assessments`), legacy `mobile_leaderboard_period(period)`. Rolling windows (7/30 days). | ✅ |
| 11 | `db/auth-and-storage.sql` | Imports users into Supabase Auth (keeps passwords), avatars bucket + storage policies | ✅ |

> **Order note:** the group-(ii) view files use `to_regclass` guards, so they only
> splice in an app table that already exists — run group (i) first, or just re-run
> the view files afterward. `checkin-history.sql` needs `mobile_checkins`;
> `community-views.sql` needs `community.sql`'s tables.

## B. App-owned data tables — PRESERVE on re-import ⚠️ (real user data)

These hold data the mobile app **wrote** (not recreatable). Back up + restore
across any re-import that recreates the `public` schema. A data-only import of the
production tables leaves them untouched.

- `mobile_checkins` — daily check-ins
- `mobile_wheel_entries` — Wheel of Life retakes
- `mobile_feed_posts` / `mobile_feed_comments` / `mobile_feed_reactions` — community feed
- `mobile_conversations` / `mobile_conversation_members` / `mobile_messages` — chat (DMs + groups)
- `mobile_blocks` — one-directional block list ("X can't DM me")
- `mobile_group_signups` — who signed up for which `sds_groups` coaching group
- `mobile_video_watches` — video watch progress (one row per user/video, furthest `percent`; drives checklist completion + progress rewards)
- `mobile_game_state` — durable app-side gamification totals (video points, streak bonus points, streak badges) — one row per user, MAX-merged
- `mobile_favorites` — bookmark toggles (kind/item_id, `active` tombstones un-saves)
- *(legacy, unused)* `mobile_dm_conversations` / `mobile_dm_messages` — superseded by `mobile_messages`
- *(future)* notification read-state

## C. Reconciliation jobs — app-owned → production (write for cutover) ⚠️

The one-time migration that makes mobile content visible to **web/Rails users**
and retires the app-owned tables. Each carries keys back to the real FKs.

| App-owned | → Production | Mapping notes |
|---|---|---|
| `mobile_checkins` | `daily_assessments` | `app_user_id`, `date`; mood/affirmation/tracking fields |
| `mobile_wheel_entries` | `wheel_of_life_scores` | `app_user_id`, `life_area_id`; **score ÷ 10** (app 0-100 → prod 0-10) |
| `mobile_feed_posts` | `comm_posts` | `app_user_id`→user_id, `comm_channel_id`, `content`/`title`; image has no prod column (handle separately) |
| `mobile_feed_comments` | `comments` | `app_user_id`, `post_ref`→`comm_post_id`, `parent_ref`→polymorphic `commentable_*` |
| `mobile_feed_reactions` | `reactions` | `app_user_id`, `target_ref`→`comm_post_id`/polymorphic, `reaction`→`emoji_id` (via `emojis`) |
| `mobile_conversations` + `mobile_conversation_members` | `community_conversations` | 1:1 → `user_one_id`/`user_two_id`; groups have no direct prod equivalent (needs a prod group-thread mechanism at cutover) |
| `mobile_messages` | `community_messages` | `sender_id`, `conversation_id`→prod conversation, `content`, `created_at`; `last_read_at` (on members) → prod read state |
| `mobile_blocks` | *(prod block table TBD)* | `blocker_id`, `blocked_id`, `active` — map to the production block/mute mechanism at cutover |
| `mobile_group_signups` | *(prod: `sds_group_subscribers`?)* | `app_user_id`→`user_id`, `sds_group_id`; reconcile to the prod group-membership/attendance mechanism |
| `mobile_video_watches` | `user_rewards` + `user_points` | `app_user_id`→`user_id`, `video_id`→`Snippet`; award points per non-linear tier reached (`src/lib/video-points.ts`: started/50%/finished = 1/2/3 base × streak multiplier ×1/×1.5/×2), `percent≥95` also emits a `watched_video` reward. Dedupe on (user, video). Pre-cutover these points live app-side (store `videoPoints`); at cutover materialize into `user_points` |
| `mobile_game_state` | `user_points` (+ optional `user_rewards`) | One row per user. `app_user_id`→`user_id`; `video_points` + `streak_bonus_points` → emit `user_points` (dedupe against any `watched_video` reward points already emitted from `mobile_video_watches` so watch points aren't double-counted); `streak_badges` → optional milestone `user_rewards`. Point rules/values: `src/lib/video-points.ts`, `src/lib/streaks.ts`, `docs/gamification.md` |
| `mobile_favorites` | `favorites` | `app_user_id`→`user_id`, `kind`+`item_id`→polymorphic `favoritable_type`/`favoritable_id` (`lesson`→`Lesson`, `video`→`Snippet`); `active=false` removes the prod favorite |

**Read-only at cutover (no reconciliation):** the leaderboard functions
(`db/leaderboard.sql`) and `mobile_groups` read production tables (`user_points`,
`user_rewards`, `rewards`, `daily_assessments`, `sds_groups`) directly — nothing
app-owned to write back; they keep working as-is against the migrated schema.

After the job: app reads/writes prod directly; app-owned tables become a cache or
are dropped. Document the executed job + date in `db/README.md` at cutover.

## D. Reference documentation (the shared vocabulary)

| Doc | Purpose | Status |
|---|---|---|
| `db/field-dictionary.md` | Canonical map: production column → `mobile_*` view column → app field | ✅ (extend as views grow) |
| `db/README.md` | What the layer is, why it's safe, re-import playbook, app-owned preservation | ✅ |
| `docs/community-chat-plan.md` | Community/chat mapping + phased build + migration path | ✅ |
| **Ref-scheme decoder** | The community id scheme: `p`<comm_post> / `a`<app post>; `c`/`ac` comments; `cv`/`acv` conversations | ✅ (in `db/community-views.sql` header) — ⚠️ promote to field-dictionary |
| **Scale & derivation conventions** | wheel 0-10→0-100 (×10); substance `tracking_amount` raw (NOT computed `usage_score`); `usage_score` = weekly index | ✅ (field-dictionary) |
| **Enum maps** | `addictions.enum_id` (0=Alcohol…), `lesson_type` (1=workshop), `commentable_type`/`reactionable_type`/`notifiable_type` polymorphic values | ⚠️ consolidate into field-dictionary |
| **Emoji map** | `reactions.emoji_id` → `emojis.e_character` (glyph) for per-emoji reaction display | ⚠️ document when reactions show emojis |
| `db/introspect.sql` | One-shot schema dump (paste-back substitute for direct DB access) | ✅ |
| `docs/gamification.md` | The points/streak/badge/bonus economy + research-backed roadmap and recovery-population guardrails; the "why" behind the reward reconciliation | ✅ |
| `docs/native-build-notes.md` | Native (iOS/Android) requirements the web build fakes — incl. the WebView bridge needed for real video completion/percent tracking | ✅ |

## E. Dashboard-only settings 🔒 (set once; survive a data re-import)

- **Auth → Providers:** enable Google / Apple / Facebook + OAuth client id/secret
- **Auth → URL Configuration → Redirect URLs:** deployed web origin + `http://localhost:8081`
- **Storage buckets:** `avatars` (exists) + a **post-images** bucket when feed image upload lands
- **Repo / build variables:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  (anon/publishable key only — never service_role), `SPARKY_WEBHOOK`
- **Base-table RLS decision:** production tables were imported without RLS; the
  `mobile_*` views self-scope by email, but locking down direct PostgREST reads of
  base tables (`GET /rest/v1/users`) is a deliberate pre-launch hardening step

## F. Contract invariants + automated audit

| Artifact | Purpose | Status |
|---|---|---|
| `scripts/audit-db-contract.mjs` | Enforces: one row per lesson, no placeholder titles, compat columns present | ✅ |
| `.github/workflows/audit-db.yml` | Runs the audit daily / on `db/**` merges / on demand | ✅ |
| `scripts/check-migration-catalogue.mjs` | **Keeps THIS doc current** — fails if any `db/*.sql` file or `mobile_*` object isn't documented here | ✅ |
| `.github/workflows/check-catalogue.yml` | Runs the catalogue check daily + on every `db/**` / catalogue change (PR + merge) | ✅ |
| Repo secrets `AUDIT_USER_EMAIL` / `AUDIT_USER_PASSWORD` | Enable per-user audit checks | 🔒 |
| **Community audit checks** | Extend the audit for `mobile_posts`/`mobile_channels` (no dupes, active-only, author resolves) | ⚠️ add when feed ships |

## G. Re-import playbook (order of operations)

1. Import / refresh the production snapshot into Supabase (`public` schema).
2. **Preserve app-owned tables** (section B) — back up before, restore after, never drop.
3. Run section A group (i) — the app-owned table files — then group (ii) — the views + functions (order note above).
4. Confirm dashboard-only settings (section E).
5. Run the contract audit (section F) — regression fails CI, not the app.

## H. Rules & gotchas (must hold at migration time)

- **Additive views only.** Never rename/drop a column the live app reads; add the
  new name and keep the old as an alias until the app build using it ships to `main`.
  (Bit us once: portion_id→module_id, avatar→avatar_url, usage_score alias.)
- **Views change in lock-step with `main`.** The deployed app is whatever's on
  `main`; a view change that needs a matching app change must merge to `main`
  first (or together).
- **Deploy model.** GitHub Pages deploys only on push to `main`; feature branches
  aren't live. App code on a branch isn't live until merged.
- **Never write service_role into client code** — anon/publishable key only.
- **CREATE OR REPLACE can't change a column's type or drop columns** → use
  `DROP VIEW IF EXISTS` for reshaped views (hit this on `mobile_wheel_areas`).

---

### Status summary
Read/write SQL layer — content, insights, check-ins, wheel, favorites, community
feed, **chat (DMs + groups)**, **meetings/groups**, **video completions**, and the
**multi-board leaderboard** (points/streak/lessons/workshops/community/videos/check-ins):
**built ✅** (12 SQL files in section A, all validated).

Remaining before a fully-comprehensive migration: the reconciliation jobs
(section C, written at cutover); consolidating enum/emoji maps into the field
dictionary; the post-images bucket; community audit checks; and the badges/
Achievements + Hero Code layer (next build — will add its own app-owned
`mobile_*` reward-state if any, documented here when it lands).

> **Keep this current:** every new `db/*.sql` file or `mobile_*` object must be
> added to section A (run order) and — if it's an app-owned write table — to
> sections B (preserve) and C (reconcile). This catalogue is the migration bible.

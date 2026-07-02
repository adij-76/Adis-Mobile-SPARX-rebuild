# Final DB migration — documentation catalogue

The master, all-inclusive index of everything required to re-import / migrate the
production database and re-establish the mobile app's data layer on top of it —
**and** to eventually cut the mobile app over to writing the real production
tables (so mobile-created content reaches web users too).

Legend: ✅ exists · ⚠️ needs writing/updating at cutover · 🔒 dashboard-only (not SQL)

---

## A. SQL to re-run after every import (recreatable read/write layer)

Run in this order; all are idempotent.

| # | File | Creates | Status |
|---|------|---------|--------|
| 1 | `db/views.sql` | Catalog + per-user read views: `mobile_programs`, `mobile_modules`, `mobile_lessons`, `mobile_snippets`, `mobile_quotes`, `mobile_recommended_videos`, `mobile_use_tracking`, `mobile_wheel_areas`, `mobile_wheel_scores`, `mobile_leaderboard`, `mobile_assessments`, `mobile_me` | ✅ |
| 2 | `db/mobile-checkins.sql` | App-owned `mobile_checkins` table (RLS) | ✅ |
| 3 | `db/mobile-wheel-entries.sql` | App-owned `mobile_wheel_entries` table (RLS) | ✅ |
| 4 | `db/community.sql` | App-owned write tables: `mobile_feed_posts`, `mobile_feed_comments`, `mobile_feed_reactions`, `mobile_dm_conversations`, `mobile_dm_messages` | ✅ |
| 5 | `db/community-views.sql` | Community read views: `mobile_posts`, `mobile_comments`, `mobile_channels`, `mobile_notifications` (+ `mobile_threads`/`mobile_thread_messages` when chat lands) | ✅ (chat views ⚠️) |
| 6 | `db/auth-and-storage.sql` | Imports users into Supabase Auth (keeps passwords), avatars bucket + storage policies | ✅ |

> **Order note:** run the app-owned table files (2–4) **before** the view files
> (1, 5) — or re-run the views after — because the views splice in the app tables
> only when they already exist (guarded by `to_regclass`).

## B. App-owned data tables — PRESERVE on re-import ⚠️ (real user data)

These hold data the mobile app **wrote** (not recreatable). Back up + restore
across any re-import that recreates the `public` schema. A data-only import of the
production tables leaves them untouched.

- `mobile_checkins` — daily check-ins
- `mobile_wheel_entries` — Wheel of Life retakes
- `mobile_feed_posts` / `mobile_feed_comments` / `mobile_feed_reactions` — community feed
- `mobile_dm_conversations` / `mobile_dm_messages` — direct messages
- *(future)* notification read-state, block list

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
| `mobile_dm_conversations` | `community_conversations` | `app_user_id`→`user_one_id`, `other_user_id`→`user_two_id` |
| `mobile_dm_messages` | `community_messages` | `app_user_id`→`sender_id`, `conversation_ref`, `content`, `read_at` |

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
| Repo secrets `AUDIT_USER_EMAIL` / `AUDIT_USER_PASSWORD` | Enable per-user audit checks | 🔒 |
| **Community audit checks** | Extend the audit for `mobile_posts`/`mobile_channels` (no dupes, active-only, author resolves) | ⚠️ add when feed ships |

## G. Re-import playbook (order of operations)

1. Import / refresh the production snapshot into Supabase (`public` schema).
2. **Preserve app-owned tables** (section B) — back up before, restore after, never drop.
3. Run section A files 1–6 (order note above).
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
Read/write SQL layer for content, insights, check-ins, wheel, and community feed:
**built ✅.** Remaining before a fully-comprehensive migration: chat views
(`mobile_threads`), the reconciliation jobs (section C, written at cutover),
consolidating enum/emoji maps into the field dictionary, the post-images bucket,
and community audit checks.

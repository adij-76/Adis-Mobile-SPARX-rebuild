# Database layer — what it is, and why it's safe

We **never modify the production (Rails / igntd-main) database** — it's read-only.
We import a **copy** into Supabase and build a small **additive layer** on that
copy so the mobile app can read it. This folder is that layer, as code, so it
re-applies automatically after any fresh import instead of being re-typed by hand.

## "The SQL editor says these are destructive — I thought we weren't touching the DB?"

Two different things, worth separating clearly:

- **Production database:** untouched. We don't connect to it, alter it, or delete
  anything in it. That promise holds.
- **The Supabase copy:** yes — the whole plan is to *add* objects here (views, a
  storage bucket, and the auth-login records). That was always the approach; an
  app needs somewhere to read from. **Everything we add is additive — no
  production row or column is ever changed or deleted.**

Supabase's SQL editor shows a generic "destructive operation" banner whenever it
sees the keywords `DROP`, `ALTER`, `UPDATE`, `DELETE`, or `TRUNCATE` — it can't
tell that our `DROP` only drops *our own* view. Here's every flagged statement in
this folder and why each is safe:

| Statement | File | Why it's safe |
|-----------|------|---------------|
| `DROP VIEW IF EXISTS mobile_lessons` | views.sql | Drops *our own* view to recreate it with new columns. Postgres requires this when a view's column list changes. Cannot affect a base table. |
| `INSERT INTO auth.users / auth.identities` | auth-and-storage.sql | Adds login records in Supabase's **auth** schema (not your data tables). Guarded by `WHERE NOT EXISTS` — re-runs never duplicate. |
| `UPDATE auth.users` (metadata) | auth-and-storage.sql | Edits only the name/avatar keys on the **auth** record. Never touches `public.users`. |
| `INSERT INTO storage.buckets … ON CONFLICT` | auth-and-storage.sql | Creates the `avatars` bucket once. |
| `DROP POLICY IF EXISTS … ON storage.objects` | auth-and-storage.sql | Drops *our own* storage policies to recreate them. |

Note what is **not** in that list: there is no `ALTER TABLE`, no RLS toggle, and
no write of any kind to a production data table. (An earlier draft enabled RLS on
`public.users`; that's been removed — the views now self-scope by the signed-in
user's email instead, so no base table is altered at all.)

## The two files

| File | What it does | Touches |
|------|--------------|---------|
| `views.sql` | All `mobile_*` views the app reads (catalog + per-user progress/rating/favorite + `mobile_me` + wheel history). | Creates only our own views. **Zero** writes to any table. |
| `auth-and-storage.sql` | Imports existing users into Supabase Auth (keeping their passwords), re-syncs name/avatar, creates the `avatars` bucket. | Supabase `auth` schema + storage. Reads `public.users`, writes nothing back to it. |
| `field-dictionary.md` | The canonical name map: production column → `mobile_*` view column → app field. The one vocabulary the app **and** the future admin backend should share. | Reference only. |
| `introspect.sql` | One-shot schema dump (paste-back substitute for direct DB access). | Read-only. |

Run `views.sql` anytime — it's pure read-layer. Run `auth-and-storage.sql` when
you're doing the sign-in cutover. Both are **idempotent**: re-run them as often as
you like (after every re-import) and you land in the same place.

## Security model (why no row-level security on base tables)

Every per-user view filters internally on `auth.jwt() ->> 'email'`, so it returns
only the signed-in user's rows and anon callers get catalog data with no personal
fields. Because that filter lives *inside* the view, we don't need to enable RLS
on `public.users` or any other base table.

> **Base-table lockdown — DONE (`db/lockdown-base-tables.sql`).** The production
> tables were imported with Supabase's default grants, which gave the
> `anon`/`authenticated` API roles **ALL** privileges (read *and*
> INSERT/UPDATE/DELETE/TRUNCATE) on every table in `public`. Since PostgREST
> exposes those roles to anyone holding the public anon key (it ships in the app
> bundle), that meant an anonymous caller could read every user's row — including
> `users.encrypted_password` hashes and all substance-use/assessment data — and
> could even delete/truncate production tables. `db/lockdown-base-tables.sql`
> revokes that access and re-grants **only** the `mobile_*` surface the app uses.
> The self-scoping views keep working because they run with their owner's
> privileges, not the caller's. **This must be re-run after every re-import** — a
> re-import recreates the tables and Supabase re-applies the permissive default
> grants, silently re-exposing everything (see the playbook below). CI guards it:
> `audit-db-contract.mjs` fails if `anon` can read `public.users` again.

## Contract invariants (audited automatically)

These are the rules the `mobile_*` views must always satisfy. They're enforced by
`scripts/audit-db-contract.mjs` via the **Audit DB contract** workflow, which runs
daily, on every merge that touches `db/**`, and on demand — so a regression fails
CI instead of reaching the app.

1. **Lesson structure is canonical, not per-user.** `mobile_lessons` returns
   exactly ONE row per lesson, sourced from `lessons`/`portions`. Per-user data
   (progress, rating, favorite) is attached as single-value **scalar subqueries**,
   never `JOIN`s — because `completed_lessons` / `lesson_ratings` / `favorites`
   have many rows per (lesson, user), and joining them multiplies the lesson into
   duplicates. Rating a lesson 3× must never list it 3×.
2. **No placeholder titles.** `mobile_recommended_videos.title` is never empty and
   never the literal "No description available" (a real value in prod `description`).
3. **Views evolve additively.** Renamed columns keep their old names as aliases
   until the app build on `main` uses the new ones (see the additive-views rule
   above). The audit selects both canonical + legacy columns and fails if any is
   missing.

To enable the per-user checks (title/gating/identity), set repo secrets
`AUDIT_USER_EMAIL` / `AUDIT_USER_PASSWORD` to a dedicated audit account.

## App-owned data tables (NOT views) — preserve on re-import ⚠️

Two files create real tables the app **writes user data to**, unlike the
`mobile_*` views which are recreatable read layers:

- `db/mobile-checkins.sql` → **`public.mobile_checkins`** (daily check-ins).
- `db/mobile-wheel-entries.sql` → **`public.mobile_wheel_entries`** (Wheel of
  Life retakes — one row per area, score 0-100).

Both carry the same two consequences for a production re-import:

1. **Do not drop them.** If a re-import recreates the `public` schema, back up and
   restore both tables (they hold real user data). A data-only import of the
   production tables leaves them untouched.
2. **Reconcile with production.** This data lives only in the app-owned tables
   today. When the final DB comes over, run a one-time sync into production:
   - `mobile_checkins` → `daily_assessments` (each row carries `app_user_id` +
     `date` for the mapping).
   - `mobile_wheel_entries` → `wheel_of_life_scores` (each row carries
     `app_user_id` + `life_area_id` + `taken_at`; note the app score is 0-100 and
     production is 0-10, so divide by 10 on the way in).

   After the sync the app can read/write the production tables directly and the
   app-owned tables become caches (or are retired). Until then they are the
   source of truth for mobile check-ins and wheel retakes.

## Re-import playbook

1. Import / refresh the production snapshot into Supabase (`public` schema).
2. Run `db/views.sql`, `db/auth-and-storage.sql`, `db/mobile-checkins.sql`, and
   `db/mobile-wheel-entries.sql`. (Run the two app-owned-table files *before*
   `views.sql`, or re-run `views.sql` after — `mobile_wheel_areas` only unions in
   `mobile_wheel_entries` when that table already exists.)
3. **Run `db/lockdown-base-tables.sql`** — REQUIRED. A re-import recreates the
   base tables with Supabase's permissive default grants, re-exposing every
   production table (incl. password hashes) to the anon key until this is re-run.
   Run it **last**, after the views/tables exist, so the re-grants land on them.
   Then run the verify block at the bottom of that file (anon must not read
   `users`; authenticated must still read `mobile_me`).
4. **Preserve `mobile_checkins` + `mobile_wheel_entries` data** (see the ⚠️ note
   above) — never drop them.
5. Confirm the dashboard-only settings below (a data import never changes them).

## Dashboard-only settings (not SQL — set once, survive re-import)

- **Auth → Providers:** enable Google / Apple / Facebook + OAuth client id/secret.
- **Auth → URL Configuration → Redirect URLs:** add the deployed web origin and
  `http://localhost:8081` for local dev.
- **Repo / build variables:** `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon/publishable key only — never service_role).

## Getting schema to the assistant

This environment's egress policy blocks the Supabase host, so the assistant can't
read the DB directly. `introspect.sql` is the substitute: run it, paste the JSON
back, and the layer can be regenerated from it. Keep pastes small (scope to a few
tables) — the chat UI can choke on very large pastes.

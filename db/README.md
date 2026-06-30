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

Run `views.sql` anytime — it's pure read-layer. Run `auth-and-storage.sql` when
you're doing the sign-in cutover. Both are **idempotent**: re-run them as often as
you like (after every re-import) and you land in the same place.

## Security model (why no row-level security on base tables)

Every per-user view filters internally on `auth.jwt() ->> 'email'`, so it returns
only the signed-in user's rows and anon callers get catalog data with no personal
fields. Because that filter lives *inside* the view, we don't need to enable RLS
on `public.users` or any other base table.

> **Separate hardening note (your decision, not done here):** if the production
> tables were imported *without* row-level security, the `anon`/`authenticated`
> API roles may be able to read base tables (e.g. `GET /rest/v1/users`) directly
> via PostgREST, independent of our views. That's a pre-existing property of the
> imported copy, not something these files create. Locking it down (enable RLS on
> sensitive tables, or restrict the API to the `mobile_*` views only) is a
> deliberate security step worth doing before launch — flag it when you're ready
> and we'll scope it carefully.

## Re-import playbook

1. Import / refresh the production snapshot into Supabase (`public` schema).
2. Run `db/views.sql`, then `db/auth-and-storage.sql`.
3. Confirm the dashboard-only settings below (a data import never changes them).

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

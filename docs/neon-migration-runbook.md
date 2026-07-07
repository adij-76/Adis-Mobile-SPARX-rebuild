# Neon + Cloudflare migration runbook

How we move SPARx off Supabase onto **Neon** (Postgres) + **Cloudflare** (frontend),
import the **full** legacy database so **existing users keep all their data**, and
sunset the old Rails app.

> Companion to `docs/backend-strategy.md` (why) and `docs/db-migration-catalogue.md`
> (the `mobile_*` layer + reconcile map). This is the how.

---

## 0. End state

- **Neon** — one Postgres holding the **complete** legacy Rails DB (all history) +
  the app-owned `mobile_*` layer.
- **Cloudflare** — Pages (static frontend) + optionally R2 (file storage) / Workers.
- The **app replaces Rails**; **all users migrated with no data loss**; Rails
  decommissioned.

## What replaces each Supabase service

Supabase bundles four things a bare Neon Postgres doesn't. Each needs a home:

| Supabase gives us | Replacement on Neon/Cloudflare | Notes |
|---|---|---|
| Managed Postgres | **Neon** | Standard Postgres — schema/data/`mobile_*` port unchanged |
| Auto REST API (PostgREST) | **Self-hosted PostgREST** | Preserves the app's existing REST adapter almost 1:1 |
| Auth (GoTrue) incl. Google OAuth | **Self-hosted GoTrue** (recommended) | Keeps the exact JWT/RLS model *and* can import bcrypt passwords |
| File storage | **Cloudflare R2** (or S3) | Avatars |
| Frontend host (GitHub Pages today) | **Cloudflare Pages** | Custom domain, SPA routing, previews |

## The one deep technical dependency: `auth.uid()` / `auth.jwt()`

The `mobile_*` layer references **`auth.uid()` 95×** and **`auth.jwt()` 30×** across
20 SQL files (RLS policies + `SECURITY DEFINER` functions). These are provided by
**Supabase's auth**, not plain Postgres.

- **If we self-host GoTrue** (recommended): GoTrue installs the same `auth` schema +
  helpers, so the layer runs **unchanged**.
- **If we use a different auth provider**: recreate small shims (we already proved
  these in the local test harness):
  ```sql
  create schema if not exists auth;
  create or replace function auth.jwt() returns jsonb language sql stable
    as $$ select coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb $$;
  create or replace function auth.uid() returns uuid language sql stable
    as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  create or replace function auth.role() returns text language sql stable
    as $$ select coalesce(auth.jwt() ->> 'role', 'anon') $$;
  ```
  PostgREST sets `request.jwt.claims` per request exactly like Supabase, so with
  these shims RLS + every function keeps working.

---

## Preserving existing users' data (the core requirement)

This is the whole point, so here's precisely how nobody loses anything:

1. **Import the FULL Heroku DB — not the truncated 2026 copy.** A complete
   `pg_dump` of the live Heroku Postgres restored into Neon brings over **all**
   legacy tables with full history: `users`, `user_points`, `completed_lessons`,
   `answer_headers`/`answers`, `comm_posts`, `daily_assessments`, everything.
2. **Import users into the auth system keyed by email.** Each legacy `users` row
   becomes an auth account (same email). *Decision: migrate password hashes so they
   keep their password, or send a one-time reset — see Decisions §2.*
3. **The app already resolves legacy data by email.** `mobile_me` and the
   `mobile_*` views link a signed-in user to their prod `users` row via email →
   `app_user_id`. So an existing user logs in and **immediately sees their full
   history** — lessons, points, assessments, posts.
4. **Mobile activity flows back too.** The `reconcile.sql` jobs materialize every
   `mobile_*` table into its prod destination (catalogue §C), so anything created
   in the app (check-ins, XP, posts, completions, exercise answers) lands in the
   real tables as well.
5. **Net: zero data loss in both directions.** Existing users keep their web
   history; new mobile users' data merges into the same tables; after cutover the
   real tables are the single source of truth.

> Note: the Supabase DB we develop on is a **truncated copy** (2026 only). It is
> **not** the migration source — the migration pulls a **fresh full dump from
> Heroku** at cutover time.

---

## Phases

### Phase 0 — Prereqs & accounts
- Create **Neon** (Business plan + **BAA** if HIPAA is required — see Decisions §6).
- Create **Cloudflare** (Pages + R2 if using).
- Decide the auth approach (Decisions §1–2).
- Announce a change-freeze window for the cutover.

### Phase 1 — Neon bootstrap (rehearse on a branch)
- Provision Neon; create a **branch** to trial the whole flow non-destructively.
- Install the `auth` schema (GoTrue, or the shims above).
- **Full import:** `pg_dump` the live Heroku DB → `pg_restore` into the Neon branch.
  ```bash
  pg_dump "$HEROKU_DATABASE_URL" -Fc -f legacy-full.dump
  pg_restore --no-owner --no-privileges -d "$NEON_POOLED_URL" legacy-full.dump
  ```
- Apply the `mobile_*` layer: run `db/apply-order.txt` on Neon (pure Postgres).
- **Verify:** row counts match Heroku; every `mobile_*` view/function resolves;
  RLS behaves; spot-check a few real users' data.

### Phase 2 — Auth
- Stand up **GoTrue** against Neon (or the chosen provider).
- **Import users by email** from the legacy `users` table (+ password hashes if
  migrating — GoTrue accepts bcrypt).
- Reconfigure **Google OAuth** (new project/redirect URLs for the new domain).
- Verify: an existing user logs in and sees their correct legacy data; a Google
  user logs in; a brand-new signup works.

### Phase 3 — API layer
- Deploy **PostgREST** (Fly.io / a small VM / container) pointed at Neon's
  **pooled** endpoint (Neon has built-in pooling; add PgBouncer only if needed).
- Point a **preview build** of the app at it; smoke-test the main flows.

### Phase 4 — Storage
- Migrate avatars to **R2/S3**; update the upload endpoints in the adapter.

### Phase 5 — Frontend to Cloudflare
- Repoint the app adapter's base URL + keys at the new API/auth.
- Deploy to **Cloudflare Pages**; set **custom domain**; base path → `/` (drop the
  GitHub Pages subpath); add the SPA `_redirects` (`/* /index.html 200`).
- Update **OAuth redirect URLs** (auth provider + Google) to the new domain.

### Phase 6 — Reconcile app data into the real tables
- Run `db/reconcile.sql` (reviewed, transactional) so all `mobile_*` activity
  lands in the prod tables. Inspect the `RAISE NOTICE` counts before committing.

### Phase 7 — Full dry-run
- On the Neon trial branch, do an end-to-end rehearsal with the real full data:
  login as a legacy user, verify history; do app actions; run reconcile; confirm.

### Phase 8 — Production cutover (maintenance window)
- **Freeze** writes on Rails (maintenance page).
- Take a **final full Heroku dump** (captures the latest delta) → restore to the
  primary Neon (or promote the rehearsed branch + apply the delta).
- Run `reconcile.sql`.
- Flip DNS / config to the Cloudflare app + Neon API.
- **Smoke test** (login, history, new action, leaderboard).
- Open to users.

### Phase 9 — Sunset Rails
- Keep Heroku **read-only** as a rollback safety net for an agreed window.
- Monitor error rates + data integrity.
- Decommission Heroku when confident.

---

## Data-loss safeguards (non-negotiable)
- **Full backup before every destructive step** (Heroku dump + Neon snapshot).
- **Rehearse on a Neon branch** before touching the primary.
- **Keep Heroku read-only post-cutover** as instant rollback.
- **Reconciliation report:** row counts + spot-checks before and after each import.
- Cutover only after a **clean full dry-run**.

---

## Decisions to confirm (these shape the plan)

1. **Auth provider** — self-hosted **GoTrue** (recommended: keeps the JWT/RLS model
   and imports bcrypt) vs a managed provider (Clerk/Auth0, more rework).
2. **Password migration** — import legacy password **hashes** (users keep their
   password) vs a one-time **reset email** at cutover. *Depends on the legacy hash
   scheme (Rails Devise = bcrypt, which GoTrue can import).*
3. **API** — self-hosted **PostgREST** (recommended: preserves the adapter) vs a
   custom API.
4. **Long-term data model** — keep the **`mobile_*` shadow layer + reconcile**
   (safe, current design) vs eventually transition the app to **write directly** to
   the real tables (cleaner once Rails is gone, bigger change). Recommend:
   reconcile at cutover, decide direct-write later.
5. **Cutover style** — **big-bang** maintenance window (simplest for a full-data
   move) vs phased dual-run.
6. **Compliance** — is a **HIPAA BAA** required at launch? (Neon Business offers
   one.) This gates the Neon plan + timing.

---

_Open the corresponding build tasks once the decisions above are set. The `mobile_*`
layer is already plain-Postgres portable (recent leaderboard + completions work
removed the last legacy-table dependencies), so the app side is largely a
config/adapter repoint, not a rewrite._

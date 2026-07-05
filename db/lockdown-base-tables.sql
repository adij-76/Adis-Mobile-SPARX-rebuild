-- =============================================================================
-- SPARx mobile layer — BASE-TABLE LOCKDOWN (pre-launch hardening)
--
-- WHY THIS EXISTS
--   The production tables were imported into Supabase with the default grants
--   Supabase gives new tables: the `anon` and `authenticated` API roles held
--   ALL privileges (SELECT + INSERT/UPDATE/DELETE/TRUNCATE) on every table in
--   `public`. Because PostgREST exposes those roles to anyone holding the public
--   anon key (which ships in the client bundle), that meant an ANONYMOUS caller
--   could read every user's row — including `users.encrypted_password` bcrypt
--   hashes and all substance-use / assessment data — and could even DELETE or
--   TRUNCATE production tables. Confirmed via information_schema.role_table_grants.
--
--   This file revokes that access and re-grants ONLY the `mobile_*` surface the
--   app actually uses. It does NOT alter, drop, or write to any production table
--   or row — it only changes GRANTs (who may read/write), which is reversible.
--
-- WHY IT'S SAFE FOR THE VIEWS
--   The `mobile_*` views are ordinary (NOT `security_invoker`) views owned by the
--   role that created them, so they read the base tables with the OWNER's
--   privileges. Revoking base-table access from anon/authenticated therefore does
--   NOT break the views — the whole "self-scoping view" security model keeps
--   working. (This is the same model documented in db/views.sql.)
--
-- IDEMPOTENT: re-run anytime / after every re-import. Supabase re-grants default
--   privileges to anon/authenticated whenever tables are (re)created, so a
--   production re-import RE-EXPOSES the base tables until this file is re-run.
--   It is therefore a required step in the re-import playbook (see db/README.md).
--
-- VERIFY (run after; anon must NOT be able to read users, authenticated must be
--   able to read its own mobile_me and write its own check-ins):
--     select
--       has_table_privilege('anon','public.users','SELECT')              as anon_read_users,       -- false
--       has_table_privilege('anon','public.users','DELETE')              as anon_delete_users,     -- false
--       has_table_privilege('authenticated','public.users','SELECT')     as authed_read_users,     -- false
--       has_table_privilege('authenticated','public.mobile_me','SELECT') as authed_read_me,        -- true
--       has_table_privilege('authenticated','public.mobile_checkins','INSERT') as authed_write_ci; -- true
--   And from outside Postgres, with the anon key:
--     curl -s "$SUPABASE_URL/rest/v1/users?select=id&limit=1" -H "apikey: $ANON"
--   must return a permission error, not a row.
-- =============================================================================

begin;

-- 1. Strip ALL privileges from the two client-facing roles on every current
--    table/view in public. postgres + service_role (server-side only) keep theirs.
revoke all privileges on all tables in schema public from anon, authenticated;

-- 2. Belt-and-suspenders: also stop FUTURE tables (e.g. a later re-import that
--    recreates them, or new app-owned tables) from auto-granting to these roles.
--    Applies to objects created by the roles that own the schema's tables.
alter default privileges in schema public revoke all on tables from anon, authenticated;
do $$
begin
  -- Supabase-owned creator roles: harmless if a role doesn't exist here.
  execute 'alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated';
exception when undefined_object then null;
end $$;

-- 3. Re-grant ONLY the mobile_* surface (mirrors db/views.sql,
--    db/mobile-checkins.sql, db/mobile-wheel-entries.sql). Keep this in sync with
--    those files' grant statements when views are added/changed.

-- 3a. Catalog views (safe for anon browse — no per-user data).
grant select on mobile_programs, mobile_modules, mobile_lessons, mobile_snippets, mobile_quotes
  to anon, authenticated;

-- 3b. Per-user read views (self-scoped by auth email inside the view).
grant select on
  mobile_recommended_videos,
  mobile_use_tracking,
  mobile_wheel_areas,
  mobile_wheel_scores,
  mobile_leaderboard,
  mobile_assessments,
  mobile_me
  to authenticated;

-- 3c. App-owned write tables (RLS-protected; the grant restores the table-level
--     privilege the blanket revoke removed — the row filter stays enforced by RLS).
grant select, insert, update on public.mobile_checkins      to authenticated;
grant select, insert         on public.mobile_wheel_entries to authenticated;

commit;

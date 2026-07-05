-- =============================================================================
-- SPARx mobile layer — BASE-TABLE LOCKDOWN (pre-launch hardening)   [runs LAST]
--
-- WHY THIS EXISTS
--   The production tables were imported into Supabase with the default grants
--   Supabase gives new tables: the `anon` and `authenticated` API roles held
--   FULL privileges — read AND INSERT/UPDATE/DELETE/TRUNCATE — on every table in
--   `public`. Because PostgREST exposes those roles to anyone holding the public
--   anon key (which ships in the client bundle), that meant an ANONYMOUS caller
--   could read every user's row — including `users.encrypted_password` bcrypt
--   hashes and all substance-use / assessment data — and could even DELETE or
--   TRUNCATE production tables. (Confirmed via information_schema.role_table_grants.)
--
-- WHAT THIS DOES
--   Strips `anon` + `authenticated` access from every NON-`mobile_` object in
--   `public` — i.e. the production base tables — and leaves the ENTIRE `mobile_*`
--   surface (the views + app-owned tables that the other db/*.sql files already
--   grant) completely untouched. It therefore CANNOT break the app's data
--   surface, and needs no re-grants of its own. It does not alter, drop, or write
--   to any production table or row — it only changes GRANTs, which is reversible.
--
-- ORDERING — RUN LAST
--   This is the final entry in `db/apply-order.txt`, so it runs after every
--   view/table/function exists and has been granted. New base tables from a
--   future re-import are caught automatically (no hand-maintained list).
--
-- WHY THE SELF-SCOPING VIEWS KEEP WORKING
--   The `mobile_*` views are ordinary (NOT `security_invoker`) views owned by the
--   role that created them, so they read base tables with their OWNER's
--   privileges, not the caller's. Revoking base-table access from
--   anon/authenticated does not change what the views can read.
--
-- IDEMPOTENT: re-run anytime / after every re-import. A re-import recreates the
--   base tables and Supabase re-applies the permissive default grants, so this
--   file is a REQUIRED step of every import (see db/README.md re-import playbook).
--   CI guards it: scripts/audit-db-contract.mjs fails if `anon` can read
--   `public.users` again.
--
-- VERIFY (anon must NOT read a base table; authenticated must still read its own
--   mobile_me and write its own check-ins):
--     select
--       has_table_privilege('anon','public.users','SELECT')              as anon_read_users,   -- false
--       has_table_privilege('anon','public.users','DELETE')              as anon_delete_users, -- false
--       has_table_privilege('authenticated','public.users','SELECT')     as authed_read_users, -- false
--       has_table_privilege('authenticated','public.mobile_me','SELECT') as authed_read_me,    -- true
--       has_table_privilege('authenticated','public.mobile_checkins','INSERT') as authed_write; -- true
--   And from outside Postgres, with the anon key, this must return a permission
--   error (not a row):
--     curl -s "$SUPABASE_URL/rest/v1/users?select=id&limit=1" -H "apikey: $ANON"
-- =============================================================================

begin;

-- 1. Revoke anon + authenticated from every production object — everything in
--    `public` NOT named `mobile_*`. Covers tables, plain views, and materialized
--    views. The `mobile_*` surface is skipped entirely, so the app is unaffected.
do $lockdown$
declare r record;
begin
  for r in
    select format('%I.%I', schemaname, tablename) as obj
      from pg_tables     where schemaname = 'public' and tablename    not like 'mobile\_%'
    union all
    select format('%I.%I', schemaname, viewname)
      from pg_views      where schemaname = 'public' and viewname     not like 'mobile\_%'
    union all
    select format('%I.%I', schemaname, matviewname)
      from pg_matviews   where schemaname = 'public' and matviewname  not like 'mobile\_%'
  loop
    execute format('revoke all privileges on %s from anon, authenticated', r.obj);
  end loop;
end
$lockdown$;

-- 2. Stop FUTURE tables (a later re-import, or a new base table created by the
--    schema owner) from auto-granting to these roles. The mobile_* files grant
--    their own objects explicitly, so this only affects otherwise-ungranted tables.
alter default privileges in schema public revoke all on tables from anon, authenticated;
do $dp$
begin
  execute 'alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated';
exception when undefined_object then null;   -- creator role name differs on some projects
end
$dp$;

commit;

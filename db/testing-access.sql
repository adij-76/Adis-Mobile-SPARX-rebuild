-- =============================================================================
-- Testing-period access (July 2026).
--
-- We're inviting people to try the app for the month of July. Two rules:
--   • EXISTING users (an email already in production `users`) are UNAFFECTED —
--     they keep exactly their historical role and entitlements.
--   • NEW users (an authenticated email with NO production `users` row) get an
--     all-access experience while the window is open, so they can experiment
--     with the whole app.
--
-- This is purely additive: it only ever GRANTS access to callers who currently
-- have none (no prod row). It never changes what an existing user can see. Turn
-- it off after testing by editing the date in mobile_testing_open() (or dropping
-- these two functions and re-running the views).
--
--   mobile_testing_open()   — true while the testing window is open.
--   mobile_is_new_tester()  — true for an authenticated caller with NO prod
--                             users row, while the window is open.
--
-- Used by mobile_me, mobile_lessons, mobile_recommended_videos (db/views.sql)
-- and mobile_groups (db/groups.sql) — so this file MUST run BEFORE them.
-- =============================================================================

create or replace function public.mobile_testing_open()
  returns boolean
  language sql
  stable
as $$
  select now() < timestamptz '2026-08-01 00:00:00-07'   -- open through July 2026 (PT)
$$;
grant execute on function public.mobile_testing_open() to authenticated;

-- SECURITY DEFINER so it can check public.users for the caller (the authenticated
-- role has no direct select on the base table). Mirrors public.mobile_uid().
create or replace function public.mobile_is_new_tester()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select (auth.jwt() ->> 'email') is not null
     and public.mobile_testing_open()
     and not exists (
       select 1 from public.users u
       where lower(u.email) = lower(auth.jwt() ->> 'email')
     )
$$;
grant execute on function public.mobile_is_new_tester() to authenticated;

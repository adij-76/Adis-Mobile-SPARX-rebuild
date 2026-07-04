-- =============================================================================
-- Testing-period access via a "Mobile Tester" role (July 2026).
--
-- Instead of scattering "unknown user → unlock everything" rules across the
-- views, we model a single ROLE. Access is attached to that one role, so when
-- testing ends the role simply resolves to nobody and its access evaporates —
-- no per-view permission edits.
--
--   mobile_testing_open()     — true while the testing window is open.
--   mobile_tester_role_id()   — the id of the "Mobile Tester (July 2026)" role
--                               (negative so it can NEVER collide with a real
--                               subscription_roles.id).
--   mobile_effective_role_id()— the caller's role: their real
--                               users.subscription_role_id if they exist in
--                               production, else the tester role while the
--                               window is open, else NULL.
--   mobile_is_tester()        — true when the caller currently holds the tester
--                               role (a July enrollee with no prod users row).
--
-- WHO IT AFFECTS
--   • Existing users (email in production `users`) are UNTOUCHED — they always
--     resolve to their real role, even if that role is NULL. They never become
--     testers.
--   • New enrollees (authenticated, no prod row) hold the tester role while the
--     window is open, which the views treat as all-access.
--
-- DATA IS AUTH-KEYED, NOT ROLE-KEYED
--   Everything a tester creates lives in the app-owned mobile_* tables keyed by
--   auth.uid(), independent of this role. So a tester who later subscribes keeps
--   ALL their July data — they log in with the same account (same auth.uid()),
--   and once a real `users` row exists for their email they simply resolve to a
--   real role. (Optional: backfill app_user_id on their rows to tie the data to
--   the new prod id — see db/README.md / the migration catalogue.)
--
-- TEARDOWN
--   Close the window in mobile_testing_open() (or drop these functions and re-run
--   the views). The tester role then resolves to nobody; access ends cleanly.
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

create or replace function public.mobile_tester_role_id()
  returns integer
  language sql
  immutable
as $$
  select -100   -- sentinel; negative so it can never collide with a real role id
$$;
grant execute on function public.mobile_tester_role_id() to authenticated;

-- SECURITY DEFINER so it can read public.users for the caller (the authenticated
-- role has no direct select on the base table). Mirrors public.mobile_uid().
create or replace function public.mobile_effective_role_id()
  returns integer
  language sql
  stable
  security definer
  set search_path = public
as $$
  select case
    -- Existing user → their real role (may be NULL; they NEVER become a tester).
    when exists (
      select 1 from public.users u
      where lower(u.email) = lower(auth.jwt() ->> 'email')
    ) then (
      select u.subscription_role_id from public.users u
      where lower(u.email) = lower(auth.jwt() ->> 'email') limit 1
    )
    -- New enrollee, authenticated, window open → the tester role.
    when (auth.jwt() ->> 'email') is not null and public.mobile_testing_open()
      then public.mobile_tester_role_id()
    else null
  end
$$;
grant execute on function public.mobile_effective_role_id() to authenticated;

create or replace function public.mobile_is_tester()
  returns boolean
  language sql
  stable
as $$
  select coalesce(public.mobile_effective_role_id() = public.mobile_tester_role_id(), false)
$$;
grant execute on function public.mobile_is_tester() to authenticated;

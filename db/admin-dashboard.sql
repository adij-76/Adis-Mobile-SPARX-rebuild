-- =============================================================================
-- Admin dashboard helpers — "who's signing up as we test".
--
-- mobile_admin_signups(days) → one row per Supabase auth user created in the last
-- `days`, with their onboarding + whether they're a new vs. existing (prod) user.
-- SERVER-SIDE ONLY (reads auth.users + PII): execute granted to service_role,
-- revoked from anon/authenticated. Query it from the Supabase SQL editor.
--
--   select * from mobile_admin_signups(7);                       -- last 7 days, detailed
--   select count(*) from mobile_admin_signups(3);                -- how many in 3 days
--   select signed_up_at::date d, count(*)                        -- per-day trend
--   from mobile_admin_signups(30) group by 1 order by 1 desc;
-- =============================================================================

create or replace function public.mobile_admin_signups(p_days integer default 30)
  returns table(
    email            text,
    signed_up_at     timestamptz,
    onboarded_at     timestamptz,
    primary_problem  text,
    is_existing_user boolean,
    kind             text
  )
  language sql stable security definer set search_path = public as $$
  select au.email,
         au.created_at as signed_up_at,
         ob.completed_at as onboarded_at,
         (select a.title from public.addictions a
           where ob.primary_problem is not null and a.id = ob.primary_problem::int) as primary_problem,
         exists (select 1 from public.users u where lower(u.email) = lower(au.email)) as is_existing_user,
         case when exists (select 1 from public.users u where lower(u.email) = lower(au.email))
              then 'existing' else 'new' end as kind
  from auth.users au
  left join public.mobile_onboarding_profile ob on ob.auth_uid = au.id
  where au.created_at > now() - make_interval(days => p_days)
  order by au.created_at desc
$$;

revoke all on function public.mobile_admin_signups(integer) from public, anon, authenticated;
grant execute on function public.mobile_admin_signups(integer) to service_role;

-- =============================================================================
-- In-app admin backend — callable from the app with the signed-in user's JWT
-- (anon key + Bearer token), but every function is gated to an allowlist so a
-- normal member gets nothing. This is the seam a hidden /admin screen reads.
--
-- Why not reuse mobile_admin_signups()? That one is service_role only (never
-- reachable from the client) and is dominated by the one-time auth-import batch
-- (every legacy user shares the import timestamp). The functions here focus on
-- the real "who is actually using the app as we test" signal — onboarding +
-- logged activity — and are safe to call from the authenticated client.
-- =============================================================================

-- Allowlist of admin emails. RLS-locked + grants revoked, so it is ONLY ever
-- read through the SECURITY DEFINER helpers below (which run as owner and
-- bypass RLS). Seed real admins here.
create table if not exists public.mobile_admins (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.mobile_admins enable row level security;
revoke all on table public.mobile_admins from public, anon, authenticated;
insert into public.mobile_admins (email) values ('adijaffe@gmail.com')
  on conflict (email) do nothing;

-- Is the current caller (by JWT email) an admin?
create or replace function public.mobile_is_admin()
  returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.mobile_admins a
    where lower(a.email) = lower(nullif(auth.jwt() ->> 'email', ''))
  )
$$;
revoke all on function public.mobile_is_admin() from public;
grant execute on function public.mobile_is_admin() to anon, authenticated, service_role;

-- One JSON payload powering the admin screen. Non-admins get a hard error
-- (never a partial leak). Read-only.
create or replace function public.mobile_admin_overview(p_days integer default 30)
  returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.mobile_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  with
  -- everyone who has actually DONE something in the mobile app
  activity as (
    select auth_uid from public.mobile_checkins
    union
    select auth_uid from public.mobile_xp_events
    union
    select auth_uid from public.mobile_assessment_responses
    union
    select auth_uid from public.mobile_feed_posts
  ),
  active as (
    select a.auth_uid,
           coalesce((select count(*) from public.mobile_checkins x where x.auth_uid = a.auth_uid), 0) as checkins,
           coalesce((select count(*) from public.mobile_xp_events x where x.auth_uid = a.auth_uid), 0) as xp_events,
           coalesce((select count(*) from public.mobile_assessment_responses x where x.auth_uid = a.auth_uid), 0) as assessments,
           coalesce((select count(*) from public.mobile_feed_posts x where x.auth_uid = a.auth_uid), 0) as posts,
           greatest(
             coalesce((select max(created_at) from public.mobile_checkins x where x.auth_uid = a.auth_uid), 'epoch'::timestamptz),
             coalesce((select max(created_at) from public.mobile_xp_events x where x.auth_uid = a.auth_uid), 'epoch'::timestamptz),
             coalesce((select max(taken_at)   from public.mobile_assessment_responses x where x.auth_uid = a.auth_uid), 'epoch'::timestamptz),
             coalesce((select max(created_at) from public.mobile_feed_posts x where x.auth_uid = a.auth_uid), 'epoch'::timestamptz)
           ) as last_activity
      from activity a
      where a.auth_uid is not null
  ),
  active_rows as (
    select au.email,
           ob.completed_at as onboarded_at,
           (exists (select 1 from public.users u where lower(u.email) = lower(au.email))) as is_existing,
           act.checkins, act.xp_events, act.assessments, act.posts, act.last_activity
      from active act
      join auth.users au on au.id = act.auth_uid
      left join public.mobile_onboarding_profile ob on ob.auth_uid = act.auth_uid
     order by act.last_activity desc nulls last
  )
  select jsonb_build_object(
    'generated_for', auth.jwt() ->> 'email',
    'window_days', p_days,
    'totals', jsonb_build_object(
      'auth_users',    (select count(*) from auth.users),
      'prod_users',    (select count(*) from public.users),
      'mobile_first',  (select count(*) from auth.users au
                         where not exists (select 1 from public.users u where lower(u.email) = lower(au.email))),
      'onboarded',     (select count(*) from public.mobile_onboarding_profile where completed_at is not null),
      'active_testers',(select count(*) from active)
    ),
    -- signups in-window, per day (note: the import cohort shares one day)
    'signups_by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'count', n) order by d desc)
      from (select created_at::date d, count(*) n from auth.users
            where created_at > now() - make_interval(days => p_days)
            group by 1) s), '[]'::jsonb),
    -- the real story: who's exercising the app
    'active_testers', coalesce((
      select jsonb_agg(to_jsonb(r)) from active_rows r), '[]'::jsonb)
  ) into result;

  return result;
end
$$;
revoke all on function public.mobile_admin_overview(integer) from public;
grant execute on function public.mobile_admin_overview(integer) to authenticated, service_role;

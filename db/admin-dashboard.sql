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

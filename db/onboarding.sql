-- =============================================================================
-- Onboarding profile + community/group audience gating.
--
-- Mirrors the production intake (profiles.id 163 → users columns) into an
-- app-owned table so new users (who have no production `users` row yet) can be
-- onboarded and gated. At cutover this reconciles 1:1 to the real columns:
--   birth_date → users.birth_date · gender → users.gender · orientation →
--   users.identify · race → users.race · primary_problem → users.addiction(_id)
--   · secondary_problems → users.secondary_addictions.
--
--   mobile_onboarding_profile — one row per user (auth_uid), RLS.
--   mobile_group_audience     — admin map: which gender/age each group is for.
--   mobile_my_gender/age/is_adult/onboarded — caller demographics helpers.
--   mobile_group_audience_ok(group) — the gate used by mobile_groups.
--
-- Existing users (a real `users` row) are NEVER audience-gated here — they keep
-- their current role-based access. Audience gating applies to onboarded new
-- users, matching their profile's gender/age to a group's audience.
-- Run BEFORE groups.sql (mobile_groups calls mobile_group_audience_ok). Idempotent.
-- =============================================================================

create table if not exists public.mobile_onboarding_profile (
  auth_uid           uuid        primary key default auth.uid(),
  app_user_id        integer,                                  -- production users.id (cutover)
  birth_date         date,                                     -- → users.birth_date
  gender             text,                                     -- male|female|nonbinary|self|undisclosed → users.gender
  gender_self        text,                                     -- free text when gender='self'
  orientation        text,                                     -- → users.identify
  race               text,                                     -- → users.race (optional)
  primary_problem    text,                                     -- addictions key → users.addiction(_id)
  secondary_problems text[]      not null default '{}',        -- → users.secondary_addictions
  accepted_terms_at  timestamptz,
  completed_at       timestamptz,                              -- onboarding finished
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.mobile_onboarding_profile enable row level security;
drop policy if exists mobile_onboarding_profile_select on public.mobile_onboarding_profile;
create policy mobile_onboarding_profile_select on public.mobile_onboarding_profile
  for select to authenticated using (auth_uid = auth.uid());
drop policy if exists mobile_onboarding_profile_insert on public.mobile_onboarding_profile;
create policy mobile_onboarding_profile_insert on public.mobile_onboarding_profile
  for insert to authenticated with check (auth_uid = auth.uid());
drop policy if exists mobile_onboarding_profile_update on public.mobile_onboarding_profile;
create policy mobile_onboarding_profile_update on public.mobile_onboarding_profile
  for update to authenticated using (auth_uid = auth.uid()) with check (auth_uid = auth.uid());
grant select, insert, update on public.mobile_onboarding_profile to authenticated;

-- Admin-populated map: which audience each coaching group / community is for.
-- Unmapped groups are open to everyone ('any'). Admins set this in the SQL editor.
create table if not exists public.mobile_group_audience (
  sds_group_id    bigint primary key,
  audience_gender text not null default 'any',   -- men | women | any
  audience_age    text not null default 'any'     -- adult | teen | any
);
alter table public.mobile_group_audience enable row level security;
drop policy if exists mobile_group_audience_select on public.mobile_group_audience;
create policy mobile_group_audience_select on public.mobile_group_audience
  for select to authenticated using (true);   -- read-only config; admins write directly
grant select on public.mobile_group_audience to authenticated;

-- --- caller demographics (from the app profile; SECURITY DEFINER so views can call) ---
create or replace function public.mobile_my_age()
  returns integer language sql stable security definer set search_path = public as $$
  select case when p.birth_date is null then null
              else extract(year from age(p.birth_date))::int end
  from public.mobile_onboarding_profile p where p.auth_uid = auth.uid()
$$;
grant execute on function public.mobile_my_age() to authenticated;

create or replace function public.mobile_my_is_adult()
  returns boolean language sql stable as $$
  select case when public.mobile_my_age() is null then null else public.mobile_my_age() >= 18 end
$$;
grant execute on function public.mobile_my_is_adult() to authenticated;

-- 'men' / 'women' band for group matching (only male/female map to a gendered
-- group; everyone else sees 'any' groups only).
create or replace function public.mobile_my_gender()
  returns text language sql stable security definer set search_path = public as $$
  select case p.gender when 'male' then 'men' when 'female' then 'women' else null end
  from public.mobile_onboarding_profile p where p.auth_uid = auth.uid()
$$;
grant execute on function public.mobile_my_gender() to authenticated;

create or replace function public.mobile_onboarded()
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.mobile_onboarding_profile p
    where p.auth_uid = auth.uid() and p.completed_at is not null
  )
$$;
grant execute on function public.mobile_onboarded() to authenticated;

-- The gate used by mobile_groups. Existing users (real prod row) are never
-- audience-gated. Onboarded new users must match the group's audience; a group
-- with no audience row is open to all.
create or replace function public.mobile_group_audience_ok(p_group_id bigint)
  returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  a_gender text; a_age text; ok_gender boolean; ok_age boolean;
begin
  -- existing production users keep their current (role-based) access unchanged
  if exists (select 1 from public.users u where lower(u.email) = lower(auth.jwt() ->> 'email')) then
    return true;
  end if;

  -- 1) explicit admin tag wins
  select audience_gender, audience_age into a_gender, a_age
  from public.mobile_group_audience where sds_group_id = p_group_id;

  -- 2) no explicit tag → INFER the audience from the group's title, so gating
  --    works out of the box for conventionally-named groups (Men's / Women's /
  --    Teen) with no manual tagging. Check "women" before "men" (women contains
  --    "men"); \y…\y matches "men" only as a whole word (not inside "women").
  if a_gender is null then
    select case
             when g.title ilike '%women%' or g.title ilike '%woman%'
               or g.title ilike '%ladies%' or g.title ilike '%female%' then 'women'
             when g.title ~* '\ymen\y' or g.title ilike '%male%'
               or g.title ilike '%brotherhood%' or g.title ilike '%guys%' then 'men'
             else 'any'
           end,
           case
             when g.title ~* '\y(teen|teens|youth|adolescent|adolescents)\y' then 'teen'
             when g.title ilike '%adult%' then 'adult'
             else 'any'
           end
    into a_gender, a_age
    from public.sds_groups g where g.id = p_group_id;
    if a_gender is null then return true; end if;   -- group not found → open
  end if;

  ok_gender := a_gender = 'any' or a_gender = public.mobile_my_gender();
  ok_age := a_age = 'any'
         or (a_age = 'adult' and public.mobile_my_is_adult() is true)
         or (a_age = 'teen'  and public.mobile_my_is_adult() is false);
  return coalesce(ok_gender, false) and coalesce(ok_age, false);
end
$$;
grant execute on function public.mobile_group_audience_ok(bigint) to authenticated;

-- --- onboarding gate status (one row for the caller) ------------------------
-- The app calls this right after sign-in to decide whether to route a user into
-- the onboarding flow. Existing production users (a real `users` row) never
-- onboard — they keep their historical demographics/role. New users onboard
-- until they finish (completed_at set). Self-scoped: joins the caller's profile
-- by auth.uid() and checks their own `users` row by the JWT email, so it only
-- ever exposes the caller's own status (same pattern as mobile_me).
create or replace view mobile_onboarding_status as
  select
    coalesce(p.completed_at is not null, false)                       as completed,
    exists (
      select 1 from public.users u
      where lower(u.email) = lower(auth.jwt() ->> 'email')
    )                                                                 as is_existing_user,
    (
      not coalesce(p.completed_at is not null, false)
      and not exists (
        select 1 from public.users u
        where lower(u.email) = lower(auth.jwt() ->> 'email')
      )
    )                                                                 as needs_onboarding,
    p.primary_problem,
    p.completed_at
  from (select 1) d
  left join public.mobile_onboarding_profile p on p.auth_uid = auth.uid();
grant select on mobile_onboarding_status to anon, authenticated;

-- --- problem taxonomy (DB-driven picker) ------------------------------------
-- The single source of truth for the "primary problem" + "what else" pickers is
-- the production `addictions` table (the intake writes users.addiction_id → it).
-- This view exposes it with a derived category so the app can group/theme, and
-- picks up any new problem the moment it's inserted (db/problems-seed.sql). The
-- app stores `id` (→ addiction_id) so it reconciles 1:1 at cutover.
create or replace view mobile_problems as
  select a.id,
         a.enum_id,
         a.title,
         case
           when a.enum_id in (0,1,2,3,4,9) then 'substance'      -- alcohol/cannabis/meth/cocaine/opiates/nicotine
           when a.enum_id in (12,13,14)    then 'mental_health'  -- depression/anxiety/stress
           else 'behavioral'                                     -- sex/food/gambling/anger/impulsivity/… + other
         end as category
  from public.addictions a
  order by a.enum_id;
grant select on mobile_problems to anon, authenticated;

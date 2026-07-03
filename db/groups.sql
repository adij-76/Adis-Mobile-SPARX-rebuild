-- =============================================================================
-- Group coaching / meetings — real Zoom groups from production `sds_groups`.
--
-- Groups recur WEEKLY: meet_day (e.g. 'Monday') + meet_time_char ('9:00 AM'),
-- anchored to America/Los_Angeles (see zoom_start_time). The app computes the
-- next occurrence and converts it to the signed-in user's time zone.
--
--   mobile_groups        — read view: the groups the caller's subscription role
--                          unlocks (active only), with coach + schedule + (once
--                          the caller has signed up) the Zoom join link.
--   mobile_group_signups — app-owned: "I signed up for this group" (RLS by uid).
--
-- The coach HOST link (sds_groups.start_url) is NEVER exposed — only join_url,
-- and only to a signed-up member. Idempotent.
--
-- ORDER: signups table first (the view references it).
-- =============================================================================

-- --- app-owned sign-ups -----------------------------------------------------
create table if not exists public.mobile_group_signups (
  id           bigint generated always as identity primary key,
  auth_uid     uuid        not null default auth.uid(),
  app_user_id  integer,                                   -- production users.id (for cutover)
  sds_group_id bigint      not null,                      -- sds_groups.id
  active       boolean     not null default true,         -- false = cancelled sign-up
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists mobile_group_signups_uniq
  on public.mobile_group_signups (auth_uid, sds_group_id);

alter table public.mobile_group_signups enable row level security;
drop policy if exists mobile_group_signups_select on public.mobile_group_signups;
create policy mobile_group_signups_select on public.mobile_group_signups
  for select to authenticated using (auth_uid = auth.uid());
drop policy if exists mobile_group_signups_insert on public.mobile_group_signups;
create policy mobile_group_signups_insert on public.mobile_group_signups
  for insert to authenticated with check (auth_uid = auth.uid());
drop policy if exists mobile_group_signups_update on public.mobile_group_signups;
create policy mobile_group_signups_update on public.mobile_group_signups
  for update to authenticated using (auth_uid = auth.uid());
grant select, insert, update on public.mobile_group_signups to authenticated;

-- --- read view --------------------------------------------------------------
create or replace view mobile_groups as
  with me as (
    select id, subscription_role_id
    from public.users
    where lower(email) = lower(auth.jwt() ->> 'email')
    limit 1
  )
  select g.id,
         g.title,
         -- Prefer the real coach (users row via sds_user_id); fall back to the
         -- terse coach label on the group.
         coalesce(nullif(trim(u.first_name), ''), nullif(trim(g.coach), '')) as coach_name,
         u.avatar_link                                    as coach_avatar,
         g.coach                                          as coach_label,
         g.description,
         g.meet_day,
         g.meet_time_char,
         g.meet_length_char,
         'America/Los_Angeles'::text                      as source_tz,
         g.zoom_meeting_id,
         (select exists (
            select 1 from public.mobile_group_signups s
            where s.sds_group_id = g.id and s.auth_uid = auth.uid() and s.active
          ))                                              as signed_up,
         -- Only expose the Zoom join link to a signed-up member. (Time-of-day
         -- reveal — "day of / hour before" — is enforced in the app.)
         case when exists (
                select 1 from public.mobile_group_signups s
                where s.sds_group_id = g.id and s.auth_uid = auth.uid() and s.active
              ) then g.join_url else null end             as join_url
  from public.sds_groups g
  left join public.users u on u.id = g.sds_user_id
  where g.active
    and exists (
      select 1 from public.subscription_role_groups srg
      where srg.group_id = g.id
        and srg.role_id = (select subscription_role_id from me)
    )
  order by g.sort_order, g.id;
grant select on mobile_groups to authenticated;

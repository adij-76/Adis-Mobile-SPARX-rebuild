-- =============================================================================
-- SPARx mobile layer — the SINGLE source of truth for everything the app adds
-- on top of the imported production database.
--
-- WHY THIS FILE EXISTS
-- We never modify the production (Rails / igntd-main) database. Instead we import
-- a copy into Supabase and build an *additive* layer on top of it: read-only
-- views the app reads, RLS policies that scope rows per-user, the auth-user
-- import, and storage config. None of that lives in production, so every time a
-- fresh production snapshot is re-imported, this layer must be re-applied.
--
-- This file IS that layer. It is 100% idempotent — run it as many times as you
-- like, against any fresh import, and you land in the same place. That is how we
-- guarantee "all our changes propagate" without redoing the work by hand.
--
-- RE-IMPORT PLAYBOOK
--   1. Import / refresh the production snapshot into Supabase (public schema).
--   2. Run this whole file in the Supabase SQL editor (or `psql -f`).
--   3. Apply the dashboard-only settings in db/README.md (OAuth, exposed
--      schemas, redirect URLs) — those are not SQL and only need doing once.
--
-- SAFETY
--   * Touches base tables ONLY to (a) enable RLS and (b) add SELECT policies.
--     No production column or row is ever altered or deleted.
--   * Every CREATE POLICY is preceded by DROP POLICY IF EXISTS so re-runs never
--     error. Views use CREATE OR REPLACE. Inserts are guarded by WHERE NOT EXISTS
--     / ON CONFLICT so they only fill gaps.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. CATALOG VIEWS (no per-user data — safe for anon browse)
-- -----------------------------------------------------------------------------

create or replace view mobile_programs as
  select id, name, active from programs where active;

create or replace view mobile_modules as
  select id, program_id, title, "order" from portions;

-- Each lesson/workshop's Vimeo video lives in the polymorphic `vimeos` table
-- (vimeoable_type='Lesson'), not on `lessons`, so we lateral-join the newest one.
drop view if exists mobile_lessons;
create view mobile_lessons as
  select l.id,
         l.portion_id,
         l.title,
         l.nav_title,
         l.position,
         l.description,
         coalesce(v.url, l.vimeo_url)                 as vimeo_url,
         coalesce(v.vimeo_id::text, l.vimeo_id::text) as vimeo_id,
         case l.lesson_type when 1 then 'workshop' else 'lesson' end as lesson_type,
         l.worksheet_explanation_url as worksheet_url,
         null::text as thumbnail            -- client derives it from Vimeo oEmbed
  from lessons l
  left join lateral (
    select url, vimeo_id
    from vimeos
    where vimeoable_type = 'Lesson' and vimeoable_id = l.id
    order by updated_at desc nulls last
    limit 1
  ) v on true;

create or replace view mobile_snippets as
  select id,
         lesson_id,
         description,                          -- the DB "title" text
         length_seconds, vimeo_url, vimeo_id, ai_generated, created_at,
         title,                               -- DB title column (usually empty)
         ai_summary as summary                -- generated long description
  from snippets
  where classified = true;

-- Optional: daily quotes. The app falls back to bundled seed quotes if absent.
create or replace view mobile_quotes as
  select id,
         body            as text,
         author,
         coalesce(mood, 'steady') as mood
  from quotes
  where active = true;

grant select on mobile_programs, mobile_modules, mobile_lessons, mobile_snippets, mobile_quotes
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. mobile_me — maps the signed-in auth email → the production users row,
--    plus the personalisation fields the app reads after login.
--    addiction is an integer FK → public.addictions; we JOIN to return its title.
-- -----------------------------------------------------------------------------

create or replace view mobile_me as
  select u.id                                          as app_user_id,
         u.first_name                                  as name,
         u.email,
         u.avatar_link                                 as avatar,
         u.program_id,
         coalesce(u.subscribed, false)                 as subscribed,
         -- production schema has the typo "subsctiption" — keep it verbatim.
         coalesce(u.stripe_subsctiption_active, false) as stripe_active,
         coalesce(u.advanced_coaching, false)          as advanced_coaching,
         a.title                                       as addiction,
         u.days_counter_amount                         as days_count,
         u.days_counter_updated_at,
         u.user_handle,
         u.time_zone,
         u.team_id,
         u.zoom_email
  from public.users u
  left join public.addictions a on a.id = u.addiction;

alter view mobile_me set (security_invoker = on);     -- run as the caller, not owner
grant select on mobile_me to authenticated;

alter table public.users enable row level security;
drop policy if exists users_self on public.users;
create policy users_self on public.users for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- -----------------------------------------------------------------------------
-- 3. mobile_wheel_scores — trailing monthly wheel-of-life averages (per user).
--    Guarded: only created if a wheel_scores table exists in this import.
-- -----------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.wheel_scores') is not null then
    execute $v$
      create or replace view mobile_wheel_scores as
        select to_char(date_trunc('month', ws.recorded_at), 'YYYY-MM') as month_key,
               to_char(date_trunc('month', ws.recorded_at), 'Mon')     as label,
               extract(year from ws.recorded_at)::int                  as year,
               round(avg(ws.score))::int                               as score,
               ws.user_id
        from wheel_scores ws
        group by 1, 2, 3, ws.user_id
    $v$;
    execute 'grant select on mobile_wheel_scores to authenticated';
    execute 'alter table wheel_scores enable row level security';
    execute 'drop policy if exists mobile_wheel_scores_self on wheel_scores';
    execute $p$
      create policy mobile_wheel_scores_self on wheel_scores for select to authenticated
        using (user_id = (auth.jwt() ->> 'app_user_id')::int)
    $p$;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4. AUTH USER IMPORT — copy production users into Supabase Auth, preserving the
--    bcrypt password + seeding name/avatar into user_metadata. Idempotent: only
--    inserts users that don't already exist by email. Re-run after each import to
--    pick up newly-added production users.
--
--    TEST FIRST: uncomment the email filter, sign in, then re-run without it.
-- -----------------------------------------------------------------------------

insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at,
   confirmation_token, email_change, email_change_token_new, recovery_token,
   raw_app_meta_data, raw_user_meta_data)
select '00000000-0000-0000-0000-000000000000',
       gen_random_uuid(), 'authenticated', 'authenticated',
       lower(u.email),
       -- GoTrue accepts $2a$/$2b$; rewrite Rails' $2y$ prefix.
       case when u.encrypted_password like '$2y$%'
            then '$2a$' || substring(u.encrypted_password from 5)
            else u.encrypted_password end,
       now(), now(), now(),
       '', '', '', '',
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_strip_nulls(jsonb_build_object(
         'name', u.first_name,
         'full_name', nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''),
         'avatar_url', u.avatar_link))
from public.users u
where u.email is not null
  and u.encrypted_password is not null and u.encrypted_password <> ''
  -- and lower(u.email) = 'adijaffe+1@gmail.com'   -- <- uncomment to test one user
  and not exists (select 1 from auth.users a where lower(a.email) = lower(u.email));

insert into auth.identities
  (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select a.email, a.id,
       jsonb_build_object('sub', a.id::text, 'email', a.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users a
where a.email_confirmed_at is not null
  and not exists (
    select 1 from auth.identities i where i.user_id = a.id and i.provider = 'email');

-- -----------------------------------------------------------------------------
-- 5. AUTH METADATA RE-SYNC — patch name/avatar onto existing auth users from the
--    latest production row (so a fresh avatar in production shows after re-import).
--    Only fills/overwrites the three managed keys; leaves the rest of metadata.
-- -----------------------------------------------------------------------------

update auth.users au
set raw_user_meta_data = coalesce(au.raw_user_meta_data, '{}'::jsonb)
  || jsonb_strip_nulls(jsonb_build_object(
       'name', pu.first_name,
       'full_name', nullif(trim(concat_ws(' ', pu.first_name, pu.last_name)), ''),
       'avatar_url', pu.avatar_link))
from public.users pu
where lower(au.email) = lower(pu.email)
  and (
    coalesce(au.raw_user_meta_data->>'name', '')       is distinct from coalesce(pu.first_name, '')
    or coalesce(au.raw_user_meta_data->>'avatar_url', '') is distinct from coalesce(pu.avatar_link, '')
  );

-- -----------------------------------------------------------------------------
-- 6. AVATARS STORAGE — public bucket + per-user write policy. Bucket insert is
--    guarded by ON CONFLICT; policies are drop-then-create.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do update set public = true;

drop policy if exists "avatars are public read" on storage.objects;
create policy "avatars are public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "users manage their avatar" on storage.objects;
create policy "users manage their avatar" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

commit;

-- =============================================================================
-- VERIFY (optional) — run after the transaction to sanity-check the layer:
--   select count(*) as auth_users from auth.users;
--   select * from mobile_me where email = lower('you@example.com');
--   select id, title from public.addictions order by id;
-- =============================================================================

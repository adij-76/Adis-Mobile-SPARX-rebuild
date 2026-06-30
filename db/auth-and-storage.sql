-- =============================================================================
-- SPARx mobile layer — PART 2: AUTH + STORAGE (run when you do the auth cutover)
--
-- WHAT THIS FILE TOUCHES — and what it does NOT
--   * It WRITES to Supabase's own `auth` schema (auth.users, auth.identities) to
--     let your existing users sign in, and creates a public `avatars` storage
--     bucket + access policies. These are Supabase-managed areas, NOT your
--     production data tables.
--   * It READS public.users (email, password hash, name, avatar) but NEVER
--     alters, deletes, or overwrites a single production row or column.
--   * Statements the SQL editor flags as "destructive" and why each is safe:
--       - INSERT INTO auth.users / auth.identities — adds login records; guarded
--         by WHERE NOT EXISTS so re-runs only fill gaps, never duplicate.
--       - UPDATE auth.users (metadata) — edits ONLY the name/avatar keys on the
--         Supabase auth record. Does not touch public.users.
--       - INSERT INTO storage.buckets ... ON CONFLICT — creates the avatars
--         bucket once.
--       - DROP POLICY IF EXISTS (storage.objects) — drops *our own* storage
--         policies so they can be recreated. Not a base table.
--
-- IDEMPOTENT: safe to re-run after every re-import to pick up new/changed users.
-- TEST FIRST: uncomment the single-email filter in section 1, sign in as
-- yourself, confirm it works, then re-run without the filter for everyone.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. AUTH USER IMPORT — copy production users into Supabase Auth, preserving the
--    bcrypt password + seeding name/avatar into user_metadata.
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
-- 2. AUTH METADATA RE-SYNC — refresh name/avatar on the auth record from the
--    latest production row. Edits only the three managed keys on auth.users.
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
    coalesce(au.raw_user_meta_data->>'name', '')         is distinct from coalesce(pu.first_name, '')
    or coalesce(au.raw_user_meta_data->>'avatar_url', '') is distinct from coalesce(pu.avatar_link, '')
  );

-- -----------------------------------------------------------------------------
-- 3. AVATARS STORAGE — public bucket + per-user write policy.
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
-- VERIFY (optional):
--   select count(*) as imported_auth_users from auth.users;
--   select email, raw_user_meta_data->>'avatar_url' from auth.users limit 5;
-- =============================================================================

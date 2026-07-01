-- =============================================================================
-- mobile_checkins — the app's OWN daily check-in store (not production
-- daily_assessments). Additive and reversible: creating/dropping this table
-- never touches any production data. Row-level security scopes every row to the
-- Supabase auth user that created it (auth.uid()), so a user only ever reads or
-- writes their own check-ins.
--
-- A future sync job can push these into production daily_assessments if desired
-- (app_user_id is kept for that); until then this is the canonical check-in
-- store, replacing the previous device-local-only persistence.
--
-- Idempotent: safe to run repeatedly.
-- =============================================================================

create table if not exists public.mobile_checkins (
  id           bigint generated always as identity primary key,
  auth_uid     uuid        not null default auth.uid(),
  app_user_id  integer,                         -- production users.id, for later sync
  date         date        not null default (now() at time zone 'utc')::date,
  mood         integer,                         -- 0-100
  positive     text[]      not null default '{}',
  negative     text[]      not null default '{}',
  behavior     text,                            -- 'yes' | 'no'
  amount       text,                            -- 'less' | 'same' | 'more'
  use_count    text,                            -- free-text count (client `count`)
  affirmation  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One check-in per user per day; a re-check-in upserts (PostgREST on_conflict).
create unique index if not exists mobile_checkins_uid_date
  on public.mobile_checkins (auth_uid, date);

alter table public.mobile_checkins enable row level security;

drop policy if exists mobile_checkins_select on public.mobile_checkins;
create policy mobile_checkins_select on public.mobile_checkins
  for select to authenticated using (auth_uid = auth.uid());

drop policy if exists mobile_checkins_insert on public.mobile_checkins;
create policy mobile_checkins_insert on public.mobile_checkins
  for insert to authenticated with check (auth_uid = auth.uid());

drop policy if exists mobile_checkins_update on public.mobile_checkins;
create policy mobile_checkins_update on public.mobile_checkins
  for update to authenticated using (auth_uid = auth.uid()) with check (auth_uid = auth.uid());

grant select, insert, update on public.mobile_checkins to authenticated;

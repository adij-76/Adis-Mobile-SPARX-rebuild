-- =============================================================================
-- mobile_wheel_entries — the app's OWN Wheel-of-Life retake store, mirroring
-- mobile_checkins. Additive/reversible; never touches production
-- wheel_of_life_scores. RLS scopes rows to the auth user (auth.uid()).
--
-- A retake inserts one row per life area (score 0-100). mobile_wheel_areas
-- UNIONs these with production scores and takes the newest per area, so a fresh
-- retake immediately shows as the current value.
--
-- On the final DB re-import these should be reconciled into production
-- wheel_of_life_scores (app_user_id + life_area_id + taken_at carry the mapping);
-- until then this is the source of truth for mobile retakes.
--
-- Idempotent.
-- =============================================================================

create table if not exists public.mobile_wheel_entries (
  id           bigint generated always as identity primary key,
  auth_uid     uuid        not null default auth.uid(),
  app_user_id  integer,                      -- production users.id, for later sync
  life_area_id integer     not null,         -- 1..10 → public.life_areas.id
  score        integer     not null,         -- 0-100 (app scale; production is 0-10)
  taken_at     timestamptz not null default now()
);

create index if not exists mobile_wheel_entries_uid_area
  on public.mobile_wheel_entries (auth_uid, life_area_id, taken_at desc);

alter table public.mobile_wheel_entries enable row level security;

drop policy if exists mobile_wheel_entries_select on public.mobile_wheel_entries;
create policy mobile_wheel_entries_select on public.mobile_wheel_entries
  for select to authenticated using (auth_uid = auth.uid());

drop policy if exists mobile_wheel_entries_insert on public.mobile_wheel_entries;
create policy mobile_wheel_entries_insert on public.mobile_wheel_entries
  for insert to authenticated with check (auth_uid = auth.uid());

grant select, insert on public.mobile_wheel_entries to authenticated;

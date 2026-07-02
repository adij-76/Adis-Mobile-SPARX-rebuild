-- =============================================================================
-- mobile_favorites — the app's OWN favorites store (bookmark writes).
--
-- Production `favorites` is read-only to us, so mobile bookmark toggles are
-- written here and MERGED with the production favorites client-side:
--   effective favorite = production favorite, then overridden by any row here
--   (active=true → saved, active=false → an explicit un-save / tombstone).
-- One row per (user, kind, item); re-toggling upserts. RLS scopes to the user.
--
-- On the final DB sync these reconcile into production `favorites`
-- (favoritable_type from kind, favoritable_id from item_id). Idempotent.
-- =============================================================================

create table if not exists public.mobile_favorites (
  id          bigint generated always as identity primary key,
  auth_uid    uuid        not null default auth.uid(),
  app_user_id integer,
  kind        text        not null,          -- 'lesson' | 'video'
  item_id     text        not null,          -- lesson / snippet id
  active      boolean     not null default true,   -- false = explicit un-save
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists mobile_favorites_uniq
  on public.mobile_favorites (auth_uid, kind, item_id);

alter table public.mobile_favorites enable row level security;

drop policy if exists mobile_favorites_select on public.mobile_favorites;
create policy mobile_favorites_select on public.mobile_favorites
  for select to authenticated using (auth_uid = auth.uid());

drop policy if exists mobile_favorites_insert on public.mobile_favorites;
create policy mobile_favorites_insert on public.mobile_favorites
  for insert to authenticated with check (auth_uid = auth.uid());

drop policy if exists mobile_favorites_update on public.mobile_favorites;
create policy mobile_favorites_update on public.mobile_favorites
  for update to authenticated using (auth_uid = auth.uid()) with check (auth_uid = auth.uid());

grant select, insert, update on public.mobile_favorites to authenticated;

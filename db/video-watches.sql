-- =============================================================================
-- Video completions — app-owned. Records how much of a video a user has watched
-- (furthest point reached) and marks it complete at ≥95%, so the daily checklist
-- ticks off across devices and progress can be rewarded. One row per (user,video).
--
--   mobile_video_watches — auth_uid owner, app_user_id (prod users.id, for
--     cutover), video_id (mobile_snippets.id as text), percent (0-100, furthest
--     reached), watched_at.
--   mobile_record_watch(video_id, percent, app_user_id) — RPC upsert that keeps
--     the MAX percent (a partial re-watch never lowers a higher recorded value).
--
-- Reconciles at cutover to a `watched_video` reward (rewards.short_name) +
-- user_points; percent enables a "furthest watched" / points-from-progress board.
-- RLS scopes to the caller. Idempotent.
--
-- NOTE (native): real percent/completion is only observable on WEB today (Vimeo
-- postMessage). Native needs the react-native-webview bridge — see
-- docs/native-build-notes.md. Until then native records a complete-on-open proxy.
-- =============================================================================

create table if not exists public.mobile_video_watches (
  id          bigint generated always as identity primary key,
  auth_uid    uuid        not null default auth.uid(),
  app_user_id integer,                                   -- production users.id (for cutover)
  video_id    text        not null,                      -- mobile_snippets.id
  percent     smallint    not null default 0,            -- furthest point reached, 0-100
  watched_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
-- If the table pre-existed (percent added later), backfill the column additively.
alter table public.mobile_video_watches
  add column if not exists percent smallint not null default 0;

create unique index if not exists mobile_video_watches_uniq
  on public.mobile_video_watches (auth_uid, video_id);

alter table public.mobile_video_watches enable row level security;
drop policy if exists mobile_video_watches_select on public.mobile_video_watches;
create policy mobile_video_watches_select on public.mobile_video_watches
  for select to authenticated using (auth_uid = auth.uid());
drop policy if exists mobile_video_watches_insert on public.mobile_video_watches;
create policy mobile_video_watches_insert on public.mobile_video_watches
  for insert to authenticated with check (auth_uid = auth.uid());
drop policy if exists mobile_video_watches_update on public.mobile_video_watches;
create policy mobile_video_watches_update on public.mobile_video_watches
  for update to authenticated using (auth_uid = auth.uid());
grant select, insert, update on public.mobile_video_watches to authenticated;

-- Upsert that only ever advances `percent` (furthest watched wins). Runs as the
-- caller (security invoker): RLS applies and auth_uid fills from the default, so
-- a user can only ever record their own row. Clamps percent to 0-100.
create or replace function public.mobile_record_watch(
  p_video_id    text,
  p_percent     integer default 0,
  p_app_user_id integer default null
) returns void
language sql
security invoker
as $$
  insert into public.mobile_video_watches (video_id, app_user_id, percent, watched_at)
  values (p_video_id, p_app_user_id, greatest(0, least(100, p_percent)), now())
  on conflict (auth_uid, video_id) do update
    set percent     = greatest(public.mobile_video_watches.percent, excluded.percent),
        app_user_id = coalesce(excluded.app_user_id, public.mobile_video_watches.app_user_id),
        watched_at  = now();
$$;
grant execute on function public.mobile_record_watch(text, integer, integer) to authenticated;

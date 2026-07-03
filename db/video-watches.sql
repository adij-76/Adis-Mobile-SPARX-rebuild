-- =============================================================================
-- Video completions — app-owned. Records when a user FINISHES a video (Vimeo
-- 'ended' / ≥95% watched), so the daily checklist ticks off across devices and
-- the completion can be rewarded. One row per (user, video).
--
--   mobile_video_watches — auth_uid owner, app_user_id (prod users.id, for
--     cutover), video_id (mobile_snippets.id as text), watched_at.
--
-- Reconciles at cutover to a `watched_video` reward (rewards.short_name) +
-- user_points (default_points = 1). RLS scopes to the caller. Idempotent.
-- =============================================================================

create table if not exists public.mobile_video_watches (
  id          bigint generated always as identity primary key,
  auth_uid    uuid        not null default auth.uid(),
  app_user_id integer,                                   -- production users.id (for cutover)
  video_id    text        not null,                      -- mobile_snippets.id
  watched_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
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

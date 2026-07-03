-- =============================================================================
-- App-side gamification state — app-owned, durable, cross-device.
--
-- Holds the points/badges the app computes locally (video watch points, streak
-- milestone bonus points, and the numeric streak badges) so they survive a
-- reinstall, follow the user across devices, and are available to reconcile into
-- production `user_points` / `user_rewards` at cutover. One row per user.
--
--   mobile_game_state       — auth_uid owner, app_user_id (for cutover),
--     video_points, streak_bonus_points, streak_credited_days + streak_run_start
--     (run-scoped idempotency for milestone crediting), streak_badges (jsonb:
--     milestone-days → times reached).
--   mobile_jsonb_max_merge  — per-key greatest() merge of two jsonb count maps.
--   mobile_save_game_state  — upsert that MAX-merges every monotonic field, so
--     concurrent devices can't lower a total and offline progress is never lost.
--
-- RLS scopes to the caller. Idempotent.
-- =============================================================================

create table if not exists public.mobile_game_state (
  auth_uid             uuid        primary key default auth.uid(),
  app_user_id          integer,                                 -- production users.id (for cutover)
  video_points         integer     not null default 0,          -- monotonic
  streak_bonus_points  integer     not null default 0,          -- monotonic
  streak_credited_days integer     not null default 0,          -- highest milestone credited this run
  streak_run_start     date,                                    -- start of the run credited_days applies to
  streak_badges        jsonb       not null default '{}'::jsonb,-- {"7": 10, "30": 2} — times each reached
  updated_at           timestamptz not null default now()
);

alter table public.mobile_game_state enable row level security;
drop policy if exists mobile_game_state_select on public.mobile_game_state;
create policy mobile_game_state_select on public.mobile_game_state
  for select to authenticated using (auth_uid = auth.uid());
drop policy if exists mobile_game_state_insert on public.mobile_game_state;
create policy mobile_game_state_insert on public.mobile_game_state
  for insert to authenticated with check (auth_uid = auth.uid());
drop policy if exists mobile_game_state_update on public.mobile_game_state;
create policy mobile_game_state_update on public.mobile_game_state
  for update to authenticated using (auth_uid = auth.uid());
grant select, insert, update on public.mobile_game_state to authenticated;

-- Per-key greatest() merge of two jsonb {tier: count} maps (badge counts only go up).
create or replace function public.mobile_jsonb_max_merge(a jsonb, b jsonb)
returns jsonb language sql immutable as $$
  select coalesce(
    jsonb_object_agg(k, greatest(coalesce((a->>k)::int, 0), coalesce((b->>k)::int, 0))),
    '{}'::jsonb
  )
  from (
    select jsonb_object_keys(coalesce(a, '{}'::jsonb)) as k
    union
    select jsonb_object_keys(coalesce(b, '{}'::jsonb))
  ) keys;
$$;

-- Upsert that only ever advances the state. Monotonic totals take greatest();
-- badges max-merge per tier; credited_days is run-scoped — a newer run resets it,
-- the same run keeps the max. Runs as the caller (RLS + auth.uid() default).
create or replace function public.mobile_save_game_state(
  p_video_points         integer,
  p_streak_bonus_points  integer,
  p_streak_credited_days integer,
  p_streak_run_start     date,
  p_streak_badges        jsonb,
  p_app_user_id          integer default null
) returns void
language plpgsql
security invoker
as $$
begin
  insert into public.mobile_game_state as g
    (auth_uid, app_user_id, video_points, streak_bonus_points,
     streak_credited_days, streak_run_start, streak_badges, updated_at)
  values
    (auth.uid(), p_app_user_id, greatest(0, p_video_points), greatest(0, p_streak_bonus_points),
     greatest(0, p_streak_credited_days), p_streak_run_start,
     coalesce(p_streak_badges, '{}'::jsonb), now())
  on conflict (auth_uid) do update set
    app_user_id         = coalesce(excluded.app_user_id, g.app_user_id),
    video_points        = greatest(g.video_points, excluded.video_points),
    streak_bonus_points = greatest(g.streak_bonus_points, excluded.streak_bonus_points),
    streak_credited_days = case
      when excluded.streak_run_start is not null
       and excluded.streak_run_start > coalesce(g.streak_run_start, date '0001-01-01')
        then excluded.streak_credited_days
      when excluded.streak_run_start is not distinct from g.streak_run_start
        then greatest(g.streak_credited_days, excluded.streak_credited_days)
      else g.streak_credited_days
    end,
    streak_run_start    = greatest(coalesce(g.streak_run_start, date '0001-01-01'),
                                   coalesce(excluded.streak_run_start, date '0001-01-01')),
    streak_badges       = public.mobile_jsonb_max_merge(g.streak_badges, excluded.streak_badges),
    updated_at          = now();
end;
$$;
grant execute on function public.mobile_jsonb_max_merge(jsonb, jsonb) to authenticated;
grant execute on function public.mobile_save_game_state(integer, integer, integer, date, jsonb, integer) to authenticated;

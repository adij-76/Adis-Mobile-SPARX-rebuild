-- =============================================================================
-- XP events ledger — the single shared source of truth for gamification points.
--
-- Every XP award the app makes writes one itemized, timestamped, typed row here
-- (source + ref_id + points + created_at). This is what powers:
--   • the XP leaderboard (real today / this-week / all-time windows), and
--   • the "you moved up N spots → now #X" feedback on every completion,
-- so the board you SEE and the movement you're TOLD about are the same numbers.
--
-- WHY A LEDGER (not just mobile_game_state's running total): at cutover an
-- itemized event maps 1:1 to a production reward row (user_points / user_rewards),
-- so a July/tester user's points reconcile faithfully instead of as an opaque
-- total. mobile_game_state stays as the fast running total for display; this
-- ledger is the durable, reconcilable record. Append-only. RLS by auth.uid().
-- Idempotent.
-- =============================================================================

create table if not exists public.mobile_xp_events (
  id          bigint generated always as identity primary key,
  auth_uid    uuid        not null default auth.uid(),
  app_user_id integer,                                   -- production users.id (cutover)
  source      text        not null,                      -- 'checkin'|'video'|'lesson'|'module'|'community_post'|'community_reply'|'assessment'|'assessment_battery'|'streak_milestone'|'onboarding'|'intro'
  ref_id      text,                                      -- item id (video/lesson/instrument/…) for traceability + dedupe
  points      integer     not null,
  created_at  timestamptz not null default now()
);

create index if not exists mobile_xp_events_uid_time
  on public.mobile_xp_events (auth_uid, created_at desc);

alter table public.mobile_xp_events enable row level security;
drop policy if exists mobile_xp_events_select on public.mobile_xp_events;
create policy mobile_xp_events_select on public.mobile_xp_events
  for select to authenticated using (auth_uid = auth.uid());
drop policy if exists mobile_xp_events_insert on public.mobile_xp_events;
create policy mobile_xp_events_insert on public.mobile_xp_events
  for insert to authenticated with check (auth_uid = auth.uid());
grant select, insert on public.mobile_xp_events to authenticated;

-- --- window helper: keep the period → time-cutoff logic in one place ---------
-- 'today' = since midnight UTC (matches the app's date convention), 'week' =
-- rolling 7 days, anything else = all-time.
create or replace function public.mobile_xp_window_start(p_period text)
  returns timestamptz language sql immutable as $$
  select case p_period
           when 'today' then date_trunc('day', now())
           when 'week'  then now() - interval '7 days'
           when 'month' then now() - interval '30 days'
           else '-infinity'::timestamptz
         end
$$;

-- --- the XP leaderboard (per-window totals, ranked) --------------------------
-- SECURITY DEFINER so it can rank across all users (the table is RLS-scoped to
-- the caller for direct reads). Identity resolves via the production users row
-- when linked; app-only users (new testers) show as "Member".
create or replace function public.mobile_xp_leaderboard(p_period text default 'all')
  returns table(user_id text, name text, avatar text, points bigint, you boolean)
  language sql stable security definer set search_path = public as $$
  with windowed as (
    select e.auth_uid,
           sum(e.points)::bigint as pts,
           max(e.app_user_id)    as app_user_id
    from public.mobile_xp_events e
    where e.created_at >= public.mobile_xp_window_start(p_period)
    group by e.auth_uid
  )
  select coalesce(w.app_user_id::text, w.auth_uid::text)          as user_id,
         coalesce(nullif(trim(u.first_name), ''), 'Member')       as name,
         u.avatar_link                                            as avatar,
         w.pts                                                    as points,
         (w.auth_uid = auth.uid())                                as you
  from windowed w
  left join public.users u on u.id = w.app_user_id
  order by w.pts desc
  limit 100
$$;
grant execute on function public.mobile_xp_leaderboard(text) to authenticated;

-- --- projection: where the caller sits now, and where +N would put them ------
-- Returns the caller's current window total + rank, and the rank they'd hold
-- with `p_added` more points. Call this BEFORE writing the award event with
-- p_added = points about to be earned → current_rank is the pre-award rank and
-- projected_rank the post-award rank, so the celebration can say
-- "moved up (current_rank - projected_rank) → now #projected_rank".
create or replace function public.mobile_xp_project(p_added integer, p_period text default 'week')
  returns table(my_points bigint, current_rank integer, projected_rank integer, total_players integer)
  language sql stable security definer set search_path = public as $$
  with windowed as (
    select e.auth_uid, sum(e.points)::bigint as pts
    from public.mobile_xp_events e
    where e.created_at >= public.mobile_xp_window_start(p_period)
    group by e.auth_uid
  ),
  me as (select coalesce((select pts from windowed where auth_uid = auth.uid()), 0)::bigint as s)
  select (select s from me) as my_points,
         (1 + (select count(*) from windowed w where w.pts > (select s from me)))::integer
           as current_rank,
         (1 + (select count(*) from windowed w
                where w.auth_uid <> auth.uid()
                  and w.pts > (select s from me) + p_added))::integer
           as projected_rank,
         (select count(*) from windowed)::integer as total_players
$$;
grant execute on function public.mobile_xp_project(integer, text) to authenticated;

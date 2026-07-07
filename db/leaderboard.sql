-- =============================================================================
-- Leaderboards — multiple boards over rolling windows, sourced from the
-- APP-OWNED layer: the XP events ledger (mobile_xp_events) + mobile_checkins.
--
-- Why not the legacy user_points/rewards/daily_assessments ledger? Because the
-- current mobile-first users' activity lands in the app-owned tables, not the
-- prod reward tables — so a legacy-sourced board shows nothing for them (only
-- the XP board, which already reads mobile_xp_events, had data). Sourcing every
-- board from the ledger makes real in-app activity show, and keeps all boards
-- consistent with the XP board. Every board still counts SERVER-recorded actions
-- (each is one itemized XP event) — never self-reported scores.
--
--   mobile_leaderboard_metric(metric, period)  — points | lessons | workshops |
--       community | videos | checkins. 'points' sums mobile_xp_events.points;
--       the rest count itemized events by `source`.
--   mobile_streak_leaderboard(period)          — longest consecutive check-in run
--       within the window (gaps-and-islands over mobile_checkins).
--   mobile_leaderboard_period(period)          — legacy all-points board over
--       user_points (kept for back-compat; unused by the current app).
--
-- Windows are ROLLING: week = last 7 days, month = last 30 days, all = everything
-- (streak 'all' = ever). SECURITY DEFINER to read the base tables. Idempotent.
-- =============================================================================

-- --- legacy all-points board (back-compat) ----------------------------------
drop function if exists public.mobile_leaderboard_period(text);
create function public.mobile_leaderboard_period(p_period text)
  returns table (user_id bigint, name text, avatar text, points int, you boolean)
  language sql stable security definer set search_path = public
as $$
  select u.id::bigint,
         coalesce(nullif(trim(u.first_name), ''), split_part(u.email, '@', 1)),
         u.avatar_link,
         coalesce(sum(up.points), 0)::int,
         (u.id = (select id from public.users where lower(email) = lower(auth.jwt() ->> 'email')))
  from public.users u
  join public.user_points up on up.user_id = u.id
  where case
          when p_period = 'week'  then up.created_at >= now()::timestamp - interval '7 days'
          when p_period = 'month' then up.created_at >= now()::timestamp - interval '30 days'
          else true
        end
  group by u.id, u.first_name, u.email, u.avatar_link
  order by 4 desc
  limit 50;
$$;
grant execute on function public.mobile_leaderboard_period(text) to authenticated;

-- --- multi-metric board (from the app-owned XP ledger) -----------------------
-- score = points sum (metric 'points') or a count of the matching itemized XP
-- events. Sourced from mobile_xp_events (NOT the legacy user_points/rewards
-- ledger) so it reflects real in-app activity by the current mobile-first users
-- — whose actions live in the app-owned layer, not the prod reward tables.
-- Identity resolves via app_user_id → users when linked (else "Member"), and
-- the caller is flagged via auth.uid(), mirroring mobile_xp_leaderboard.
drop function if exists public.mobile_leaderboard_metric(text, text);
create function public.mobile_leaderboard_metric(p_metric text, p_period text)
  returns table (user_id text, name text, avatar text, score int, you boolean)
  language sql stable security definer set search_path = public
as $$
  with windowed as (
    select e.auth_uid,
           max(e.app_user_id) as app_user_id,
           (case p_metric
              when 'points'    then coalesce(sum(e.points), 0)
              when 'lessons'   then count(distinct e.ref_id) filter (where e.source = 'lesson')
              when 'workshops' then count(distinct e.ref_id) filter (where e.source = 'workshop')
              when 'community' then count(*) filter (where e.source in ('community_post','community_reply','intro'))
              when 'videos'    then count(distinct e.ref_id) filter (where e.source = 'video')
              when 'checkins'  then count(distinct e.ref_id) filter (where e.source = 'checkin')
              else 0
            end)::int as score
    from public.mobile_xp_events e
    where e.created_at >= public.mobile_xp_window_start(p_period)
    group by e.auth_uid
  )
  select coalesce(w.app_user_id::text, w.auth_uid::text),
         coalesce(nullif(trim(u.first_name), ''), 'Member'),
         u.avatar_link,
         w.score,
         (w.auth_uid = auth.uid())
  from windowed w
  left join public.users u on u.id = w.app_user_id
  where w.score > 0
  order by w.score desc
  limit 50;
$$;
grant execute on function public.mobile_leaderboard_metric(text, text) to authenticated;

-- --- longest check-in streak (from app-owned mobile_checkins) -----------------
-- Longest run of consecutive check-in days within the window (gaps-and-islands:
-- consecutive dates share d - row_number()). Sourced from mobile_checkins (one
-- row per user per day) rather than legacy daily_assessments, so it reflects the
-- current users' real check-ins. 'all' = longest streak ever.
drop function if exists public.mobile_streak_leaderboard(text);
create function public.mobile_streak_leaderboard(p_period text)
  returns table (user_id text, name text, avatar text, score int, you boolean)
  language sql stable security definer set search_path = public
as $$
  with days as (
    select c.auth_uid, c.date as d, max(c.app_user_id) as app_user_id
    from public.mobile_checkins c
    where c.date >= (public.mobile_xp_window_start(p_period))::date
    group by c.auth_uid, c.date
  ),
  islands as (
    select auth_uid, d, app_user_id,
           d - (row_number() over (partition by auth_uid order by d))::int as grp
    from days
  ),
  runs as (
    select auth_uid, max(app_user_id) as app_user_id, count(*)::int as streak
    from islands
    group by auth_uid, grp
  ),
  best as (
    select auth_uid, max(app_user_id) as app_user_id, max(streak) as score
    from runs
    group by auth_uid
  )
  select coalesce(b.app_user_id::text, b.auth_uid::text),
         coalesce(nullif(trim(u.first_name), ''), 'Member'),
         u.avatar_link,
         b.score,
         (b.auth_uid = auth.uid())
  from best b
  left join public.users u on u.id = b.app_user_id
  order by b.score desc
  limit 50;
$$;
grant execute on function public.mobile_streak_leaderboard(text) to authenticated;

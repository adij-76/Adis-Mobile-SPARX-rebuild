-- =============================================================================
-- Leaderboards — multiple boards over rolling windows, combining BOTH data
-- layers so the board is true for everyone:
--   • LEGACY prod activity  (user_points → user_rewards → rewards; daily_assessments)
--   • APP-OWNED activity     (mobile_xp_events by source; mobile_checkins)
--
-- Why union both? Existing users' history lives in the legacy reward ledger;
-- new mobile-first users' activity lives in the app-owned tables. A board that
-- reads only one source is wrong for the other cohort. We tally each side per
-- user and SUM them, so an existing user who also uses the app gets credit for
-- both, and every window (all-time / 30d / 7d) is complete.
--
-- Identity key: legacy rows key on users.id; app-owned rows key on
-- coalesce(app_user_id, auth_uid). An existing user's mobile writes carry their
-- app_user_id (= users.id), so the two sides MERGE into one row; a new user
-- (no prod row) keys on auth_uid and appears once.
--
--   mobile_leaderboard_metric(metric, period)  — points | lessons | workshops |
--       community | videos | checkins. legacy (reward short_names / points) +
--       mobile (event `source` / points), summed.
--   mobile_streak_leaderboard(period)          — longest consecutive check-in run
--       over the UNION of daily_assessments + mobile_checkins days.
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
         coalesce(nullif(trim(u.first_name), ''), nullif(u.user_handle, ''), 'Member'),
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
  with
  win as (select public.mobile_xp_window_start(p_period) as since),
  -- reward short_names that count for each legacy metric (points = all rewards)
  sset as (
    select case p_metric
             when 'lessons'   then array['lesson_complete','lesson_assignment_completed']
             when 'workshops' then array['workshop_complete','workshop_assignment_completed']
             when 'community' then array['enter_community','commpost_assignment_completed']
             when 'videos'    then array['watched_video','video_assignment_completed','watched_welcome_video']
             when 'checkins'  then array['daily_assessment']
             else array[]::text[]
           end as names
  ),
  -- LEGACY side — keyed by users.id
  legacy as (
    select up.user_id::text as key,
           (case when p_metric = 'points' then coalesce(sum(up.points), 0)
                 else count(*) filter (where r.short_name = any (sset.names)) end)::int as score
    from public.user_points up
    cross join win
    cross join sset
    left join public.user_rewards ur on ur.id = up.user_reward_id
    left join public.rewards r on r.id = ur.reward_id
    where up.created_at >= win.since
    group by up.user_id
  ),
  -- APP-OWNED side — keyed by coalesce(app_user_id, auth_uid)
  mobile as (
    select coalesce(e.app_user_id::text, e.auth_uid::text) as key,
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
    cross join win
    where e.created_at >= win.since
    group by coalesce(e.app_user_id::text, e.auth_uid::text)
  ),
  combined as (
    select key, sum(score)::int as score
    from (select key, score from legacy union all select key, score from mobile) parts
    group by key
  )
  select c.key,
         coalesce(nullif(trim(u.first_name), ''), nullif(u.user_handle, ''), 'Member'),
         u.avatar_link,
         c.score,
         (c.key = coalesce(
            (select id::text from public.users where lower(email) = lower(auth.jwt() ->> 'email')),
            auth.uid()::text))
  from combined c
  left join public.users u on u.id::text = c.key
  where c.score > 0
  order by c.score desc
  limit 50;
$$;
grant execute on function public.mobile_leaderboard_metric(text, text) to authenticated;

-- --- longest check-in streak (legacy daily_assessments ∪ mobile_checkins) -----
-- Longest run of consecutive check-in days within the window (gaps-and-islands:
-- consecutive dates share d - row_number()), over the UNION of legacy web
-- check-ins (daily_assessments) and app check-ins (mobile_checkins). Keyed the
-- same way as the metric board so an existing user's web + app days merge.
-- 'all' = longest streak ever.
drop function if exists public.mobile_streak_leaderboard(text);
create function public.mobile_streak_leaderboard(p_period text)
  returns table (user_id text, name text, avatar text, score int, you boolean)
  language sql stable security definer set search_path = public
as $$
  with win as (select public.mobile_xp_window_start(p_period) as since),
  alldays as (
    -- legacy: keyed by users.id
    select da.user_id::text as key, date(da.created_at) as d
    from public.daily_assessments da cross join win
    where da.created_at >= win.since
    union
    -- app-owned: keyed by coalesce(app_user_id, auth_uid)
    select coalesce(c.app_user_id::text, c.auth_uid::text) as key, c.date as d
    from public.mobile_checkins c cross join win
    where c.date >= (win.since)::date
  ),
  days as (select distinct key, d from alldays),
  islands as (
    select key, d,
           d - (row_number() over (partition by key order by d))::int as grp
    from days
  ),
  runs as (
    select key, count(*)::int as streak from islands group by key, grp
  ),
  best as (
    select key, max(streak) as score from runs group by key
  )
  select b.key,
         coalesce(nullif(trim(u.first_name), ''), nullif(u.user_handle, ''), 'Member'),
         u.avatar_link,
         b.score,
         (b.key = coalesce(
            (select id::text from public.users where lower(email) = lower(auth.jwt() ->> 'email')),
            auth.uid()::text))
  from best b
  left join public.users u on u.id::text = b.key
  order by b.score desc
  limit 50;
$$;
grant execute on function public.mobile_streak_leaderboard(text) to authenticated;

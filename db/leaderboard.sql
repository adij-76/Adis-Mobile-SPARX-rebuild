-- =============================================================================
-- Leaderboards — multiple boards over rolling windows, from the real rewards
-- ledger (user_points → user_rewards → rewards) + daily_assessments (streak).
--
-- Every board counts SERVER-AWARDED actions (watched a video, completed a
-- lesson, posted in community, checked in) or points — never self-reported
-- scores — so it can't be gamed by entering false data.
--
--   mobile_leaderboard_metric(metric, period)  — points | lessons | workshops |
--       community | videos | checkins. 'points' sums user_points; the rest count
--       award events whose reward short_name matches the metric's set.
--   mobile_streak_leaderboard(period)          — longest consecutive check-in run
--       within the window (gaps-and-islands over daily_assessments).
--   mobile_leaderboard_period(period)          — legacy all-points board (kept so
--       the currently-deployed app keeps working until the new one ships).
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

-- --- multi-metric board ------------------------------------------------------
-- score = points sum (metric 'points') or count of matching award events.
drop function if exists public.mobile_leaderboard_metric(text, text);
create function public.mobile_leaderboard_metric(p_metric text, p_period text)
  returns table (user_id bigint, name text, avatar text, score int, you boolean)
  language sql stable security definer set search_path = public
as $$
  with sset as (
    select case p_metric
             when 'lessons'   then array['lesson_complete','lesson_assignment_completed']
             when 'workshops' then array['workshop_complete','workshop_assignment_completed']
             when 'community' then array['enter_community','commpost_assignment_completed']
             when 'videos'    then array['watched_video','video_assignment_completed','watched_welcome_video']
             when 'checkins'  then array['daily_assessment']
             else array[]::text[]              -- 'points' → all rewards
           end as names
  )
  select u.id::bigint,
         coalesce(nullif(trim(u.first_name), ''), split_part(u.email, '@', 1)),
         u.avatar_link,
         (case when p_metric = 'points' then coalesce(sum(up.points), 0) else count(*) end)::int as score,
         (u.id = (select id from public.users where lower(email) = lower(auth.jwt() ->> 'email')))
  from public.users u
  join public.user_points up on up.user_id = u.id
  cross join sset
  left join public.user_rewards ur on ur.id = up.user_reward_id
  left join public.rewards r on r.id = ur.reward_id
  where (case
           when p_period = 'week'  then up.created_at >= now()::timestamp - interval '7 days'
           when p_period = 'month' then up.created_at >= now()::timestamp - interval '30 days'
           else true
         end)
    and (p_metric = 'points' or r.short_name = any (sset.names))
  group by u.id, u.first_name, u.email, u.avatar_link
  having (case when p_metric = 'points' then coalesce(sum(up.points), 0) else count(*) end) > 0
  order by score desc
  limit 50;
$$;
grant execute on function public.mobile_leaderboard_metric(text, text) to authenticated;

-- --- longest check-in streak -------------------------------------------------
-- Longest run of consecutive check-in days within the window (gaps-and-islands:
-- consecutive dates share d - row_number()). 'all' = longest streak ever.
drop function if exists public.mobile_streak_leaderboard(text);
create function public.mobile_streak_leaderboard(p_period text)
  returns table (user_id bigint, name text, avatar text, score int, you boolean)
  language sql stable security definer set search_path = public
as $$
  with days as (
    select da.user_id, date(da.created_at) as d
    from public.daily_assessments da
    where case
            when p_period = 'week'  then da.created_at >= now()::timestamp - interval '7 days'
            when p_period = 'month' then da.created_at >= now()::timestamp - interval '30 days'
            else true
          end
    group by da.user_id, date(da.created_at)
  ),
  islands as (
    select user_id, d,
           d - (row_number() over (partition by user_id order by d))::int as grp
    from days
  ),
  runs as (
    select user_id, count(*)::int as streak
    from islands
    group by user_id, grp
  ),
  best as (
    select user_id, max(streak) as score
    from runs
    group by user_id
  )
  select u.id::bigint,
         coalesce(nullif(trim(u.first_name), ''), split_part(u.email, '@', 1)),
         u.avatar_link,
         b.score,
         (u.id = (select id from public.users where lower(email) = lower(auth.jwt() ->> 'email')))
  from best b
  join public.users u on u.id = b.user_id
  order by b.score desc
  limit 50;
$$;
grant execute on function public.mobile_streak_leaderboard(text) to authenticated;

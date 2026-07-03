-- =============================================================================
-- Period leaderboard — points ranked over a window (all-time / month / week).
--
-- The existing mobile_leaderboard view sums user_points all-time. This adds a
-- period-aware function so the app can show All-time / This month / This week
-- boards (dynamic movement + weekly/monthly contests).
--
-- user_points is an award ledger (one row per award, with created_at), so a
-- period board is just the same sum filtered by created_at. SECURITY DEFINER so
-- it can read users/user_points regardless of base-table RLS (like the view).
--
-- Windows use the session zone (UTC on Supabase): a "week" starts Monday 00:00,
-- a "month" the 1st. Idempotent.
-- =============================================================================

drop function if exists public.mobile_leaderboard_period(text);

create function public.mobile_leaderboard_period(p_period text)
  returns table (user_id bigint, name text, avatar text, points int, you boolean)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select u.id::bigint                                                        as user_id,
         coalesce(nullif(trim(u.first_name), ''), split_part(u.email, '@', 1)) as name,
         u.avatar_link                                                       as avatar,
         coalesce(sum(up.points), 0)::int                                    as points,
         (u.id = (select id from public.users where lower(email) = lower(auth.jwt() ->> 'email'))) as you
  from public.users u
  join public.user_points up on up.user_id = u.id
  where case
          when p_period = 'week'  then up.created_at >= date_trunc('week',  now()::timestamp)
          when p_period = 'month' then up.created_at >= date_trunc('month', now()::timestamp)
          else true
        end
  group by u.id, u.first_name, u.email, u.avatar_link
  order by points desc
  limit 50;
$$;

grant execute on function public.mobile_leaderboard_period(text) to authenticated;

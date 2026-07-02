-- =============================================================================
-- mobile_checkin_history — the app's check-in history, unioning:
--   1. app-owned mobile_checkins (created in the mobile app), and
--   2. production daily_assessments (the full Rails check-in record: score=mood,
--      i_am=affirmation, tracking_used/amount=use).
-- Deduped by date, app row wins (pri 2 > 1). Email/uid-scoped.
--
-- Used for streaks + history so they reflect the user's REAL record, not just
-- app-created check-ins. Writes still go to the mobile_checkins TABLE; this view
-- is read-only. Guarded so it runs standalone before mobile-checkins.sql.
--
-- Idempotent.
-- =============================================================================
do $ch$
declare app_src text := '';
begin
  if to_regclass('public.mobile_checkins') is not null then
    app_src :=
      'select mc.date::date as date, mc.mood, mc.positive, mc.negative, mc.behavior, '
      || 'mc.amount, mc.use_count, mc.affirmation, 2 as pri '
      || 'from public.mobile_checkins mc where mc.auth_uid = auth.uid() union all ';
  end if;
  execute format($v$
    create or replace view mobile_checkin_history as
      with me as (
        select id from public.users where lower(email) = lower(auth.jwt() ->> 'email') limit 1
      ),
      rows as (
        %s
        select da.created_at::date                                   as date,
               da.score                                              as mood,
               '{}'::text[]                                          as positive,
               '{}'::text[]                                          as negative,
               case when da.tracking_used then 'yes' else 'no' end   as behavior,
               null::text                                            as amount,
               case when da.tracking_used
                    then coalesce(da.tracking_amount, 0)::text
                    else '' end                                      as use_count,
               coalesce(da.i_am, '')                                 as affirmation,
               1                                                     as pri
        from public.daily_assessments da
        join me on me.id = da.user_id
      )
      select distinct on (date)
             date, mood, positive, negative, behavior, amount, use_count, affirmation
      from rows
      order by date desc, pri desc
  $v$, app_src);
  execute 'grant select on mobile_checkin_history to authenticated';
end
$ch$;

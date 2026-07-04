-- =============================================================================
-- Promote a July tester → a real subscriber, keeping ALL their July data.
--
-- A tester's app data lives in the app-owned mobile_* tables keyed by auth.uid().
-- When they subscribe, a production `users` row exists for their email (created
-- by the subscription flow). This links that data to the new prod id by
-- backfilling app_user_id on every mobile_* table — so nothing is lost and, at
-- the eventual cutover, their July history reconciles to the right user.
--
-- It does NOT create the users row (that's the subscription flow's job, and it
-- owns the real schema); it links to whatever users row exists for the email, or
-- an id you pass explicitly.
--
-- ADMIN-ONLY: run in the Supabase SQL editor (as owner) or via the service role.
-- Deliberately NOT granted to `authenticated`. Idempotent — safe to re-run.
--
--   select public.mobile_promote_tester('tester@email.com');
--   -- or force a specific prod id:
--   select public.mobile_promote_tester('tester@email.com', 12345);
-- =============================================================================

create or replace function public.mobile_promote_tester(
  p_email   text,
  p_user_id integer default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid;
  v_user_id integer;
  r         record;
  v_n       integer;
  v_total   integer := 0;
  v_report  text := '';
begin
  -- 1. The tester's Supabase auth id — everything they made is keyed by this.
  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  if v_uid is null then
    return format('No Supabase auth user for "%s" — they must have signed in at least once.', p_email);
  end if;

  -- 2. Their production users row (created by the subscription flow), or an override.
  v_user_id := coalesce(
    p_user_id,
    (select id from public.users where lower(email) = lower(p_email) limit 1)
  );
  if v_user_id is null then
    return format(
      'No production users row for "%s" yet. Create the subscription first, then re-run '
      || '(or pass the id: select mobile_promote_tester(''%s'', <users.id>)).', p_email, p_email);
  end if;

  -- 3. Backfill app_user_id on every app-owned table that carries both auth_uid
  --    and app_user_id (covers current + future mobile_* tables automatically).
  for r in
    select c1.table_name
    from information_schema.columns c1
    join information_schema.columns c2
      on c1.table_schema = c2.table_schema and c1.table_name = c2.table_name
    where c1.table_schema = 'public'
      and c1.table_name like 'mobile\_%'
      and c1.column_name = 'auth_uid'
      and c2.column_name = 'app_user_id'
    order by c1.table_name
  loop
    execute format(
      'update public.%I set app_user_id = $1 where auth_uid = $2 and app_user_id is distinct from $1',
      r.table_name
    ) using v_user_id, v_uid;
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
    v_report := v_report || format('  %s: %s', r.table_name, v_n) || chr(10);
  end loop;

  return format('Promoted "%s" (auth %s -> users.id %s). Linked %s rows:%s%s',
                p_email, v_uid, v_user_id, v_total, chr(10), v_report);
end
$$;
-- Admin-only: NO grant to authenticated. Call it as the owner / service role.

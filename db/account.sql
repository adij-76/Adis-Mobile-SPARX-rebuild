-- =============================================================================
-- Account deletion (self-serve — GDPR / App-Store requirement).
--
-- The client can't delete auth.users or legacy prod rows (admin-only), so this
-- RPC deletes everything the APP owns for the caller immediately, and records a
-- deletion request for an admin/cron to complete the auth + legacy removal.
-- SECURITY DEFINER so it can delete across the RLS-scoped app-owned tables in
-- one call; scoped strictly to auth.uid() so a caller can only delete their own.
-- =============================================================================

create table if not exists public.mobile_deletion_requests (
  auth_uid     uuid primary key,
  email        text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.mobile_deletion_requests enable row level security;
revoke all on table public.mobile_deletion_requests from public, anon, authenticated;

create or replace function public.mobile_request_account_deletion()
  returns void
  language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  r     record;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- Delete the caller's rows from every app-owned table that carries auth_uid.
  for r in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'auth_uid'
      and c.table_name ~ '^mobile_'
      and c.table_name <> 'mobile_deletion_requests'
  loop
    execute format('delete from public.%I where auth_uid = $1', r.table_name) using v_uid;
  end loop;

  -- Record the request so an admin/cron completes auth + legacy-row removal.
  insert into public.mobile_deletion_requests (auth_uid, email)
  values (v_uid, nullif(auth.jwt() ->> 'email', ''))
  on conflict (auth_uid) do update set requested_at = now(), completed_at = null;
end $$;

revoke all on function public.mobile_request_account_deletion() from public, anon;
grant execute on function public.mobile_request_account_deletion() to authenticated;

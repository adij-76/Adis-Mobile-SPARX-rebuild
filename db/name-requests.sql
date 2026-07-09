-- =============================================================================
-- mobile_name_requests — member name-correction requests requiring admin review.
--
-- App-owned, additive, RLS. A member's FIRST name correction stays self-service
-- (see the app's rename logic); any further change is submitted here as a pending
-- request an admin approves in /admin. Approval writes the new name to the
-- requester's Supabase auth identity (raw_user_meta_data), the same place the app
-- reads the display name from.
--
-- Runs BEFORE harden-writes.sql so the bind trigger sets app_user_id server-side.
-- Idempotent.
-- =============================================================================

create table if not exists public.mobile_name_requests (
  id             bigint generated always as identity primary key,
  auth_uid       uuid    not null default auth.uid(),   -- requester
  app_user_id    integer,                                -- trigger-bound
  requested_name text    not null,
  status         text    not null default 'pending'
                   check (status in ('pending', 'approved', 'denied')),
  reviewed_by    text,                                   -- admin email who actioned it
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists mobile_name_requests_status
  on public.mobile_name_requests (status, created_at);
-- At most one OPEN request per member (a re-submit replaces the pending one).
create unique index if not exists mobile_name_requests_one_pending
  on public.mobile_name_requests (auth_uid) where (status = 'pending');

alter table public.mobile_name_requests enable row level security;

-- SELECT: your own requests, or any if you're an admin.
drop policy if exists mobile_name_requests_select on public.mobile_name_requests;
create policy mobile_name_requests_select on public.mobile_name_requests
  for select to authenticated
  using (auth_uid = auth.uid() or public.mobile_is_admin());

-- INSERT: only as yourself (app_user_id is trigger-bound).
drop policy if exists mobile_name_requests_insert on public.mobile_name_requests;
create policy mobile_name_requests_insert on public.mobile_name_requests
  for insert to authenticated
  with check (auth_uid = auth.uid());

grant select, insert on public.mobile_name_requests to authenticated;

-- The pending review queue as one JSON payload (admin-only; hard error otherwise).
create or replace function public.mobile_admin_name_requests()
  returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.mobile_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'requested_name', r.requested_name,
        'current_name', coalesce(nullif(trim(u.first_name), ''), au.raw_user_meta_data ->> 'name'),
        'email', au.email,
        'created_at', r.created_at
      ) order by r.created_at
    ),
    '[]'::jsonb
  )
  from public.mobile_name_requests r
  left join auth.users au on au.id = r.auth_uid
  left join public.users u on u.id = r.app_user_id
  where r.status = 'pending'
  into result;
  return result;
end $$;
revoke all on function public.mobile_admin_name_requests() from public, anon;
grant execute on function public.mobile_admin_name_requests() to authenticated, service_role;

-- Approve/deny a request (admin-only). On approve, write the name to the
-- requester's auth identity (raw_user_meta_data) — mirrors auth-and-storage.sql's
-- metadata re-sync — so it becomes their display name everywhere at once.
create or replace function public.mobile_review_name_request(p_id bigint, p_approve boolean)
  returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_req record;
begin
  if not public.mobile_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into v_req from public.mobile_name_requests where id = p_id and status = 'pending';
  if not found then return; end if;

  if p_approve then
    update auth.users
      set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object(
             'name', v_req.requested_name,
             'full_name', v_req.requested_name,
             'name_updated_at', now()::text
           )
      where id = v_req.auth_uid;
  end if;

  update public.mobile_name_requests
    set status = case when p_approve then 'approved' else 'denied' end,
        reviewed_by = nullif(auth.jwt() ->> 'email', ''),
        updated_at = now()
    where id = p_id;
end $$;
revoke all on function public.mobile_review_name_request(bigint, boolean) from public, anon;
grant execute on function public.mobile_review_name_request(bigint, boolean) to authenticated, service_role;

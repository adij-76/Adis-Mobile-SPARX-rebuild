-- =============================================================================
-- mobile_connections — member "allies" / accountability connections.
--
-- App-owned, additive, reversible: a new table + one helper + one read view.
-- Touches no production data and no existing mobile_* object, so it cannot
-- affect the live app until the app build that uses it ships.
--
-- Model: a directed request keyed by the REQUESTER's auth.uid() and the
-- ADDRESSEE's production users.id (which is exactly the author id posts carry,
-- so the quick-profile "Connect" button has it in hand). The requester's own
-- app_user_id is bound SERVER-SIDE by the harden-writes trigger (this file runs
-- before harden-writes.sql in the apply order), never trusted from the client.
--
-- Idempotent: safe to re-run.
-- =============================================================================

-- The caller's production users.id, resolved from their verified auth identity.
-- SECURITY DEFINER so RLS policies / the read view can map auth.uid() → users.id
-- without granting authenticated direct read on the base table.
create or replace function public.mobile_caller_app_user_id()
  returns integer
  language sql
  stable
  security definer
  set search_path = public
as $$
  select u.id
  from public.users u
  where lower(u.email) = lower(auth.jwt() ->> 'email')
  limit 1
$$;
revoke all on function public.mobile_caller_app_user_id() from public, anon;
grant execute on function public.mobile_caller_app_user_id() to authenticated;

create table if not exists public.mobile_connections (
  id                     bigint generated always as identity primary key,
  auth_uid               uuid    not null default auth.uid(),   -- requester
  app_user_id            integer,                                -- requester's users.id (trigger-bound)
  addressee_app_user_id  integer not null,                       -- target users.id (post.authorId)
  status                 text    not null default 'pending'
                           check (status in ('pending', 'accepted', 'declined')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- One active request per (requester, addressee); a re-request upserts.
create unique index if not exists mobile_connections_req_addr
  on public.mobile_connections (auth_uid, addressee_app_user_id);

alter table public.mobile_connections enable row level security;

-- SELECT: the requester (by auth.uid()) or the addressee (by their users.id).
drop policy if exists mobile_connections_select on public.mobile_connections;
create policy mobile_connections_select on public.mobile_connections
  for select to authenticated
  using (auth_uid = auth.uid() or addressee_app_user_id = public.mobile_caller_app_user_id());

-- INSERT: only as yourself (app_user_id is trigger-bound; addressee is the target).
drop policy if exists mobile_connections_insert on public.mobile_connections;
create policy mobile_connections_insert on public.mobile_connections
  for insert to authenticated
  with check (auth_uid = auth.uid());

-- UPDATE: the addressee accepts/declines; the requester may cancel their own.
drop policy if exists mobile_connections_update on public.mobile_connections;
create policy mobile_connections_update on public.mobile_connections
  for update to authenticated
  using (addressee_app_user_id = public.mobile_caller_app_user_id() or auth_uid = auth.uid())
  with check (addressee_app_user_id = public.mobile_caller_app_user_id() or auth_uid = auth.uid());

grant select, insert, update on public.mobile_connections to authenticated;

-- The caller's connections in both directions, with the OTHER person's public
-- identity (name/avatar only — no clinical fields). `direction` tells the app
-- whether an incoming pending row is theirs to accept.
create or replace view public.mobile_my_connections as
  select c.id,
         c.status,
         case when c.auth_uid = auth.uid() then 'outgoing' else 'incoming' end as direction,
         other.id                                                              as user_id,
         coalesce(nullif(trim(other.first_name), ''), nullif(other.user_handle, ''), 'Member') as name,
         other.avatar_link                                                     as avatar,
         c.created_at
  from public.mobile_connections c
  join public.users other
    on other.id = case
                    when c.auth_uid = auth.uid() then c.addressee_app_user_id
                    else c.app_user_id
                  end
  where c.auth_uid = auth.uid()
     or c.addressee_app_user_id = public.mobile_caller_app_user_id();

grant select on public.mobile_my_connections to authenticated;

-- =============================================================================
-- Chat / direct messages — app-owned (production community_messages is empty, so
-- DMs live here going forward). Model is sender→recipient by production users.id
-- (no conversation table needed); a "thread" is all messages between two users.
--
--   mobile_messages  — one row per DM (sender_id, recipient_id, content, read_at)
--   mobile_blocks    — "I blocked X"; blocks are one-directional (a blocked user
--                      can't DM the blocker). "DM anyone unless blocked."
-- Read views: mobile_threads (list), mobile_thread_messages (one thread),
--             mobile_directory (searchable users to start a DM with).
--
-- RLS scopes rows to the participants. On the final sync these reconcile into
-- production community_conversations/community_messages. Idempotent.
-- =============================================================================

-- --- caller's production id -------------------------------------------------
-- Resolve the caller's public.users.id from their JWT email. SECURITY DEFINER so
-- it works inside RLS policies too: policy expressions run as the `authenticated`
-- role, which has no direct SELECT on public.users — a plain subquery there would
-- return nothing and silently break every DM. Running as the function owner
-- bypasses that. STABLE = evaluated once per statement.
create or replace function public.mobile_uid()
  returns integer
  language sql
  stable
  security definer
  set search_path = public
as $$
  select id from public.users where lower(email) = lower(auth.jwt() ->> 'email') limit 1
$$;
grant execute on function public.mobile_uid() to authenticated;

-- --- messages ---------------------------------------------------------------
create table if not exists public.mobile_messages (
  id           bigint generated always as identity primary key,
  auth_uid     uuid        not null default auth.uid(),   -- sender's auth id
  sender_id    integer,                                   -- sender production users.id
  recipient_id integer     not null,                      -- recipient production users.id
  content      text        not null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);
create index if not exists mobile_messages_pair on public.mobile_messages (sender_id, recipient_id, created_at);
create index if not exists mobile_messages_inbox on public.mobile_messages (recipient_id, created_at);

alter table public.mobile_messages enable row level security;

-- Rows are visible to either participant. I see messages I sent (auth_uid) and
-- messages addressed to me (recipient_id = my production id).
drop policy if exists mobile_messages_select on public.mobile_messages;
create policy mobile_messages_select on public.mobile_messages
  for select to authenticated using (
    auth_uid = auth.uid()
    or recipient_id = public.mobile_uid()
  );

-- I can only insert as myself, and not to someone who has blocked me.
drop policy if exists mobile_messages_insert on public.mobile_messages;
create policy mobile_messages_insert on public.mobile_messages
  for insert to authenticated with check (
    auth_uid = auth.uid()
    and not exists (
      select 1 from public.mobile_blocks b
      where b.blocked_id = public.mobile_uid()
        and b.blocker_id = recipient_id and b.active
    )
  );

-- The recipient marks messages read (sets read_at).
drop policy if exists mobile_messages_update on public.mobile_messages;
create policy mobile_messages_update on public.mobile_messages
  for update to authenticated using (
    recipient_id = public.mobile_uid()
  );

grant select, insert, update on public.mobile_messages to authenticated;

-- --- blocks -----------------------------------------------------------------
create table if not exists public.mobile_blocks (
  id         bigint generated always as identity primary key,
  auth_uid   uuid        not null default auth.uid(),
  blocker_id integer,                                     -- me (production id)
  blocked_id integer     not null,                        -- them
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists mobile_blocks_uniq on public.mobile_blocks (auth_uid, blocked_id);

alter table public.mobile_blocks enable row level security;
drop policy if exists mobile_blocks_select on public.mobile_blocks;
create policy mobile_blocks_select on public.mobile_blocks
  for select to authenticated using (auth_uid = auth.uid());
drop policy if exists mobile_blocks_insert on public.mobile_blocks;
create policy mobile_blocks_insert on public.mobile_blocks
  for insert to authenticated with check (auth_uid = auth.uid());
drop policy if exists mobile_blocks_update on public.mobile_blocks;
create policy mobile_blocks_update on public.mobile_blocks
  for update to authenticated using (auth_uid = auth.uid());
grant select, insert, update on public.mobile_blocks to authenticated;

-- --- read views -------------------------------------------------------------

-- Directory of people you can DM (everyone but yourself). App searches by name
-- or handle. Excludes people who have blocked you.
create or replace view mobile_directory as
  select u.id,
         coalesce(nullif(trim(u.first_name), ''), split_part(u.email, '@', 1)) as name,
         u.avatar_link as avatar,
         u.user_handle as handle
  from public.users u
  where u.id <> public.mobile_uid()
    and not exists (
      select 1 from public.mobile_blocks b
      where b.blocker_id = u.id and b.blocked_id = public.mobile_uid() and b.active
    );
grant select on mobile_directory to authenticated;

-- The caller's threads: one row per other participant, with the last message +
-- unread count (messages they sent me that I haven't read).
create or replace view mobile_threads as
  with msgs as (
    select case when m.sender_id = public.mobile_uid() then m.recipient_id else m.sender_id end as other_id,
           m.sender_id, m.content, m.created_at, m.read_at
    from public.mobile_messages m
    where m.sender_id = public.mobile_uid() or m.recipient_id = public.mobile_uid()
  ),
  latest as (
    select distinct on (other_id) other_id, content, created_at
    from msgs
    order by other_id, created_at desc
  )
  select l.other_id            as user_id,
         coalesce(nullif(trim(u.first_name), ''), split_part(u.email, '@', 1)) as name,
         u.avatar_link         as avatar,
         u.user_handle         as handle,
         l.content             as last_message,
         l.created_at          as last_at,
         (select count(*) from msgs x
           where x.other_id = l.other_id and x.sender_id = l.other_id and x.read_at is null) as unread
  from latest l
  join public.users u on u.id = l.other_id
  order by l.created_at desc;
grant select on mobile_threads to authenticated;

-- All the caller's messages, with `other_id` (the other participant) to filter a
-- thread and `mine` for bubble side.
create or replace view mobile_thread_messages as
  select 'm' || m.id as id,
         case when m.sender_id = public.mobile_uid() then m.recipient_id else m.sender_id end as other_id,
         (m.sender_id = public.mobile_uid()) as mine,
         m.content,
         m.created_at,
         m.read_at
  from public.mobile_messages m
  where m.sender_id = public.mobile_uid() or m.recipient_id = public.mobile_uid()
  order by m.created_at;
grant select on mobile_thread_messages to authenticated;

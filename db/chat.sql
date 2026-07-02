-- =============================================================================
-- Chat / direct + group messages — app-owned (production community_messages is
-- empty, so chat lives here going forward). A CONVERSATION has N members; a 1:1
-- DM is just a 2-member, non-group conversation. "DM anyone unless they've
-- blocked you"; group chats can have any number of people.
--
--   mobile_conversations         — a thread (is_group, optional title)
--   mobile_conversation_members  — who's in it (+ my last_read_at for unread)
--   mobile_messages              — messages in a conversation
--   mobile_blocks                — one-directional block list
-- RPCs: mobile_start_direct(other) / mobile_start_group(members[], title) —
--   find-or-create a conversation and return its id (block-aware).
-- Read views: mobile_threads (list), mobile_thread_messages (one thread),
--   mobile_directory (searchable people to start a chat with).
--
-- RLS scopes every row to conversation members. Membership is checked through
-- SECURITY DEFINER helpers (mobile_is_member) so member-table policies don't
-- recurse into themselves. Idempotent — safe to re-run.
--
-- NOTE: this reshapes the earlier 1:1-only chat schema. It DROPs the old
-- mobile_messages (sender/recipient) + its views and rebuilds them; there was no
-- production DM data to preserve (community_messages is empty).
-- =============================================================================

-- --- caller's production id (used everywhere, incl. inside RLS) --------------
-- SECURITY DEFINER: policy/if-checks run as the `authenticated` role, which has
-- no direct SELECT on public.users — running as the function owner resolves the
-- id anyway. STABLE = evaluated once per statement.
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

-- --- blocks (unchanged shape) -----------------------------------------------
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

-- --- drop the old 1:1 chat objects (reshape) --------------------------------
drop view if exists mobile_threads;
drop view if exists mobile_thread_messages;
drop table if exists public.mobile_messages cascade;

-- --- conversations ----------------------------------------------------------
create table if not exists public.mobile_conversations (
  id         bigint generated always as identity primary key,
  auth_uid   uuid        not null default auth.uid(),     -- creator
  title      text,                                        -- optional group name
  is_group   boolean     not null default false,
  created_at timestamptz not null default now()
);
alter table public.mobile_conversations enable row level security;

create table if not exists public.mobile_conversation_members (
  id              bigint generated always as identity primary key,
  conversation_id bigint      not null references public.mobile_conversations(id) on delete cascade,
  member_id       integer     not null,                   -- production users.id
  last_read_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (conversation_id, member_id)
);
create index if not exists mobile_conv_members_member on public.mobile_conversation_members (member_id);
alter table public.mobile_conversation_members enable row level security;

-- Am I a member of this conversation? SECURITY DEFINER so the member-table
-- policies can call it without recursing into their own RLS.
create or replace function public.mobile_is_member(conv bigint)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.mobile_conversation_members m
    where m.conversation_id = conv and m.member_id = public.mobile_uid()
  )
$$;
grant execute on function public.mobile_is_member(bigint) to authenticated;

-- Has anyone else in this conversation blocked me? (For the "can't message" rule.)
-- DEFINER so it can see others' blocks, which the blocks RLS otherwise hides.
create or replace function public.mobile_blocked_in(conv bigint)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
    from public.mobile_conversation_members m
    join public.mobile_blocks b on b.blocker_id = m.member_id
    where m.conversation_id = conv
      and m.member_id <> public.mobile_uid()
      and b.blocked_id = public.mobile_uid()
      and b.active
  )
$$;
grant execute on function public.mobile_blocked_in(bigint) to authenticated;

-- conversations: visible to members; I can create one.
drop policy if exists mobile_conversations_select on public.mobile_conversations;
create policy mobile_conversations_select on public.mobile_conversations
  for select to authenticated using (public.mobile_is_member(id));
drop policy if exists mobile_conversations_insert on public.mobile_conversations;
create policy mobile_conversations_insert on public.mobile_conversations
  for insert to authenticated with check (auth_uid = auth.uid());
grant select, insert on public.mobile_conversations to authenticated;

-- members: visible to co-members; the creator can add members; I can update my
-- own row (last_read_at).
drop policy if exists mobile_members_select on public.mobile_conversation_members;
create policy mobile_members_select on public.mobile_conversation_members
  for select to authenticated using (public.mobile_is_member(conversation_id));
drop policy if exists mobile_members_insert on public.mobile_conversation_members;
create policy mobile_members_insert on public.mobile_conversation_members
  for insert to authenticated with check (
    exists (select 1 from public.mobile_conversations c
             where c.id = conversation_id and c.auth_uid = auth.uid())
  );
drop policy if exists mobile_members_update on public.mobile_conversation_members;
create policy mobile_members_update on public.mobile_conversation_members
  for update to authenticated
  using (member_id = public.mobile_uid())
  with check (member_id = public.mobile_uid());
grant select, insert, update on public.mobile_conversation_members to authenticated;

-- --- messages ---------------------------------------------------------------
create table if not exists public.mobile_messages (
  id              bigint generated always as identity primary key,
  auth_uid        uuid        not null default auth.uid(), -- sender's auth id
  sender_id       integer,                                 -- sender production users.id
  conversation_id bigint      not null references public.mobile_conversations(id) on delete cascade,
  content         text        not null,
  created_at      timestamptz not null default now()
);
create index if not exists mobile_messages_conv on public.mobile_messages (conversation_id, created_at);
alter table public.mobile_messages enable row level security;

-- I see messages in my conversations; I can post as myself to a conversation I'm
-- in, unless a member has blocked me.
drop policy if exists mobile_messages_select on public.mobile_messages;
create policy mobile_messages_select on public.mobile_messages
  for select to authenticated using (public.mobile_is_member(conversation_id));
drop policy if exists mobile_messages_insert on public.mobile_messages;
create policy mobile_messages_insert on public.mobile_messages
  for insert to authenticated with check (
    auth_uid = auth.uid()
    and public.mobile_is_member(conversation_id)
    and not public.mobile_blocked_in(conversation_id)
  );
grant select, insert on public.mobile_messages to authenticated;

-- --- start-a-conversation RPCs (find-or-create, block-aware) ----------------
-- 1:1: reuse the existing 2-person conversation if there is one, else create it.
create or replace function public.mobile_start_direct(other integer)
  returns bigint
  language plpgsql
  security definer
  set search_path = public
as $$
declare me integer := public.mobile_uid(); conv bigint;
begin
  if me is null then raise exception 'not signed in'; end if;
  if other is null or other = me then raise exception 'invalid recipient'; end if;
  if exists (select 1 from public.mobile_blocks b
              where b.blocker_id = other and b.blocked_id = me and b.active) then
    raise exception 'blocked';
  end if;
  select c.id into conv
  from public.mobile_conversations c
  where not c.is_group
    and (select count(*) from public.mobile_conversation_members m where m.conversation_id = c.id) = 2
    and exists (select 1 from public.mobile_conversation_members m where m.conversation_id = c.id and m.member_id = me)
    and exists (select 1 from public.mobile_conversation_members m where m.conversation_id = c.id and m.member_id = other)
  limit 1;
  if conv is not null then return conv; end if;
  insert into public.mobile_conversations(auth_uid, is_group) values (auth.uid(), false) returning id into conv;
  insert into public.mobile_conversation_members(conversation_id, member_id) values (conv, me), (conv, other);
  return conv;
end $$;
grant execute on function public.mobile_start_direct(integer) to authenticated;

-- Group: always a new conversation. Skips members who've blocked me and dupes.
create or replace function public.mobile_start_group(members integer[], title text default null)
  returns bigint
  language plpgsql
  security definer
  set search_path = public
as $$
declare me integer := public.mobile_uid(); conv bigint; m integer;
begin
  if me is null then raise exception 'not signed in'; end if;
  insert into public.mobile_conversations(auth_uid, is_group, title)
    values (auth.uid(), true, nullif(trim(title), '')) returning id into conv;
  insert into public.mobile_conversation_members(conversation_id, member_id) values (conv, me);
  foreach m in array coalesce(members, '{}') loop
    if m is not null and m <> me
       and not exists (select 1 from public.mobile_blocks b where b.blocker_id = m and b.blocked_id = me and b.active)
       and not exists (select 1 from public.mobile_conversation_members x where x.conversation_id = conv and x.member_id = m)
    then
      insert into public.mobile_conversation_members(conversation_id, member_id) values (conv, m);
    end if;
  end loop;
  return conv;
end $$;
grant execute on function public.mobile_start_group(integer[], text) to authenticated;

-- --- read views -------------------------------------------------------------

-- People you can DM: everyone but yourself, minus anyone who's blocked you.
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

-- The caller's threads: one row per conversation I'm in, with a display name
-- (group title, else the other members' names), an avatar (the other person for
-- a 1:1), last message, and my unread count.
create or replace view mobile_threads as
  with my_convs as (
    select cm.conversation_id, cm.last_read_at
    from public.mobile_conversation_members cm
    where cm.member_id = public.mobile_uid()
  ),
  others as (
    select cm.conversation_id,
           array_agg(coalesce(nullif(trim(u.first_name), ''), split_part(u.email, '@', 1))
                     order by cm.member_id)            as names,
           (array_agg(u.avatar_link order by cm.member_id))[1] as first_avatar,
           (array_agg(cm.member_id order by cm.member_id))[1]  as first_member,
           count(*)                                    as other_count
    from public.mobile_conversation_members cm
    join my_convs mc on mc.conversation_id = cm.conversation_id
    join public.users u on u.id = cm.member_id
    where cm.member_id <> public.mobile_uid()
    group by cm.conversation_id
  ),
  last_msg as (
    select distinct on (msg.conversation_id) msg.conversation_id, msg.content, msg.created_at
    from public.mobile_messages msg
    join my_convs mc on mc.conversation_id = msg.conversation_id
    order by msg.conversation_id, msg.created_at desc
  )
  select c.id                                          as conversation_id,
         c.is_group,
         coalesce(nullif(trim(c.title), ''), array_to_string(o.names, ', '), 'Conversation') as name,
         case when c.is_group then null else o.first_avatar end as avatar,
         case when c.is_group then null else o.first_member end as peer_id,
         coalesce(o.other_count, 0)                    as other_count,
         lm.content                                    as last_message,
         lm.created_at                                 as last_at,
         (select count(*) from public.mobile_messages m2
           where m2.conversation_id = c.id
             and m2.sender_id is distinct from public.mobile_uid()
             and (mc.last_read_at is null or m2.created_at > mc.last_read_at)) as unread
  from my_convs mc
  join public.mobile_conversations c on c.id = mc.conversation_id
  left join others o   on o.conversation_id = c.id
  left join last_msg lm on lm.conversation_id = c.id
  order by lm.created_at desc nulls last;
grant select on mobile_threads to authenticated;

-- All messages in the caller's conversations, with sender name/avatar (for group
-- bubbles) and `mine` for bubble side. App filters by conversation_id.
create or replace view mobile_thread_messages as
  select 'm' || m.id                                    as id,
         m.conversation_id,
         (m.auth_uid = auth.uid())                      as mine,
         m.sender_id,
         coalesce(nullif(trim(u.first_name), ''), split_part(u.email, '@', 1)) as sender_name,
         u.avatar_link                                  as sender_avatar,
         m.content,
         m.created_at
  from public.mobile_messages m
  left join public.users u on u.id = m.sender_id
  where public.mobile_is_member(m.conversation_id)
  order by m.created_at;
grant select on mobile_thread_messages to authenticated;

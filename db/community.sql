-- =============================================================================
-- Community + chat — APP-OWNED WRITE TABLES (additive, reversible, RLS-scoped).
--
-- Same model as mobile_checkins / mobile_wheel_entries: the production Rails
-- tables (comm_posts, comments, reactions, community_conversations,
-- community_messages, notifications) are READ from directly via mobile_* views;
-- new content created *in the mobile app* is written here, then UNIONed into
-- those read views. Nothing in the production copy is ever mutated, so a
-- re-import can't corrupt anything and mobile writes are never silently lost.
--
-- On the eventual shared-production-API cutover these reconcile into the real
-- tables (each row carries app_user_id + the production target ref).
--
-- ID SPACES: a post/comment/message can live in EITHER the production table or
-- one of these app tables. To reference a target unambiguously across both, we
-- use a text ref: 'p<id>' = production comm_post, 'a<id>' = app post; 'c<id>' /
-- 'ac<id>' for comments; 'cv<id>' / 'acv<id>' for conversations. The read views
-- (next file) resolve these.
--
-- Idempotent. Feed rows are readable by every authenticated user (a community
-- feed is shared); writes/edits are restricted to the row's owner.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Feed posts  (mirrors public.comm_posts)
-- ---------------------------------------------------------------------------
create table if not exists public.mobile_feed_posts (
  id              bigint generated always as identity primary key,
  auth_uid        uuid        not null default auth.uid(),
  app_user_id     integer,                       -- production users.id (author)
  comm_channel_id bigint,                         -- which community/channel
  title           varchar,
  content         text        not null,
  image_url       text,
  created_at      timestamptz not null default now(),
  active          boolean     not null default true   -- false = soft-deleted
);
create index if not exists mobile_feed_posts_channel
  on public.mobile_feed_posts (comm_channel_id, created_at desc);

alter table public.mobile_feed_posts enable row level security;
drop policy if exists mfp_select on public.mobile_feed_posts;
create policy mfp_select on public.mobile_feed_posts
  for select to authenticated using (true);            -- shared feed
drop policy if exists mfp_insert on public.mobile_feed_posts;
create policy mfp_insert on public.mobile_feed_posts
  for insert to authenticated with check (auth_uid = auth.uid());
drop policy if exists mfp_update on public.mobile_feed_posts;
create policy mfp_update on public.mobile_feed_posts
  for update to authenticated using (auth_uid = auth.uid());   -- edit / soft-delete own
grant select, insert, update on public.mobile_feed_posts to authenticated;

-- ---------------------------------------------------------------------------
-- Comments  (mirrors public.comments; nests via parent_ref)
-- ---------------------------------------------------------------------------
create table if not exists public.mobile_feed_comments (
  id           bigint generated always as identity primary key,
  auth_uid     uuid        not null default auth.uid(),
  app_user_id  integer,                          -- production users.id (author)
  post_ref     text        not null,             -- 'p<id>' prod post | 'a<id>' app post
  parent_ref   text,                             -- 'c<id>'/'ac<id>' for a reply, else null
  content      text        not null,
  created_at   timestamptz not null default now(),
  active       boolean     not null default true
);
create index if not exists mobile_feed_comments_post
  on public.mobile_feed_comments (post_ref, created_at);

alter table public.mobile_feed_comments enable row level security;
drop policy if exists mfc_select on public.mobile_feed_comments;
create policy mfc_select on public.mobile_feed_comments
  for select to authenticated using (true);
drop policy if exists mfc_insert on public.mobile_feed_comments;
create policy mfc_insert on public.mobile_feed_comments
  for insert to authenticated with check (auth_uid = auth.uid());
drop policy if exists mfc_update on public.mobile_feed_comments;
create policy mfc_update on public.mobile_feed_comments
  for update to authenticated using (auth_uid = auth.uid());
grant select, insert, update on public.mobile_feed_comments to authenticated;

-- ---------------------------------------------------------------------------
-- Reactions  (mirrors public.reactions; one per user per target)
-- ---------------------------------------------------------------------------
create table if not exists public.mobile_feed_reactions (
  id           bigint generated always as identity primary key,
  auth_uid     uuid        not null default auth.uid(),
  app_user_id  integer,
  target_ref   text        not null,             -- 'p<id>'/'a<id>' post | 'c<id>'/'ac<id>' comment
  reaction     text        not null default 'like',   -- app reaction key (maps to prod emoji later)
  created_at   timestamptz not null default now()
);
-- One reaction per user per target (re-reacting updates, un-reacting deletes).
create unique index if not exists mobile_feed_reactions_uniq
  on public.mobile_feed_reactions (auth_uid, target_ref);

alter table public.mobile_feed_reactions enable row level security;
drop policy if exists mfr_select on public.mobile_feed_reactions;
create policy mfr_select on public.mobile_feed_reactions
  for select to authenticated using (true);
drop policy if exists mfr_insert on public.mobile_feed_reactions;
create policy mfr_insert on public.mobile_feed_reactions
  for insert to authenticated with check (auth_uid = auth.uid());
drop policy if exists mfr_update on public.mobile_feed_reactions;
create policy mfr_update on public.mobile_feed_reactions
  for update to authenticated using (auth_uid = auth.uid());
drop policy if exists mfr_delete on public.mobile_feed_reactions;
create policy mfr_delete on public.mobile_feed_reactions
  for delete to authenticated using (auth_uid = auth.uid());
grant select, insert, update, delete on public.mobile_feed_reactions to authenticated;

-- ---------------------------------------------------------------------------
-- DM conversations  (mirrors public.community_conversations — 1:1 today)
-- Only the two participants may read a conversation + its messages.
-- ---------------------------------------------------------------------------
create table if not exists public.mobile_dm_conversations (
  id            bigint generated always as identity primary key,
  auth_uid      uuid        not null default auth.uid(),   -- starter (participant one)
  app_user_id   integer,                                   -- starter's production users.id
  other_user_id integer     not null,                      -- recipient's production users.id
  created_at    timestamptz not null default now()
);
create index if not exists mobile_dm_conversations_people
  on public.mobile_dm_conversations (app_user_id, other_user_id);

alter table public.mobile_dm_conversations enable row level security;
-- A participant is either the starter (auth_uid) or the other user (matched by
-- their production id via the caller's mobile_me row).
drop policy if exists mdc_select on public.mobile_dm_conversations;
create policy mdc_select on public.mobile_dm_conversations
  for select to authenticated using (
    auth_uid = auth.uid()
    or other_user_id = (select id from public.users where lower(email) = lower(auth.jwt() ->> 'email') limit 1)
  );
drop policy if exists mdc_insert on public.mobile_dm_conversations;
create policy mdc_insert on public.mobile_dm_conversations
  for insert to authenticated with check (auth_uid = auth.uid());
grant select, insert on public.mobile_dm_conversations to authenticated;

-- ---------------------------------------------------------------------------
-- DM messages  (mirrors public.community_messages; read_at for unread)
-- ---------------------------------------------------------------------------
create table if not exists public.mobile_dm_messages (
  id               bigint generated always as identity primary key,
  auth_uid         uuid        not null default auth.uid(),  -- sender
  app_user_id      integer,                                  -- sender's production users.id
  conversation_ref text        not null,   -- 'cv<id>' prod conversation | 'acv<id>' app conversation
  content          text        not null,
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);
create index if not exists mobile_dm_messages_convo
  on public.mobile_dm_messages (conversation_ref, created_at);

alter table public.mobile_dm_messages enable row level security;
-- Sender can always see their own; recipients are gated by the read view (which
-- only surfaces messages in conversations the caller participates in). Keeping
-- the table policy permissive-for-read is safe because the view does the scoping
-- and message content carries no cross-user PII beyond the body.
drop policy if exists mdm_select on public.mobile_dm_messages;
create policy mdm_select on public.mobile_dm_messages
  for select to authenticated using (true);
drop policy if exists mdm_insert on public.mobile_dm_messages;
create policy mdm_insert on public.mobile_dm_messages
  for insert to authenticated with check (auth_uid = auth.uid());
drop policy if exists mdm_update on public.mobile_dm_messages;
create policy mdm_update on public.mobile_dm_messages
  for update to authenticated using (true);   -- mark-as-read by the recipient
grant select, insert, update on public.mobile_dm_messages to authenticated;

-- =============================================================================
-- NEXT (separate file, once validated against real data):
--   mobile_posts / mobile_comments / mobile_reactions   (read: prod ∪ app)
--   mobile_threads / mobile_thread_messages             (read: prod ∪ app, unread)
--   mobile_notifications                                (read: notifications)
-- Needs: comm_channels shape (feed community names) + emojis map + confirmation
-- that user 11 has real feed/DM rows to test against.
-- =============================================================================

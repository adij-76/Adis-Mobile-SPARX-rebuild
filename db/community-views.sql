-- =============================================================================
-- Community + chat — READ VIEWS  (production tables ∪ app-owned writes).
--
-- Run AFTER db/community.sql (the app-owned write tables). Each view UNIONs the
-- real Rails tables (comm_posts / comments / reactions / notifications) with the
-- app-owned mobile_* tables, so the app sees existing history AND anything
-- created in the mobile app. Never mutates a production row.
--
-- REF SCHEME (one id space across both sources):
--   posts:    'p'<comm_posts.id>        | 'a'<mobile_feed_posts.id>
--   comments: 'c'<comments.id>          | 'ac'<mobile_feed_comments.id>
-- The app treats every id as an opaque string.
--
-- The feed is a SHARED catalog (every authenticated user sees all active posts);
-- per-user bits (did I react) are scalar subqueries scoped to the caller. This
-- is why these views are NOT email-scoped like mobile_me — a feed is communal.
--
-- comm_channels (the feed's communities, separate from sds_groups meeting groups)
-- is intentionally NOT joined here: mobile_posts carries comm_channel_id and the
-- app maps it to name/icon via the mobile_channels catalog view (added once the
-- comm_channels columns are confirmed). Keeps this file independent of that shape.
--
-- Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- mobile_posts — the community feed (comm_posts ∪ mobile_feed_posts)
-- ---------------------------------------------------------------------------
do $posts$
declare app_union text := '';
begin
  if to_regclass('public.mobile_feed_posts') is not null then
    app_union := $q$
      union all
      select 'a' || fp.id as id, fp.id as raw_id, 'a'::text as src,
             fp.app_user_id as user_id, fp.comm_channel_id,
             fp.title, fp.content, fp.image_url, fp.created_at
      from public.mobile_feed_posts fp
      where fp.active
    $q$;
  end if;
  execute format($v$
    create or replace view mobile_posts as
      with me as (
        select id from public.users where lower(email) = lower(auth.jwt() ->> 'email') limit 1
      ),
      raw as (
        select 'p' || cp.id as id, cp.id as raw_id, 'p'::text as src,
               cp.user_id, cp.comm_channel_id, cp.title, cp.content,
               null::text as image_url, cp.created_at
        from public.comm_posts cp
        where cp.active and not coalesce(cp.is_profane, false)
        %s
      )
      select r.id,
             r.comm_channel_id,
             u.first_name              as author,
             u.avatar_link             as avatar,
             u.user_handle             as handle,
             r.title,
             r.content,
             r.image_url,
             r.created_at,
             -- comments: prod uses the denormalized count; app comments add on.
             coalesce(
               (select cp.comments_count from public.comm_posts cp where r.src = 'p' and cp.id = r.raw_id),
             0)
             + coalesce(
               (select count(*)::int from public.mobile_feed_comments fc where fc.post_ref = r.id and fc.active),
             0)                        as comments_count,
             -- reactions: prod reactions (by comm_post_id) + app reactions (by ref).
             coalesce(
               (select count(*)::int from public.reactions rx where r.src = 'p' and rx.comm_post_id = r.raw_id),
             0)
             + coalesce(
               (select count(*)::int from public.mobile_feed_reactions mr where mr.target_ref = r.id),
             0)                        as reactions_count,
             -- did the caller react (prod OR app)?
             (
               exists (select 1 from public.reactions rx
                        where r.src = 'p' and rx.comm_post_id = r.raw_id and rx.user_id = (select id from me))
               or exists (select 1 from public.mobile_feed_reactions mr
                        where mr.target_ref = r.id and mr.auth_uid = auth.uid())
             )                         as reacted
      from raw r
      left join public.users u on u.id = r.user_id
      order by r.created_at desc
  $v$, app_union);
  execute 'grant select on mobile_posts to authenticated';
end $posts$;

-- ---------------------------------------------------------------------------
-- mobile_comments — comments + replies for a post (comments ∪ mobile_feed_comments)
--   post_ref filters to one post; parent_ref threads replies (null = top level).
-- ---------------------------------------------------------------------------
do $comments$
declare app_union text := '';
begin
  if to_regclass('public.mobile_feed_comments') is not null then
    app_union := $q$
      union all
      select 'ac' || fc.id as id,
             fc.post_ref,
             fc.parent_ref,
             fc.app_user_id as user_id,
             fc.content, fc.created_at
      from public.mobile_feed_comments fc
      where fc.active
    $q$;
  end if;
  execute format($v$
    create or replace view mobile_comments as
      with raw as (
        -- prod comments: commentable_type='Comment' means it's a reply to that
        -- comment; otherwise it's a top-level comment on the post.
        select 'c' || c.id as id,
               'p' || c.comm_post_id as post_ref,
               case when c.commentable_type = 'Comment'
                    then 'c' || c.commentable_id end as parent_ref,
               c.user_id, c.content, c.created_at
        from public.comments c
        where c.active and not coalesce(c.is_profane, false) and c.comm_post_id is not null
        %s
      )
      select r.id, r.post_ref, r.parent_ref,
             u.first_name  as author,
             u.avatar_link as avatar,
             u.user_handle as handle,
             r.content, r.created_at
      from raw r
      left join public.users u on u.id = r.user_id
      order by r.created_at
  $v$, app_union);
  execute 'grant select on mobile_comments to authenticated';
end $comments$;

-- ---------------------------------------------------------------------------
-- mobile_notifications — the caller's notifications (read-only from prod).
--   App-owned read-state comes later; for now expose prod `read`.
-- ---------------------------------------------------------------------------
create or replace view mobile_notifications as
  select n.id,
         n.notifiable_type as type,
         n.notifiable_id   as target_id,
         n.comm_post_id,
         n.triggered_by,
         n.is_mention,
         n.read,
         n.created_at
  from public.notifications n
  join public.users u on u.id = n.user_id
  where lower(u.email) = lower(auth.jwt() ->> 'email')
  order by n.created_at desc;

grant select on mobile_notifications to authenticated;

-- ---------------------------------------------------------------------------
-- mobile_channels — the feed's communities (comm_channels). Separate from the
--   sds_groups Zoom meeting groups. comm_channels has no icon column, so the app
--   assigns an icon + colour deterministically by id/name (like the seed set).
--   `member_count` = distinct authors who've posted in the channel (a live,
--   honest proxy until a real membership table exists).
-- ---------------------------------------------------------------------------
create or replace view mobile_channels as
  select ch.id,
         ch.name,
         ch.description,
         (select count(distinct cp.user_id) from public.comm_posts cp
           where cp.comm_channel_id = ch.id and cp.active) as member_count
  from public.comm_channels ch
  order by ch.id;

grant select on mobile_channels to authenticated;

-- =============================================================================
-- STILL TO ADD (chat):
--   mobile_threads / mobile_thread_messages — DM conversations + messages.
--   community_messages is EMPTY in the copy, so chat is app-owned going forward
--   (mobile_dm_conversations / mobile_dm_messages), with the production
--   community_conversations shells unioned in for the existing threads. The
--   "who can I message" recipient directory is the remaining design question.
-- =============================================================================

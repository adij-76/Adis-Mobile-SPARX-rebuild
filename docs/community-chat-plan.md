# Community + Chat — build plan

Status: **scoping / in progress.** Frontend is fully mapped; DB introspection for
community/messaging tables is pending (decides read-from-production-and-union vs
build-fresh per feature).

## Current state (headline)

**Nothing in community or chat is persisted to a backend.** `CommunityApi.communities()`
returns seed data in both the mock and Supabase adapters. Every write — post,
comment, reply, reaction, join, DM — goes only to the local AsyncStorage store
(`igntd.store.v1`): survives reload on the same device only, never syncs, lost on
reinstall. There is no messaging API seam, no inbound ("them") messages, and
(until F1) all authors were the hardcoded seed identity "Okei".

Classification of every piece: see the inventory in the session notes. Summary:
- **Local-only** (needs server table + api + migration): userPosts, post reactions,
  comments, comment reactions, replies, hidden/reported, community membership
  (`joined`), DM threads & messages, notification read-state.
- **Pure seed** (no write path): community catalog + member counts, base post
  `likes`, seed DM threads + unread badges, inbound messages, notifications feed,
  header bell dot.

## Cross-cutting foundations

- **F1 — Real author identity.** ✅ Done. `useCurrentAuthor()` (src/lib/auth.tsx)
  attributes posts/comments/replies to the signed-in user (name + avatar +
  appUserId) instead of the seed "Okei". `isOwn` (delete gating) now compares to
  the real user.
- **F2 — Storage strategy.** ✅ **DECIDED: app-owned write tables unioned into
  read views** (the wheel/check-in pattern). Read existing content from the real
  production tables; write new mobile content to app-owned `mobile_*` tables and
  UNION them in. Never mutates the production copy; nothing lost on re-import;
  mobile-only until a shared production write API exists. App-owned write tables
  are built in `db/community.sql`.

### Confirmed production schema (introspected)

| Feature | Production table(s) | Key columns |
|---|---|---|
| Feed posts | `comm_posts` | `user_id`, `comm_channel_id`, `title`, `content`, `active`, `is_profane`, `comments_count` |
| Communities (feed) | `comm_channels` | ⚠️ shape TBD — the feed's channels (distinct from meeting groups) |
| Comments | `comments` | `comm_post_id` + polymorphic `commentable_*` (nests), `is_profane`, `active` |
| Reactions | `reactions` | emoji-based (`emoji_id`) + polymorphic `reactionable_*`, `comm_post_id` |
| DM chat (1:1) | `community_conversations` (`user_one_id`/`user_two_id`) + `community_messages` (`sender_id`, `content`, `read_at`) | — |
| Notifications | `notifications` | per-user, polymorphic `notifiable_*`, `read`, `is_mention` |
| Author identity | `users` | `first_name` → name, `avatar_link` → avatar, `user_handle` |

Not the feed: `sds_groups` are the **Zoom coaching/meeting groups** (34 rows —
coach, meet_time, zoom_meeting_id, join_url; Gratitude, Men's/Women's, Hero Code,
Peer-Led…), gated by `subscription_role_groups` — they belong to the **Meetings**
feature. `message` / `message_replies` is the **email/SMS transactional** system,
not in-app chat.

**Feed communities are separate from meeting groups** (owner's call): the feed's
communities (`comm_channels`) keep their own icons + community presence and are NOT
tied to `sds_groups`. Parallel groups may exist but they're modeled separately.

### Data facts (from row counts)
- Feed is real & rich: **comm_posts 751, comments 918, reactions 804**.
- **`community_messages` = 0** — 9 conversation shells, zero messages. In-app DM
  chat is effectively **greenfield**: history is empty, so chat is app-owned going
  forward (`mobile_dm_*`), with the 9 prod conversation shells unioned in.
- `comm_posts` has **no image column** (text-only in prod); app posts carry images
  via `mobile_feed_posts.image_url`.

**Feed communities** (`comm_channels`, 5 rows): General, Inclusive Women's Group,
Inclusive Men's Group, Youth, 7 Day Sober Experiment. Columns: id, name,
description — **no icon column**, so the app assigns icon + colour deterministically
by id/name. `member_count` is derived as distinct authors per channel.

**Reactions** are emoji-based: `reactions.emoji_id → emojis.e_character` (the emoji
glyph). The app shows a single count for now; per-emoji breakdown is available later
via `e_character`.

User 11 (adijaffe+1) has real activity to test: **21 posts, 51 comments, 90
reactions, 2 conversations, 0 messages**.

## Migration & continuity — app-owned → production (for ALL users)

The app-owned tables are a **bridge**, not the destination. Everything written to
them is shaped to reconcile cleanly into the production Rails tables once a shared
production write API exists, so mobile-created content becomes visible to **web
users too** and survives re-imports. The carry-over keys:

| App-owned table | → Production table | Reconciliation keys |
|---|---|---|
| `mobile_feed_posts` | `comm_posts` | `app_user_id`→user_id, `comm_channel_id`, `content`/`title`, `created_at` |
| `mobile_feed_comments` | `comments` | `app_user_id`, `post_ref`→`comm_post_id`, `parent_ref`→`commentable_*`, `content` |
| `mobile_feed_reactions` | `reactions` | `app_user_id`, `target_ref`→`comm_post_id`/polymorphic, `reaction`→`emoji_id` |
| `mobile_dm_conversations` | `community_conversations` | `app_user_id`→`user_one_id`, `other_user_id`→`user_two_id` |
| `mobile_dm_messages` | `community_messages` | `app_user_id`→`sender_id`, `conversation_ref`, `content`, `read_at` |

Cutover = a one-time job that INSERTs app-owned rows into the prod tables (mapping
the ref scheme back to real FKs), then the app reads/writes prod directly and the
`mobile_*` write tables become a cache (or are retired). Until then the read views
UNION both so mobile users have full continuity with each other immediately. This
must be documented in `db/README.md` at cutover time.

## DB files
- `db/community.sql` — app-owned write tables (RLS). ✅ built.
- `db/community-views.sql` — read views: `mobile_posts`, `mobile_comments`,
  `mobile_notifications` (prod ∪ app). ✅ built. TODO: `mobile_channels`,
  `mobile_threads`/`mobile_thread_messages`.
- **F3 — API seam.** New `PostsApi` + `MessagesApi`, expand `CommunityApi`; mock +
  supabase adapters; migrate store writes to read-through caches.
- **F4 — Real-time.** No SDK today (plain fetch/PostgREST). MVP = poll active DM
  thread + list on interval/focus. Later = Supabase Realtime (websocket).
- **F5 — Security & moderation.** RLS scoping; real report path; block user;
  profanity/PII guardrails; ownership/deletion. Recovery community → not optional.

## Phases

1. **Community catalog + membership** — `mobile_communities` view (live member
   counts), `mobile_community_members` table; wire tab rail, explore join, new
   picker; migrate local `joined[]`.
2. **Feed posts** — `mobile_posts` + read view (author identity, community,
   paginated); real create + image upload to Storage (today "Add photo" cycles
   samples); wire feed + detail; migrate `userPosts`; real delete.
3. **Comments / replies / reactions** — `mobile_comments` (parent_comment_id),
   `mobile_post_reactions` / `mobile_comment_reactions` (real aggregate counts);
   migrate local maps.
4. **Direct messages / chat** — `mobile_dm_threads` + `mobile_dm_messages`;
   recipient model (coach/team + community members); two-way messages; unread via
   `read_at`; polling (F4); migrate `dms`.
5. **Notifications + unread badges** — `mobile_notifications` (ideally trigger-fed);
   real feed + read-state; real header bell dot + chat unread badge.
6. **Moderation / safety / polish** — reports table, block, guardrails, rules
   enforced server-side, pagination + pull-to-refresh everywhere.
7. **Migration & cleanup** — one-time hydrate of local writes into new tables;
   document tables/views in db/README.md + db/field-dictionary.md.

## MVP-minimal cut

F1–F4 + Phase 1 + Phase 2 + basic Phase 4 chat (polling). Defer reaction history,
notification triggers, and moderation tooling to fast-follow.

## Open decisions

- Chat delivery: **polling for MVP** (recommended) vs Realtime now.
- Launch moderation bar: **basic** (report row + block) vs fuller tooling.
- Scope: **full** vs the MVP-minimal cut.

## Related (separate track): video watch tracking

The Vimeo player (web) already receives `timeupdate.percent` via the iframe
postMessage API in `video-player-modal.tsx`, but we only use it to fire `onEnded`
at ≥95%. We store watched videos as a **binary** list (`watchedVideos`), not an
amount. To capture "actual amount watched per video": capture max percent / seconds
in the existing handler and persist per video/lesson (production has
`completed_lessons.progress_value` for lessons; snippets/videos would need an
app-owned progress store). Native tracking needs `react-native-webview` (native
currently just opens the system browser — zero tracking). The official
`@vimeo/player` SDK isn't required on web (postMessage is already wired) but would
give cleaner duration/seconds if we want precise counts.

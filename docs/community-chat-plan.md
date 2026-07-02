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
- **F2 — Storage strategy.** App-owned tables, RLS by `auth.uid()`, reconciled on
  re-import (the `mobile_checkins` / `mobile_wheel_entries` pattern). If production
  has community/message tables, read history via email-scoped views and UNION
  app-owned new rows (the wheel pattern). Gated on DB introspection.
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

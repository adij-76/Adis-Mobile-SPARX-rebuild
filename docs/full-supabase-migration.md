# Full migration to Supabase — one database, no sync

**This is the canonical data plan.** It supersedes the "import a copy of prod
Postgres into Supabase and keep it in sync" framing in the earlier strategy docs
(`modern-stack-migration.md`, `backend-integration.md`). Those still describe the
app architecture and the `api/*` seam correctly — only the *data topology* changes
here: **there is never a second database to maintain.**

## The problem with import-and-sync
If you import a *copy* of the production Postgres into Supabase and run both, you
now own two schemas that drift apart and need replication forever. That's the
"secondary database" maintenance burden — and it's avoidable.

## The key fact
**Supabase's database is a normal Postgres instance with a standard connection
string.** It is not a proprietary store you "SQL back" from. So Supabase can be
*the* single database, and the existing Rails app can point at it too.

```
        ┌─────────────────────────────────────────────┐
        │       Supabase-hosted Postgres (THE db)      │
        │     schema + data migrated once, no sync     │
        └─────────────┬─────────────────┬──────────────┘
          DATABASE_URL│                 │ PostgREST / RLS / Auth
                      │                 │ Realtime / Storage
                ┌─────┴────┐      ┌──────┴───────┐
                │  Rails   │      │ Expo mobile  │
                │ (today,  │      │  (src/api/*) │
                │ retiring)│      │   live now   │
                └──────────┘      └──────────────┘
```

One Postgres. Rails connects via `DATABASE_URL`; mobile reads the same DB through
PostgREST + the `mobile_*` views in `content-api-spec.md`. No copy, no sync, no
SQL-back.

## Migration sequence (near-zero downtime)

1. **Replicate.** Stand up the Supabase Postgres as a *logical replica* of the
   current prod Postgres. This sync is **transient** — it exists only until
   cutover, so you are never running two databases in steady state.
2. **Cutover.** Repoint Rails `DATABASE_URL` to Supabase and stop replication.
   There is now literally one database, and the existing web app runs on it.
   (Validate in staging first.)
3. **Expose to mobile.** Create the read views + RLS (`mobile_programs`,
   `mobile_modules`, `mobile_lessons`, `mobile_snippets`, `mobile_wheel_scores`
   from `content-api-spec.md`) in that same DB. Mobile reads via PostgREST.
   Two apps, one database.
4. **Auth.** Import users into Supabase Auth (`auth.users`). Devise uses bcrypt
   and Supabase Auth (GoTrue) accepts bcrypt hashes, so passwords carry over.
   Map the production `users.id` into the JWT (`app_user_id`) for RLS.
5. **Writes.** Move write paths (check-ins, community, ratings, favorites) to
   PostgREST / Edge Functions as the mobile app needs them.
6. **Retire Rails.** Decommission Rails endpoints as they're replaced. The web
   app gets rebuilt on the modern stack (B/C) or keeps running on the same DB
   until then.

## Does this change the stack recommendation?
**No — it confirms it and removes its one real downside.**

- **"A now"** is unchanged: Supabase Auth + PostgREST + RLS + Realtime + Storage,
  on a single canonical Postgres.
- **The `src/api/*` seam still matters** exactly as built — screens call `api.*`,
  adapters swap behind it.
- **"C later" gets easier:** Drizzle/tRPC just point at the same Supabase
  connection string. One clean Postgres is the ideal target for C.

The only change is *one-time host migration via logical replication* instead of
*import-and-sync*, then progressive Rails retirement. Strictly better.

## Validate before committing (operational, not architectural)
A short spike with the backend devs should confirm:

1. **Rails ↔ Supabase pooling** — use Supavisor *session* mode (or direct 5432);
   the transaction pooler needs `prepared_statements: false`. Size the connection
   pool for Rails **+** Sidekiq.
2. **Extensions** — confirm every extension prod uses (PostGIS, pg_trgm, uuid-ossp,
   etc.) is available and enabled on Supabase.
3. **Auth import** — verify Devise's bcrypt cost factor imports cleanly into
   GoTrue; test real logins end-to-end before cutover.
4. **Files** — keep S3 + ActiveStorage as-is initially (presign via an Edge
   Function porting `presigned_video_url`). Migrating to Supabase Storage is
   optional and later.
5. **Compute + cost** — size the Supabase compute tier for full production load,
   not just mobile read traffic.

## One-line summary for the backend team
Single Supabase Postgres; repoint Rails at it via `DATABASE_URL`; cut over with
logical replication so there's never a second database to maintain. Same stack
recommendation (A now, seam for C), better data plan.

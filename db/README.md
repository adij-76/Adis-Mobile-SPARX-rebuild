# Database layer — how it survives a re-import

We never touch the production (Rails / igntd-main) database. We import a **copy**
into Supabase and build an **additive layer** on top of it. Because that layer
lives only in our copy, every fresh production snapshot needs it re-applied.

This folder is that layer, as code, so it propagates automatically instead of
being re-typed by hand.

| File | What it is | Idempotent? |
|------|-----------|-------------|
| `mobile-layer.sql` | Every view, RLS policy, grant, auth-user import, and storage rule the app depends on. The single source of truth. | Yes — run it any number of times. |
| `introspect.sql` | One query that dumps the whole schema as JSON, so the layer can be regenerated in one pass. | Read-only. |

## Re-import playbook (the answer to "do we redo all this?")

No. Three steps, every time:

1. **Import / refresh** the production snapshot into Supabase (`public` schema).
2. **Run `db/mobile-layer.sql`** — recreates all views, re-applies RLS, imports
   any new users, re-syncs avatars. Safe to run repeatedly.
3. **Confirm the dashboard settings below** (one-time; a re-import never changes
   them, so usually nothing to do).

That's it. The views reference `public.*` by name, so they automatically reflect
whatever the latest import brought in. Add a new column in production → it shows
up here the moment you `select` it in a view, no migration dance.

## Dashboard-only settings (not SQL — set once, survive re-import)

These live in Supabase project config, not in any table, so a data re-import
leaves them intact. Re-apply only if you rebuild the project from scratch.

- **Auth → Providers**: enable Google / Apple / Facebook and paste each OAuth
  client id + secret. (Google failing with "provider is not enabled" = this.)
- **Auth → URL Configuration → Redirect URLs**: add the deployed web app origin
  (and `http://localhost:8081` for local dev) so OAuth redirects are accepted.
- **Project → API → Exposed schemas**: only needed if we move the views into a
  dedicated `mobile` schema (see below). Default `public` needs nothing.
- **Repo / build variables**: `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon key only — never the
  service_role key in client builds).

## Why the layer is additive-only

`mobile-layer.sql` only ever **adds** views and **adds** SELECT policies; it
never alters or drops a production column or row. That keeps the production
schema untouched (respecting read-only) and means a re-import can't conflict with
our work — there's nothing of ours inside the production tables to overwrite.

## Optional hardening — a dedicated `mobile` schema

Today the views live in `public` as `mobile_*`. If you'd rather a `public`
re-import not touch them at all, move them into their own schema:

```sql
create schema if not exists mobile;
-- create the same views as mobile.programs, mobile.me, … (drop the prefix)
```

Then add `mobile` to **Project → API → Exposed schemas** and the adapter sends
`Accept-Profile: mobile`. Trade-off: a small adapter change for "views never need
re-running after a data-only import." Not required — re-running one file already
solves propagation — but it's the cleanest separation if we want it later.

## Letting the assistant read the DB directly (optional)

This session's environment has an egress policy that **blocks the Supabase
host**, which is why schema is gathered via `introspect.sql` paste-backs rather
than a live connection. To grant direct read access for faster iteration, create
the environment with a network policy that allowlists
`*.supabase.co` (see https://code.claude.com/docs/en/claude-code-on-the-web).
Until then, `introspect.sql` is the one-paste substitute.

# Stack comparison — Supabase vs Next+tRPC vs Hybrid

Deciding what replaces Rails around your Postgres. Three realistic shapes,
scored for *this* app (recovery/coaching, ~150-table Rails-shaped Postgres,
program/subscription gating, Vimeo+S3 media, ActionCable chat, Stripe/Zoom/
Acuity/Mandrill, n8n AI, mobile + web, lean team).

## First, a hosting fact that drives the choice
Your prod DB is almost certainly **Heroku Postgres** (Heroku Procfile/Aptfile/
newrelic in the repo). That matters because **Supabase Cloud hosts its own
Postgres** — to use its auto-API you either (a) **migrate the DB into Supabase**
(`pg_dump`/restore — very doable), or (b) **self-host the Supabase pieces**
against your existing DB. Next+tRPC and the Hybrid connect to your DB **where it
already is** (no DB move).

## The three options
- **A. Supabase + Expo** — Supabase wraps Postgres: auto-API (PostgREST) + Auth + Realtime + Storage + Edge Functions. Expo for mobile+web.
- **B. Next.js + tRPC + Drizzle (Turborepo)** — Next web + Expo native share a typed tRPC API over Drizzle on your existing Postgres; Auth0/Clerk; Vercel + EAS.
- **C. Hybrid** — keep Postgres in place + a thin tRPC/Drizzle data API (like B), but use **Supabase only for Auth + Realtime + Storage**. Buys social auth + realtime fast without moving the DB.

## Scorecard (1–5, higher = better for you)
| Dimension | A. Supabase | B. Next+tRPC | C. Hybrid |
|---|---|---|---|
| Speed to first cutover | **5** (DB = API) | 3 | 4 |
| Least backend code | **5** | 2 | 3 |
| Keeps DB where it is | 2 (move or self-host) | **5** | **5** |
| Realtime built-in (chat/reactions) | **5** | 2 (add service) | **5** |
| Auth: social + Devise-bcrypt migration | **5** (GoTrue imports bcrypt) | 4 (Auth0/Clerk) | **5** |
| End-to-end type safety / control | 3 | **5** (tRPC types) | **5** |
| Replicating program/role gating | 3 (RLS — powerful but fiddly) | **4** (in code, testable) | **4** |
| Vendor lock-in | 3 (open-source, escapable) | **5** (your code) | 4 |
| Cost at your scale | **5** (free→$25+) | 3 (Vercel+DB+EAS) | 4 |
| Lean-team fit | **5** | 3 | 4 |
| Heavy web app story | 3 (Expo web) | **5** (Next) | **5** |

## How to read it
- **Pick A (Supabase + Expo)** if: you want the fastest path with the least code, you're OK moving the DB into Supabase (or self-hosting Supabase), realtime chat matters, and the team is lean/frontend-heavy. **← my default recommendation.**
- **Pick B (Next + tRPC)** if: you have backend engineers, want a serious web app and fully-typed control end-to-end, and want to keep Postgres exactly where it is. More code, lowest lock-in.
- **Pick C (Hybrid)** if: you love B's typed control but don't want to build auth/realtime yourself and won't move the DB. Pragmatic middle — keep Heroku Postgres, get social auth + realtime from Supabase, own the data API in tRPC.

## The honest trade in one line
**Supabase = least code, fastest, but the DB moves (or you self-host) and gating
becomes RLS. Next+tRPC = most control and DB stays put, but you build more.
Hybrid = keep the DB + own the API, and rent only auth/realtime.**

## Decision-specific gotchas
- **RLS parity (A):** your subscription/program/role gating is non-trivial; as RLS it's powerful but must be audited before exposing content. In B/C it lives in tested TypeScript.
- **DB move (A):** a one-time `pg_dump`→Supabase restore + cutover, or self-host Supabase. Real but bounded.
- **Realtime (B):** you'll bolt on Supabase Realtime/Pusher anyway — which nudges B toward C.
- **All three:** keep **n8n** for AI/automation; keep **Vimeo** (URLs are in `snippets`); port **S3 presign + Stripe/Zoom webhooks** into a few serverless functions.

## My recommendation
If you want to **move fast with a lean team and don't mind hosting the DB on
Supabase → A (Supabase + Expo).** If keeping Postgres exactly where it is and
owning a typed API matters more (and you have eng capacity) → **C (Hybrid)**: it
gets you most of A's wins (social auth, realtime) without the DB move, while the
data API stays your testable TypeScript. Pure **B** only if the web app is large
and you want zero managed services.

Net: **A for speed, C for control-without-the-DB-move.** Both keep Expo, keep
Postgres as the source of truth, and let us cut content over first.

# Modern stack + Rails-free migration plan

You own the data (PostgreSQL). Rails is just the app layer wrapped around it.
So the strategy is **strangler-fig**: keep Postgres as the permanent core, stand
up a modern stack beside Rails, move features over one at a time, and retire
Rails last. Nothing requires a big-bang rewrite.

## The one principle
> **Postgres is the constant.** Everything else (auth, API, web, jobs, media,
> realtime, AI) gets replaced *around* it. Never migrate the data; migrate the
> code that touches it.

## Recommended stack

### Primary recommendation — Supabase + Expo (least backend code)
| Concern | Rails today | New |
|---|---|---|
| Database | PostgreSQL | **Same PostgreSQL, via Supabase** (point Supabase at your DB, or import it) |
| API | Rails controllers (server-rendered) | **PostgREST auto-API + SQL views** + **Edge Functions** (Deno/TS) for custom logic |
| Access control | Rails `before_action` + program/role gating | **Row-Level Security (RLS)** policies in Postgres |
| Auth | Devise sessions | **Supabase Auth** — email + **Google/Facebook/Apple** + Auth0 federation, JWT tokens |
| Realtime (chat/reactions) | ActionCable | **Supabase Realtime** (Postgres change streams) |
| File storage | ActiveStorage + S3 | **Supabase Storage** (or keep S3; presign via an Edge Function) |
| Background jobs | Sidekiq + Redis | **Supabase cron / Inngest / n8n** |
| AI (Sparky) | — | **n8n stays** (already on the same Postgres) |
| Mobile + Web | react-on-rails + Hotwire | **Expo (React Native + Expo Router)** — one codebase for **iOS, Android, and web** |
| Payments | Stripe via Rails | Stripe webhooks → **Edge Function** |

Why this is the pick: it deletes the most backend code (the database *becomes*
the API), keeps your Postgres, gives social/Auth0-ready auth out of the box,
replaces ActionCable, and is adoptable incrementally. You already have the Expo
app — this is the smallest distance to "Rails-free."

### Alternative — Turborepo monorepo (more control, fully typed)
If the team prefers an owned API and a heavier web app: **Next.js (web) + Expo
(native)** sharing **tRPC** (end-to-end typesafe) over **Drizzle ORM** on the same
Postgres, **Auth0** for auth, **Vercel + EAS** for hosting, **Supabase Realtime
or Pusher** for realtime. More code than Supabase, but maximal control and one
shared TypeScript type system across web + mobile.

Either way: **TypeScript everywhere, Expo for the app, Postgres untouched, n8n
for AI/automation.**

## Step-by-step migration (no Rails required)

**0. Freeze the contract.** Postgres schema stays as-is (Rails-conventional is
fine — Supabase/Drizzle introspect it). Add new things additively (views, RLS,
columns) — never break what Rails writes during the transition.

**1. Stand the new API beside Rails (read-only first).**
Connect Supabase to the prod Postgres. Create **SQL views** shaped for the app
(you already do this — `v_wol`). Turn on **RLS** and write policies that mirror
Rails gating (subscription role + program). Result: an instant, secure JSON API
over your real data, with Rails still running untouched.

**2. Auth.**
Stand up Supabase Auth. Map the existing `users` table to auth identities; add
**Google/Facebook/Apple + Auth0** federation. Devise passwords are bcrypt — either
import the hashes or move users to social/reset-on-first-login. Run both auth
systems in parallel against the same `users` rows until cutover.

**3. Content first (our chosen track).**
Views/policies for `lessons` (workshops), `snippets` (videos, with `vimeo_url`),
`completed_lessons` (progress), `favorites`/`user_snippets`. Wire the Expo app's
content screens to them. First visible cutover — and it fixes Sparky's videos too
(real URLs live in `snippets.vimeo_url`).

**4. Media.** Vimeo URLs come straight from the tables. For S3 worksheet/video
files, port the Rails presign into one Edge Function.

**5. Writes.** check-ins (`daily_assessments`), wheel (`v_wol` writes), favorites,
community posts/comments/reactions — via PostgREST/Edge Functions under RLS.

**6. Realtime.** Replace ActionCable community chat/reactions with Supabase
Realtime subscriptions on the relevant tables.

**7. Integrations.** Stripe webhooks → Edge Function; Zoom/Acuity meetings →
Edge Function or n8n; Mandrill email → keep or swap; Sidekiq jobs → cron/Inngest/n8n.

**8. Web.** Rebuild the desktop experience as **Expo web** (same codebase) or a
**Next.js** app on the same API — feature by feature.

**9. Decommission Rails.** As each feature's traffic moves to the new stack, turn
that Rails route off. When nothing hits Rails, retire it. **Postgres remains.**

## Risks / gotchas to plan for
- **RLS parity**: replicating Rails' program/subscription/role gating as policies needs care — get content gating right before exposing it.
- **Devise password migration**: bcrypt import vs. social-only vs. forced reset.
- **Dual-write window**: while both stacks run, decide who owns each write to avoid drift.
- **Presigned URLs + Stripe/Zoom webhooks**: small but security-sensitive Edge Functions to port.
- **Schema is Rails-shaped** (e.g. `portion_id`, `completed_lessons`): keep it; just add views/policies on top.

## Immediate next step
Pick the stack direction (Supabase-first vs Next+tRPC monorepo). Then I'll write
the concrete **content API spec** in that shape — the exact views/policies (or
tRPC procedures) + response types for workshops/lessons/snippets — and wire the
Expo content screens to a thin `api` layer so the source can be swapped without
touching screens.

# Supabase go-live runbook

Single checklist to take the app from mock content to live Supabase data.
Project: `https://aefkemjpzpdblzgvtssy.supabase.co`

The app is already wired to flip automatically — it serves **mock content until
both repo variables below are set**, then reads from Supabase. No code change is
needed to cut over; these are the steps on your side, plus a final verify on mine.

> **Data plan:** the long-term target is a **single** Supabase Postgres that *is*
> the database (Rails repointed at it via `DATABASE_URL`) — no second DB, no sync.
> See `full-supabase-migration.md`. This runbook is the fast path to first live
> reads; step 1 below becomes the one-time host migration in that plan.

---

## 1. Import the database
Bring the production Postgres into the project (dump + restore, or the Supabase
migration tool). Nothing here depends on the app.

## 2. Create the read-only catalog views
In the Supabase **SQL Editor**, run the four `create view` statements and the
`grant select` from [`docs/content-api-spec.md` → Step 1](./content-api-spec.md).
These expose `mobile_programs / mobile_modules / mobile_lessons / mobile_snippets`
to PostgREST. (Per-user enrichment + RLS in Step 2 comes after auth — not needed
for the first read-only cutover.)

> Sanity check after running: in the SQL editor,
> `select count(*) from mobile_lessons;` should return your real lesson count
> (~53 for The Hero Code).

## 3. Set the two GitHub repo variables
**Repo → Settings → Secrets and variables → Actions → Variables tab → New variable.**
The deploy workflow already references these (mirrors `SPARKY_WEBHOOK`):

| Variable name | Value |
|---|---|
| `SUPABASE_URL` | `https://aefkemjpzpdblzgvtssy.supabase.co` |
| `SUPABASE_ANON_KEY` | the project's **anon / publishable** key (Settings → API) |

> Use the **anon** key, never the `service_role` key. The anon key is designed
> to be shipped in client apps; `service_role` bypasses RLS and must never reach
> the browser. These are *Variables*, not *Secrets* — the anon key is public by
> design and the web build inlines it either way.

## 4. Redeploy
Any push to `main` rebuilds, or re-run the **Deploy web** workflow manually.
The build now injects `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
so `src/api/index.ts` selects the Supabase adapter instead of the mock.

## 5. Verify (my side)
Once steps 1–4 are done, tell me and I'll:
- Confirm the live site is hitting Supabase (network calls to `/rest/v1/mobile_*`).
- Rewire the content screens (videos / workshops / lessons) from the `content.ts`
  mocks to `await api.content.*` with loading + empty/error states, tested against
  the real rows.

> Connectivity note: `*.supabase.co` is blocked from this sandbox, so I can't curl
> it from here — verification runs against the deployed site in your browser, the
> same way we debugged Sparky's webhook.

---

## What's already in place (no action needed)
- `src/api/types.ts` — backend-agnostic domain types.
- `src/api/supabase.ts` — PostgREST adapter (plain `fetch`, no SDK; `setSupabaseToken()` ready for auth).
- `src/api/mock.ts` — local fallback (what the app uses today).
- `src/api/index.ts` — auto-selects Supabase when `EXPO_PUBLIC_SUPABASE_URL` is set.
- `.github/workflows/deploy-web.yml` — injects both vars at build time.

## After read-only content works (later milestones)
1. **Auth** — Supabase Auth mapped to the production `users` row; `setSupabaseToken()`
   swaps the anon key for the user JWT. Then enable Step 2 RLS in the spec.
2. **Per-user data** — progress, ratings, favorites via the enriched view.
3. **Presigned media** — port the Rails `presigned_video_url` to an Edge Function
   for S3 worksheets/files (Vimeo playback already works from `vimeo_url`).

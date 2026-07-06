# Backend & hosting strategy — SPARx app

A decision memo for evaluating "move off Supabase to Heroku." Written for the
dev conversation. **Assumed end goal: the legacy Rails website is retired.**

## TL;DR / recommendation

Since the plan is to **retire the Rails site**, do **not** re-home the new app
onto Rails/Heroku — that spends effort rebuilding auth + API + security on the
platform we're sunsetting. Instead: **pick a Postgres backend as the single
source of truth, migrate the full history into it, let the new app become
canonical, and retire Rails once at feature parity.** Supabase (what we already
run on) is the lowest-rework choice for that; going fully self-hosted is a
*later* optimization, not a launch blocker.

The app itself is **safe in every option** — it was built behind a swappable
data-access seam, so we never restart the app; at most we swap one adapter.

## Current architecture — know the two shapes

- **Legacy (today's live site):** a **Rails monolith** on Heroku — server-rendered
  frontend + backend + Heroku Postgres in one deployable. Holds the **full
  history**.
- **New app:** **two separable pieces**
  1. a **static Expo web bundle** (HTML/JS; on GitHub Pages today) — hostable
     anywhere, and
  2. a **backend service** = **Supabase** (managed Postgres + auto-generated
     REST API + auth incl. the Google OAuth we just wired + file storage +
     row-level security).
- **Two diverging databases right now:** Supabase holds a **2026-only copy** of
  prod **plus all new mobile activity** (onboarding, check-ins, posts, XP);
  Heroku holds the **full history** but **none** of the new activity.

## Hosting is two questions, not one

Don't reason about the new app like the Rails monolith. It splits into:

1. **Where do the static frontend files live?** GitHub Pages / Heroku static /
   Netlify / Vercel / S3+CDN — *trivial to move, host anywhere.* Not the real
   decision.
2. **What serves the data + auth + storage?** This is the actual backend
   decision.
3. (Later) **native iOS/Android** builds → distributed via the app stores; the
   backend still needs hosting regardless.

## The options

| Option | What it means | Mobile rework | Fit if Rails is retired |
|---|---|---|---|
| **A. Keep both, cutover at launch** (current plan) | Supabase powers the app now; reconcile mobile data into prod at launch | **None** | OK short-term; still two systems until cutover |
| **B. Supabase becomes source of truth** | Migrate full Heroku history into Supabase; app is already here; retire Rails | **~None** | **Best fit — lowest rework** |
| **C. Re-home app onto Heroku/Rails** | Rebuild the API, auth/OAuth, security, storage against Rails | **Significant** | **Poor fit — invests in the platform we're killing** |

- Option C softener: **PostgREST on Heroku** could preserve most of the existing
  app adapter — but it makes little sense to stand that up on a platform being
  retired.

## What Supabase provides that a plain Rails/Heroku app doesn't

If we leave Supabase, each of these must be **replaced**:

- **Auto REST API** over the data (Supabase generates it; Rails must expose
  endpoints deliberately — does it already have a mobile/JSON API?).
- **Authentication**, including the **Google login already working** (re-do
  against Rails auth).
- **Row-level security** (enforced in the DB → would move into Rails
  controllers).
- **File/avatar storage.**

## Portability & lock-in (both directions)

- Supabase is **standard Postgres** — the schema, the `mobile_*` views/RPCs, and
  the data all move to any Postgres host unchanged. The proprietary parts are
  auth + storage.
- Heroku (Salesforce-owned) has its own pricing/lock-in history.
- Net: staying on Supabase does **not** trap us — if cost/lock-in later argues
  for self-hosting Postgres + PostgREST + an auth provider, that migration is
  straightforward and can happen post-launch.

## Open decisions to confirm

1. **Retire Rails — on what timeline?** Define a parity checklist the app must
   hit before sunset.
2. **Full-history migration** into the canonical DB — when and how (the Supabase
   copy is 2026-only today).
3. **Cutover vs. dual-run** during the transition (we already have reconcile
   scripts for mobile → prod).
4. **Compliance:** this is sensitive mental-health data (assessments, self-harm
   flags). Do we need **HIPAA / a BAA**, and who provides it? (Supabase offers a
   BAA on paid tiers; confirm Heroku's stance if considered.)
5. **Domain:** app on the primary domain once Rails is gone — affects OAuth
   redirect URIs, PWA, cookies.
6. **Cost at expected scale** — compare the *whole* stack, not one line item
   (static hosting is often free; the cost is the DB/API/auth service).

## Bottom line

The app investment is not at risk in any scenario. **If Rails is being retired,
the cheapest and cleanest path is to make Postgres the single source of truth
(Supabase, as we already run), migrate the full history in, reach parity, and
sunset Rails — not to rebuild the app onto the platform we're turning off.**

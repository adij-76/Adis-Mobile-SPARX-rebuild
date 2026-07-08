# Role-based access — CTO model vs. what the mobile app implements today

_Response to the CTO's `security_roles` note. Maps each table/concept in that
note to how the mobile app's Supabase layer (`db/*.sql`) and client (`src/`) use
it today, flags divergences, and documents the **Mobile Tester role** the mobile
build added (not in the original note). Verified against `main`._

---

## TL;DR

- **Role enforcement is server-side and secure.** The client is never told the
  user's `subscription_role_id`; every role/entitlement decision is made **inside
  the `mobile_*` views**, so a user can't tamper with their own access.
- **Content gating is partially implemented** — lessons, workshops, and coaching
  groups are role-filtered. **Component gating is not implemented at all** — the
  `subscription_accesses` × `subscription_components` layer that turns whole
  features (Community, Lessons, …) on/off per role is **not wired**: every signed-in
  user sees every tab.
- **The app has a second, parallel notion of entitlement** — a `Premium` toggle
  driven by `users.subscribed` / stripe flags — that is separate from the role
  system. Worth reconciling.
- **One thing not in your note:** the mobile build added a temporary **"Mobile
  Tester (July 2026)"** virtual role (sentinel id `-100`, not a `subscription_roles`
  row). Details + teardown below — please fold this into your doc.

---

## 1. Component-level access — `subscription_accesses` × `subscription_components`

**Status: NOT implemented.** Zero references in the app layer (`db/*.sql`) or the
client (`src/`). The tab bar (`src/app/(tabs)/_layout.tsx`) renders Home, Lessons,
Community, My Data, and Sparky for **every** signed-in user — nothing reads
`subscription_accesses` to hide a component. So today, "no `subscription_accesses`
link for Community → it shouldn't show" is **not** happening; Community shows
regardless of role.

**If per-role component visibility is a requirement**, we'd need to: (a) add a
`mobile_*` view exposing the caller's granted components (a join of
`subscription_accesses` → `subscription_components` for `mobile_effective_role_id()`),
and (b) gate navigation in the client on it. Small, well-contained addition — but
it's net-new work.

## 2. Content-level filtering — the `subscription_role_*` tables

| Your table | App status | Where / notes |
|---|---|---|
| `users.subscription_role_id` | ✅ **used, server-side only** | Resolved inside the views (`me.subscription_role_id`); **not** exposed to the client. Good — the client can't spoof its role. |
| `subscription_roles` | ➖ referenced only by the tester helper | `db/testing-access.sql` (`mobile_effective_role_id()`); no direct read elsewhere. |
| `subscription_components` | ❌ **not used** | See §1 — no component gating. |
| `subscription_accesses` | ❌ **not used** | See §1. |
| `subscription_role_lessons` | ✅ **used** | `db/views.sql` — `mobile_lessons.accessible` unlocks a lesson if the role links it. |
| `subscription_role_workshops` | ✅ **used** | `db/views.sql` — same, for `lessons.portion_id = 16` (workshops, `lesson_type = 1`). |
| `subscription_role_groups` | ✅ **used** | `db/groups.sql` — `mobile_groups` only shows coaching groups (`sds_groups`) the role links (plus a gender/age audience match). |
| `subscription_role_channels` | ❌ **not used** | Community channels are **not** filtered by role. A "Youth"-type channel would show to everyone. (Community itself is still partly local per the separate app audit.) |
| `subscription_role_assessments` | ❌ **not used** | `mobile_assessments` lists the assessments a user has **taken** (`answer_headers`), not the set a role is **allowed to see**. |
| `subscription_role_worksheets` | ❌ **not used** | No worksheet catalog is role-filtered. |
| `subscription_role_addictions` | ❌ **not used** | The onboarding problem list is DB-driven (`mobile_problems` from `addictions`) but **not** scoped by role. |
| `subscription_role_programs` | ❌ **not used (divergence)** | The app gates program lessons by `users.program_id = portions.program_id` directly, **not** via this table. Fine while there's one hero program, but it's a different mechanism than your note describes. |
| `subscription_role_popups` | ❌ not used | You noted this isn't implemented on your side either. |

### The lesson access model, precisely (`mobile_lessons.accessible`)
Locked by default; a lesson is accessible when **any** holds:
1. it's in the user's enrolled program (`portions.program_id = users.program_id`), **or**
2. it's a workshop (`lesson_type = 1`) the role links via `subscription_role_workshops`, **or**
3. it's a lesson the role links via `subscription_role_lessons`, **or**
4. the caller is a **Mobile Tester** (see §4) → everything unlocked.

## 3. Subscription **tiers** — the app collapses them to a boolean

The business model has three subscription **tiers** — **Standard / Premium /
Unlimited** (Unlimited being renamed + capped now that AI is in play). The mobile
layer does **not** represent tiers at all:

- `mobile_me` exposes only two **booleans** — `subscribed` (← `users.subscribed`)
  and `stripe_active` (← `users.stripe_subsctiption_active`). **No tier/plan name is
  surfaced.**
- The client computes `isPremium = user.subscribed || user.stripeActive` and uses
  the word **"Premium"** as a generic "paid/unlocked" label
  (`src/app/settings/premium.tsx`, profile, lessons lock CTA). That's a **naming
  collision**: the app's "Premium" means *"has any paid subscription,"* not your
  middle tier.

**Consequences**
- A **Standard** subscriber and an **Unlimited** subscriber are **indistinguishable**
  to the app's UI.
- The upsell copy ("Upgrade to unlock every lesson, workshop and report") is
  **tier-blind** — it can't say "Upgrade to Unlimited" or acknowledge what a
  Standard user already has.
- Tier names are **hardcoded** in the client, so renaming "Unlimited" needs an app
  redeploy.

**Not a security problem.** Actual per-content **access is driven by the role
system** (`mobile_lessons.accessible`, `mobile_groups`), *not* by this boolean — so
gating is correct; only the **tier labeling / upsell** is wrong/missing. The boolean
is cosmetic today.

**Open question (needs CTO input):** where is the canonical tier stored? The mobile
layer surfaces no `plan`/`tier` field. Candidates: `subscription_roles.name` (if
roles *are* tiers), the Stripe subscription/product, or a `users` plan column. Note
the roles in this doc read as **per-client / content-scoping**, which may be
**orthogonal** to billing tier — so tier probably isn't simply the role.

**Fix once known (small):** surface the tier in `mobile_me` (e.g. a `plan` column),
have the app show the real tier and tailor the upsell, and source tier names from
data so a rename needs no redeploy. Keep role-based `accessible` as the authoritative
*access* signal; tier drives *labeling / billing state / upsell*, not gating.

---

## 4. ⭐ NEW — the "Mobile Tester (July 2026)" role (please add to your doc)

The mobile build needed all-access for testers during the July 2026 pilot **without**
creating real `subscription_roles` rows or scattering "unknown user → unlock" hacks
through the views. So it models a single **virtual role**, defined purely by SQL
functions in `db/testing-access.sql` (nothing is written to any production table):

- **`mobile_tester_role_id()` → `-100`** — a **negative sentinel** id, so it can
  **never collide** with a real `subscription_roles.id`. It is *not* a row in
  `subscription_roles`.
- **`mobile_effective_role_id()`** — the caller's role:
  - an **existing** user (email present in production `users`) → **their real
    `users.subscription_role_id`** (even if NULL). Existing users **never** become
    testers.
  - an **authenticated new enrollee with no production `users` row**, while the
    window is open → the **tester role** (`-100`).
  - otherwise → NULL.
- **`mobile_testing_open()` → `now() < 2026-08-01 (PT)`** — the pilot window.
- **`mobile_is_tester()`** — true when the caller currently holds `-100`.

**Effect:** a tester is treated as **all-access** everywhere the views check role —
`mobile_lessons.accessible = true` for all content, `mobile_groups` shows every
active group, and lesson/video unlocks apply.

**Teardown (no code change):** when the window closes, `mobile_testing_open()`
returns false, `mobile_effective_role_id()` stops handing out `-100`, and access
evaporates. No per-view permission edits, no rows to delete.

**Data safety on conversion:** everything a tester creates lives in the app-owned
`mobile_*` tables keyed by `auth.uid()`, independent of the role. When a tester
later subscribes (a real `users` row appears for their email), they keep **all**
their July data and simply resolve to their real role. (Optional one-time backfill
of `app_user_id` ties that data to the new prod id — see the migration catalogue.)

**Why it matters to you:** it's a **temporary testing-window construct**, not a new
permanent role in your access model. It touches no production tables. After July
2026 it self-disables. If the pilot extends, we bump the one date in
`mobile_testing_open()`.

---

## 5. Changes we may need — for your call

1. **Component gating (§1):** decide if Community/Lessons/etc. should be hideable
   per role. If yes, we add a `mobile_*` components view + client nav gating.
2. **Channels (`subscription_role_channels`):** if channels like "Youth" must be
   role-scoped, that filtering isn't there yet (and ties into finishing the
   server-side community feed).
3. **Assessments / worksheets / addictions:** if the *offered* set (not just what
   the user took) should be role-scoped, those three tables need wiring.
4. **Programs:** confirm using `users.program_id` directly is acceptable vs.
   `subscription_role_programs`, or align them.
5. **Subscription tiers (§3):** tell us where the canonical tier (Standard/
   Premium/Unlimited) lives so we can surface it in `mobile_me` and make the app
   tier-aware (today it only knows a paid/not-paid boolean and mislabels it
   "Premium"). Access stays role-driven; tier drives labeling/upsell.
6. **Tester role (§4):** confirm the July 2026 window + teardown plan.

Where a mapping is unclear (e.g. a `subscription_components` row with no app
counterpart), we'll follow your note's guidance and confirm with you rather than
guess.

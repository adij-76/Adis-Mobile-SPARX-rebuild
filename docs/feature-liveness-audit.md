# Feature liveness audit — what's real vs. mock

A full sweep of every interactive control in the app, classified as:
- **FUNCTIONAL** — real working behavior (navigation, state, or a backend call).
- **LOCAL-ONLY** — works in the UI but nothing persists; lost on refresh/exit.
- **NO-OP** — does nothing (no handler, or a button that just goes back).
- **STATIC** — hardcoded mock data from `src/data/content.ts`.

## The big picture

The app is **UI-complete but data-hollow**. Navigation works, the screens look
right, but almost nothing persists and there is **no backend wired in except
Sparky**. The single biggest reframe:

> **You already have the backend.** The Postgres + n8n stack behind Sparky
> already holds users, lessons, workshops, `daily_assessments`, `v_wol`
> (wheel), `sds_groups` (meetings/groups), and video vectors. "Making it live"
> mostly means: **(1) auth/identify the user, (2) expose n8n webhook endpoints
> that read/write that Postgres (exactly like the Sparky webhook), and (3) wire
> each screen to those endpoints.** The data exists — the app just isn't talking
> to it yet.

## Tier 0 — Foundation (everything else depends on these)

| Gap | Current state | Needed |
|---|---|---|
| **Authentication** | None. No login/signup/account anywhere. | Login/signup + session/token; an auth gate in `src/app/_layout.tsx`. |
| **Current user** | Hardcoded `user` in `content.ts`; Sparky uses `userId=11`. | A real signed-in user id threaded through the app + into the n8n calls. |
| **API layer** | None except the Sparky webhook. | n8n webhooks (or a real API) over the existing Postgres for read/write. |
| **Persistence** | Only the check-in **streak** (AsyncStorage). | Server-side per-user storage for everything below. |

## Tier 1 — Core loops that are almost there but don't persist

| Feature | Status | Gap |
|---|---|---|
| **Daily check-in answers** | LOCAL-ONLY | Mood/emotions/behavior/affirmation are **discarded** — only the streak saves. Should POST to `daily_assessments`. This is core data and high value. |
| **Wheel of Life assessment** | LOCAL-ONLY | Slider results lost on exit; the wheel always shows mock scores. Should POST/GET `v_wol`. |
| **Check-in summary** | LOCAL heuristic | Generated client-side; could call the n8n recommendation engine for real personalization. |
| **Community reactions / comments** | LOCAL-ONLY | Just made interactive, but reactions & new comments vanish on refresh. |
| **Sparky chat** | ✅ FUNCTIONAL | The one live backend feature. |

## Tier 2 — Content & media (all static today)

| Feature | Status | Gap |
|---|---|---|
| **Video playback** (`videos/[id]`, `workshop/video`) | NO-OP | "Players" are fake — play buttons/controls do nothing. Reuse the Vimeo modal we built for Sparky. |
| **Videos / workshops / meetings / quotes / leaderboard / reports** | STATIC | All from `content.ts`; need to read from Postgres (the data is already there). |
| **Lessons cards** | NO-OP-ish | Every workshop card routes to the same `/workshop/intro` — needs per-id routing. |

## Tier 3 — Transactions

| Feature | Status | Gap |
|---|---|---|
| **Premium subscription** (`settings/premium`) | NO-OP | "Start free trial" has no handler; no in-app-purchase / Stripe. |
| **Payments / add card** (`settings/add-card`, `payment`) | LOCAL-ONLY | No tokenization; "Save card" just navigates back. Cards list is static. |
| **Meeting booking** (`meetings/book`, `[id]`) | LOCAL-ONLY | Booking shows a success modal but nothing is reserved; paid flow has no payment. |

## Tier 4 — Settings & account actions

| Feature | Status | Gap |
|---|---|---|
| **Change password** (`settings/change-password`) | NO-OP | The "Update password" button has **no onPress at all**. |
| **Notification toggles** (`settings/notifications`) | LOCAL-ONLY | 5 switches save nowhere. |
| **Theme** (`settings/theme`) | LOCAL-ONLY | Selection never applied app-wide (no theme provider / dark mode). |
| **Language** (`settings/languages`) | LOCAL-ONLY | No i18n; text never changes. |
| **Log out / Delete account** (`profile`) | NO-OP | Confirm modal opens, confirm does nothing. |

## Tier 5 — Social / community depth

| Feature | Status | Gap |
|---|---|---|
| **Create post** (`feed/new`) | NO-OP | "Post" just navigates back; nothing is created. "Add photo" is a no-op. |
| **Direct messages** (`feed/messages`) | STATIC | Thread list is hardcoded, rows aren't even tappable. |
| **Join community** (`feed/explore`) | LOCAL-ONLY | Join toggles locally; doesn't sync to "Your communities". |
| **Comments** (`feed/[id]`) | LOCAL-ONLY | Can type & post, but lost on exit. |
| **Post share / 3-dot menu** | NO-OP | Share & overflow menu do nothing. |

## Tier 6 — Smaller no-ops & polish

| Feature | Status | Gap |
|---|---|---|
| **Favorites / bookmarks** | NO-OP | Bookmark icons are decorative everywhere; favorites list is static. |
| **Notifications list** (`notifications`) | STATIC | No mark-as-read / fetch. |
| **"Contact my coach"** (`wheel`) | NO-OP | No handler. |
| **Profile → Change Image** | NO-OP | Routes to change-password; no image picker. |
| **Home checklist items** | partial | Only "check-in" navigates; others do nothing. |
| **Home segment tabs** (Programs/Workshop/Challenges) | NO-OP | Toggle state with no content change. |
| **Workshop "watch recommended videos"** | wrong-route | Goes Home instead of `/videos`. |
| **Worksheet download/upload** | LOCAL-ONLY | Download is a no-op; upload only flips local state. |

## What's already genuinely working (don't worry about these)

Tab bar & all navigation · Sparky AI chat (n8n) · daily check-in **flow + streak**
· community reactions (local) · quote card **share/download** · social external
links · FAQs accordion · PWA install guide · Wheel chart rendering · the new
check-in summary screen.

## Recommended sequence

1. **Foundation:** auth + real user + an n8n "app API" pattern (clone the Sparky
   webhook approach for read/write over Postgres).
2. **Core data loops:** persist check-in answers and wheel results (highest
   product value, data already modeled in Postgres).
3. **Content from Postgres:** videos/workshops/meetings/leaderboard read live +
   real video playback (reuse the Vimeo modal).
4. **Account & settings:** change-password, notification prefs, logout — quick
   wins once auth exists.
5. **Transactions:** premium / payments / booking (needs Stripe or IAP — biggest
   external lift).
6. **Social depth & polish:** posts, DMs, favorites, smaller no-ops.

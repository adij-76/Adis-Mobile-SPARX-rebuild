# Remaining placeholder / dead controls — current snapshot

Re-scan after the "make it feel alive" passes. Supersedes the status columns in
`feature-liveness-audit.md`. Split by whether it can be fixed **app-only** (local
persistence / wiring, no backend) or needs the **backend**.

## ✅ Now live (since the first audit)
Sparky chat · daily check-in flow + streak + summary · community post reactions ·
**comment reactions + threaded replies** · create post · comments · join/leave ·
favorites (video detail) persist · **real video playback** (video detail + workshop)
with hallucinated-link filtering · home checklist navigation · home segment tabs
(inline) · global header chat button · **post ••• menu** (start chat / hide / report /
delete / copy link) · **DM threads** + messages list.

## ⚡ App-only quick wins (no backend — I can do these now)

### Settings & account
- **Change password** (`settings/change-password`) — the "Update password" button has **NO onPress**. Add validation + success state (local).
- **Notification toggles** (`settings/notifications`) — 5 switches don't persist. Save to the store/AsyncStorage.
- **Theme** (`settings/theme`) — selection not saved or applied. At least persist; real dark mode is bigger (theme provider across all screens).
- **Language** (`settings/languages`) — not saved; full i18n is bigger. Persist the choice now.
- **Premium "Start 7-day free trial"** (`settings/premium`) — **NO onPress**. Wire it (→ payment screen / confirm). Real IAP needs backend.
- **Add card "Save card"** (`settings/add-card`) — just navigates back. Persist cards locally so they show in Payment. Real tokenization needs backend.
- **Profile "Change Image"** (`profile`) — routes to change-password (**wrong**). Fix route + add an image picker (web file input).
- **Profile stat links** — Workshops/Streak/Points all go to leaderboard. Route each appropriately (or make only Points→leaderboard).
- **Log out / Delete account** (`profile`) — confirm does **nothing**. Make it clear local data (`store.clearAll()`) + reset. (Real logout needs auth.)

### Content actions & media
- **Workshop "Watch recommended videos"** (`workshop/summary`) — goes Home; should go to `/videos`. One-line fix.
- **Worksheet "Download"** (`workshop/worksheet`) — no-op. Wire to open/share the worksheet file. (Upload already marks done locally.)
- **"Contact my coach"** (`mydata/wheel`) — **NO onPress**. → `/meetings/book` or start a chat with the coach.
- **Bookmark icons** on `workshop/intro` + `workshop-card` — static. Wire to `toggleFav('lesson', id)`.
- **Home video cards** (`(tabs)/index`) — no bookmark icon. Add quick-favorite (`toggleFav('video', id)`).
- **Workshop cards route to the same intro** — all go to `/workshop/intro`. Per-id routing needs a `/workshop/[id]` route (small build).

### Data that should persist locally
- **Check-in answers** — only the streak saves; mood/emotions/behavior/affirmation are discarded. Persist them (feeds Reports).
- **Wheel assessment results** — slider values lost on exit; wheel always shows mock scores. Persist to the store.
- **Meeting booking** (`meetings/[id]`, `book`) — shows a success modal but nothing is saved. Persist booked meetings locally so they stick + show in the list.
- **Notifications** (`notifications`) — static list, `unread` is decoration only. Add mark-as-read (local).
- **Reports** (`mydata/reports`) — static cards, no tap. Could generate from saved check-ins (local).

### Social polish
- **DMs are one-way** — you can send; the other side never replies. Optional: canned/demo replies for feel. Real two-way needs backend.

## 🔌 Backend-needed (your database / services)
- **Auth** — no login/signup; user is hardcoded "Okei"; Sparky uses `userId=11`.
- **Real content** — videos, workshops, lessons, leaderboard, reports from Postgres (the data you're prepping).
- **Payments / IAP** — premium subscription + real card tokenization.
- **Real-time DMs** — two-way messaging.
- **Server-side** check-in/wheel history, live leaderboard, real notifications feed, real meeting reservations.

## What persists today (AsyncStorage)
- `igntd.checkin.v1` → streak, points, lastDate
- `igntd.store.v1` → favorites, joined, userPosts, reactions, comments, commentReactions, replies, hidden, dms

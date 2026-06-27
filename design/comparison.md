# Original design vs. build — differences & decisions (v2)

Updated after the full export (device-framed mockups) which adds the Community
screens, the assessment flows, dark mode, and several richer flows missing from
the first export. Between both exports I now have visual reference for
essentially every screen.

Legend: ✅ matches · 🔁 should align to design · 💡 my choice may be worth keeping · 🆕 design has this, I built it differently/not at all

> This is a structural diff from the design overview. Exact pixel/spacing
> alignment happens per-screen during the fidelity pass.

---

## Global patterns

| # | Original | Built | Suggest |
|---|---|---|---|
| G1 | One shared dark-teal app header (avatar + greeting + bell/**trophy**/bookmark) on Home & Profile | Per-tab custom headers | 🔁 |
| G2 | Header = 3 icons incl. **trophy → leaderboard** + notification dot | 2 icons | 🔁 |
| G3 | **Peach/orange** tint for selected/"you"/highlight states | Teal tints | ❓ peach is more on-brand |
| G4 | Nav label "**My Lesson**" (singular) | "My Lessons" | 🔁 |
| G5 | **Dark mode exists** (Profile, Theme picker show a real dark theme) | Light-only; theme picker is cosmetic | 🆕 big: implement real theming |

---

## Already compared (export 1) — carry forward

- **Home** ✅ — add trophy icon + notif dot; minor.
- **Profile** 🔁 — groups **Essentials/IGNTD** (Leaderboard, Favourite, Notifications) · **Account** (Get Premium, Change Password, Full Assessment Summary) · **More** (Rate our app, Themes, Contact us, FAQs, Privacy, Terms); **Change Image** button; **Badge** stat; **LOG OUT** outlined button. Mine restructured + added orange Premium banner & delete row (💡 keep?).
- **Get Premium** 🔁 — stacked plans **$10.49 / $90.89** + **Free-vs-Premium table**. Mine: orange hero, side-by-side, free-trial (💡).
- **Leaderboard** 🔁 — centered title, **Total points / How to get more points** banner, rank on **right** w/ medal icons, peach "you" row.
- **Notification settings** 🔁 — only 3 items (Daily Quotes, Daily Streaks toggles; Community Settings nav row). Mine has 5 toggles.
- **Favorites** 🔁 — **3 tabs** (Lesson/Workshop/Video), 4.9★ rating, teal bookmark, and an **empty state** ("No favorites yet"). Mine: 2 tabs.

---

## NEW from full export

### Community  🔁🆕 (the big gap)
- **IGNTD Communities** (explore): a **grid of chat rooms** — General, Announcement, Hero Income Chat, Meditation Chat, Goals, Posts — each an icon tile, plus "Create a post". → I built a simple **join-list**; design is **chat-room oriented**.
- **Community guidelines** ✅ — rules list + "I agree" (matches my flow).
- **Create a post** ✅-ish — avatar + text field + image attach. Close to mine.
- **Post detail + comments** ✅ — comment list + composer (matches mine).
- **Update post** 🆕 — edit-post screen; I didn't build one.
- **Coach chat thread** 🆕 — 1:1 message thread (e.g. with Chavel Chambers). I built a messages **list** but no **thread** view.

### Daily Assessment  🔁🆕 (notable)
Design is a **varied multi-input flow**: 0–10 **mood slider**, **Yes/No** (e.g. "Did you drink in the past day?"), **"how much"** (A little / Same as usual / More than usual), **specific quantity** entry, and a **positive affirmation** free-text. Completion variants: **"Great Job!"** (+ recommended videos), **"You've earned a Badge"**, **"Day 11 streak +3 points"**. → I built **5 multiple-choice** questions + one completion. Should rebuild as the richer flow.

### Wheel of Life  🔁🆕 (significant — it's an assessment, not a static view)
The wheel is produced by an **assessment**: per-category question screens (**Purpose & Contribution, Health & Family, Romance & Fun, Personal Growth & Environment**) with **0–100 sliders** and sub-questions, then the **radial wheel chart** + Best/Support/Improved cards + "Contact my coach". My Data also shows a **donut** and a **"Restore streak — 2000 points"** modal. → I built a static bars view only. Needs the assessment flow + `react-native-svg` wheel.

### My Lessons  🔁🆕
Design is a **course/module curriculum** — Module 1–4 with Lessons, progress, "Continue from where you left off", and a **Lesson intro** screen ("Module 1 · Lesson 1", save-progress). → I built a **workshop browse list**. Different model.

### Meetings  🔁🆕
- **Book** is an **info form**: First/Last name, Email, **"I want to attend every week"** checkbox, **"Book Meeting for $25"**. → I built a date/time-slot picker.
- **Book a group** = list of available group meetings.
- **Meeting cancelled** screen ("Your meeting has been cancelled" + Book another). ✅ Meeting booked-success matches mine.

### FAQs  🔁
Two categories: **Non-Member FAQs / Member FAQs**. Mine is a flat accordion.

### Theme  🔁🆕
Picker = **System / Light Mode / Dark Mode** with a true dark theme behind it. Mine lists options but doesn't switch the app.

### Other screens present (mostly ✅ / minor)
How-to-install, Languages, Change password, Add/debit card (numpad), Payment method, Privacy, Terms, Quotes (fullscreen gradient cards), Recommended videos see-all/detail, Workshop intro/video/worksheet/see-all, Worksheet "Personal Power Statement" + "Quickstart Tips" text, Notifications inbox, Logout/Delete confirms — all close to what I built.

---

## Suggested priority order for the fidelity pass

1. **Global header + nav (G1, G2, G4)** — one change, every screen benefits.
2. **Profile** restructure (groups, Change Image, Badge, Log Out button).
3. **Wheel of Life** as the real assessment + radial chart (add `react-native-svg`).
4. **Daily Assessment** rich multi-input flow + completion variants.
5. **Community** as chat-rooms + coach chat thread + update-post.
6. **My Lessons** as module curriculum.
7. **Premium / Leaderboard / Favorites / Notifications settings / FAQs** detail alignment.
8. **Dark mode** (G5) — larger, do last.

---

# ✅ Decision sheet — mark this up

For each item: put an **X** in one column (or write a note). Default if blank =
**Match design**. Then send it back and I'll build the next pass exactly to spec.

### Global
| Item | Match design | Keep mine | Note |
|---|:---:|:---:|---|
| G1 Shared app header on all tabs | [ ] | [ ] | |
| G2 Trophy icon + notification dot in header | [ ] | [ ] | |
| G3 Peach/orange highlight tint (vs teal) | [ ] | [ ] | |
| G4 Nav label "My Lesson" (singular) | [ ] | [ ] | |
| G5 Real dark mode | [ ] | [ ] | later? |

### Screens
| Item | Match design | Keep mine | Note |
|---|:---:|:---:|---|
| Profile — groups / Change Image / Badge / Log Out button | [ ] | [ ] | |
| Profile — orange Premium banner (mine) | [ ] | [ ] | keep/drop |
| Profile — Delete-account row (mine) | [ ] | [ ] | keep/drop |
| Premium — prices $10.49 / $90.89 + comparison table | [ ] | [ ] | |
| Premium — free-trial CTA (mine) | [ ] | [ ] | keep/drop |
| Leaderboard — rank right + medals + points banner | [ ] | [ ] | |
| Notification settings — 3 items only | [ ] | [ ] | keep 5 toggles? |
| Favorites — 3 tabs + rating + empty state | [ ] | [ ] | |
| Logout — confirm modal (mine) vs outlined button | [ ] | [ ] | keep/drop |

### Bigger rebuilds (design is richer)
| Item | Build to design | Skip for now | Note |
|---|:---:|:---:|---|
| Wheel of Life as assessment + radial chart (needs react-native-svg) | [ ] | [ ] | |
| Daily Assessment multi-input flow + completion variants | [ ] | [ ] | |
| Community as chat-rooms + coach chat thread + edit-post | [ ] | [ ] | |
| My Lessons as module curriculum | [ ] | [ ] | |
| Meeting booking as info form ("attend every week", $25) | [ ] | [ ] | |
| FAQs split Non-Member / Member | [ ] | [ ] | |

### Build order
Pick one: **[ ] top-to-bottom (priority list above)**  ·  **[ ] custom: ______**

### Anything not captured / new edits you want
(Use this space — you mentioned you'll want some edits anyway.)
-
-

# Original design vs. build — differences & decisions

Comparison of the exported Figma designs against the screens I built on-brand
(while Figma access was rate-limited). For each screen: **Original** (Figma),
**Built** (current app), the **differences**, and a **suggestion**.

Legend: ✅ matches well · 🔁 should align to design · 💡 my choice may be worth keeping · ❓ your call

> Note: the export contains 65 of the 127 screens. Community feed screens
> (helping hands feed, make-a-post, explore communities) weren't in the export,
> so those aren't compared here yet.

---

## Global patterns (apply across screens)

| # | Original design | What I built | Suggest |
|---|---|---|---|
| G1 | **Same dark-teal app header** (avatar + "Hello Okei 👋" + bell/**trophy**/bookmark) persists on Home, Profile, and other top-level tabs | I gave each tab its own header (e.g. Profile has a centered avatar header) | 🔁 Standardise on the shared app header |
| G2 | Header has **3 icons**: bell (with red dot), **trophy** (→ leaderboard), bookmark | I used 2 (bell, bookmark) | 🔁 Add trophy + notification dot |
| G3 | Highlights/among accents use **peach/orange tint** (selected rows, "you" row, banners) | I leaned on teal tints | ❓ Peach is more on-brand; easy to switch |
| G4 | Bottom nav label is **"My Lesson"** (singular); My Data icon is a gear/asterisk | "My Lessons" + book icon | 🔁 Match labels/icons |
| G5 | Recommended-video cards use **left/right arrow** circles | I used a centre **play** button | ❓ Either works |

---

## Home  ✅ (close)

- **Differences:** header missing trophy icon + notification dot (G1–G2); program card shows both "100% 🔥" and a "24%" pill on the bar (I show one); video controls use arrows not play (G5).
- **Suggest:** 🔁 small header tweak; otherwise a faithful match.

## Profile  🔁 (notable)

| Original | Built |
|---|---|
| Keeps shared app header on top | Custom centered avatar header |
| **Change Image** button (teal) | "Edit profile" pill |
| Stats: **Days Streak / IGNTD Points / Badge** | Workshops / Day streak / Points |
| Groups: **IGNTD** (Leaderboard, Favourite, Notifications) · **Account** (Get Premium, Change Password, Full Assessment Summary) · **More** (Rate our app, Themes, Contact us, FAQs, Privacy Policy, Terms of Service) | ACCOUNT / SUPPORT & LEGAL groups; added an orange Premium banner; added Delete account row |
| **LOG OUT** = outlined button at bottom | Red danger row + confirm modal |
| No delete-account on this screen | Added delete row |

- **Suggest:** 🔁 restructure to match groups/labels. 💡 my logout-confirm modal and Premium banner are arguably nicer — your call whether to keep.

## Wheel of Life  🔁 (significant)

| Original | Built |
|---|---|
| Actual **radial wheel chart** (polar segments) | Horizontal progress bars |
| 5 paired categories /100: Purpose & Contribution 60, Business & Finance 80, **Health & Family 100**, Romance & Fun 40, Personal Growth & Environment 70 | 8 areas /10 (Health, Career, Relationships, …) |
| **Best Performing / Most support needed / Most Improved** cards | — |
| "Wheel of life" trend (Daily ▾, 0% ring) + **Contact my coach** button | A single balance ring |

- **Suggest:** 🔁 align categories, scoring (/100), the Best/Support/Improved cards and coach CTA. The polar chart needs `react-native-svg` — worth adding for fidelity.

## Get Premium  🔁 (notable)

| Original | Built |
|---|---|
| Title "Upgrade to Premium"; plans **stacked**: Monthly **$10.49**, Yearly **$90.89** | Orange gradient hero; plans **side-by-side**; $19/mo, $149/yr, "Save 35%" |
| **Free vs Premium comparison table** (Personalized Program, Private Hero Community, Guidance + Workshop, Onboarding Call, Live Weekly Groups, Access to All Recorded Group → Limited / Full access) | Checkmark benefit list |
| Button: **Get Premium** | "Start 7-day free trial" |

- **Suggest:** 🔁 use real prices + the comparison table. 💡 the free-trial CTA may convert better — optional.

## Leaderboard  🔁

| Original | Built |
|---|---|
| **Centered** title; **Total points: 412 / How to get more points ↗** banner | Large left title, no banner |
| Rank on the **right**; **medal icons** for top 3; "#4…" after | Rank on the **left**; colored numbers |
| **Your** row highlighted **peach**; avatars have green online dots | "You" row highlighted teal |

- **Suggest:** 🔁 move rank right + medals, add the points banner, peach highlight.

## Notification settings  🔁

- **Original:** 3 items — **Daily Quotes** (toggle), **Daily Streaks** (toggle), **Community Settings** (nav row "On ›").
- **Built:** 5 toggles (check-in, meetings, community, lessons, streak).
- **Suggest:** 🔁 trim to the 3 designed items. 💡 extra toggles are reasonable if you want finer control.

## Favorites  🔁

- **Original:** **3 tabs** — Lesson / Workshop / Video; rows show "14 min video", title, **4.9 ⭐ Adi Jaffe**, teal bookmark.
- **Built:** 2 tabs (Lessons / Videos); orange bookmark; no rating.
- **Suggest:** 🔁 add the Workshop tab + rating; bookmark teal.

---

## Screens built but not yet visually diffed (likely minor)

These I built from names only and look reasonable; verify against the PNGs and
align spacing/labels: **Theme/Themes**, **Languages**, **Change password**,
**Payment method / Add card**, **FAQs**, **Privacy Policy**, **Terms**,
**Full Assessment Summary**, **Notifications inbox**, **Messages**, **Daily
Assessment**, **Quotes**, **Recommended video see-all/detail**, plus the
calendar / "how it works" / points screens in the export.

## Not in the export (can't diff yet)

Community **feed / helping hands**, **make-a-post**, **explore communities**,
**view comment**, **update post**.

---

## How to use this

Reply with the IDs you want changed (e.g. "G1, G2, Profile, Wheel of Life,
Premium-prices") and which of my choices to keep (e.g. "keep logout modal,
keep free-trial CTA"). I'll do a fidelity pass screen-by-screen and redeploy.

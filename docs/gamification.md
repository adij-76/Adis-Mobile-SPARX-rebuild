# Gamification & engagement — model + roadmap

How points, streaks, multipliers, badges and bonuses work in the app today, and a
research-backed roadmap for what to add (and what to deliberately avoid) for a
**recovery population**. Tuning lives in code — this doc is the "why".

## Where the numbers live (all tunable in one place each)

| Concern | File |
|---|---|
| Video watch points (non-linear tiers) + streak multiplier | `src/lib/video-points.ts` |
| Streak milestones, badges, milestone bonuses | `src/lib/streaks.ts` |
| Special bonus-day / promo multipliers | `src/lib/bonus-events.ts` |
| Check-in points (streak-scaled schedule) | `src/lib/checkin.ts` |
| Persisted totals + award/credit logic | `src/lib/store.tsx` |

## The economy as built

**Video watch points — non-linear, progress-based.** Cumulative base points for the
furthest point watched: started `1` · past 50% `2` · finished (≥95%) `3`. Starting
already banks a point; finishing is the big step; a half-watch keeps its 2 points;
re-watching earns 0.

**Streak multiplier — capped so tenure never dominates.** The daily check-in streak
scales points earned: `×1` under 7 days, `×1.5` at a 7-day streak, `×2` at 14+. A
finished video is worth 3 / ~5 / 6 points at those tiers. Cumulative rounding means
a fractional ×1.5 can't inflate a straight-through watch.

**Streak milestones + numeric badges.** Reaching a milestone length (7, 14, 30, 60,
100, 180, 365 days) credits a badge **once per streak run** and pays a chunky
one-time bonus (flat — not multiplied, or the streak would double-count). Badges
carry a numeric indicator: a 7-day badge might read ×10 while a 30-day reads ×2,
because each *run* that reaches a length increments that length's count. A broken
streak resets crediting so the next run re-earns from scratch.

**Special bonus events.** Admin-defined date windows (`bonus-events.ts`) apply an
extra point multiplier (e.g. a double-points weekend), stacking on the streak
multiplier.

### Invariant: multipliers touch POINTS only, never the raw boards
The streak multiplier and bonus-event multiplier scale the **points total** a user
accumulates. They must **never** affect the raw leaderboards (videos watched,
percent watched, check-in counts), which count real activity — otherwise a
long-streak user or a bonus day would distort who actually did the most work. The
leaderboard functions count reward/watch *events*, not multiplied points, so this
holds by construction; keep it that way when wiring a points board.

### Pre-cutover vs cutover — where the data lives
Production is read-only until cutover, so points/badges accrue **app-side** — but
they are **persisted durably**, not just on-device. The store mirrors them to the
app-owned `mobile_game_state` table (`db/game-state.sql`): hydrated on auth,
pushed on every change, MAX-merged server-side so a stale/offline write can never
lower a total and progress survives reinstall + follows the user across devices.
At cutover they reconcile into the real `user_points` / `user_rewards` ledger (see
the migration catalogue — dedupe watch points against any `watched_video` reward
already emitted from `mobile_video_watches`). A live points *leaderboard* before
cutover needs the streak multiplier computed server-side — deliberately deferred.

## Research-backed roadmap (recovery-population aware)

Full synthesis (Duolingo, Habitica, recovery/habit apps, Octalysis/Fogg/Hook/SDT,
anti-patterns) informs the priorities below. Our current stack leans heavily on
**loss-aversion / extrinsic** drivers (streaks, multipliers, leaderboards) — the
highest-engagement but highest-risk quadrant for an addiction population. The work
below is mostly about **balancing** that with autonomy, competence, relatedness,
and forgiveness.

**Tier 1 — highest priority, low effort, high safety**
1. **Streak freeze / grace days before the ×2 multiplier ships live.** The multiplier
   sharpens loss-anxiety; ship the safety net first. Auto-grant 1–2 grace days/month;
   a missed day is repaired, not punished. (Duolingo found forgiveness *increases*
   retention.)
2. **Keep "app-engagement streak" and "sobriety time" as two distinct, clearly
   labelled numbers.** Never let a broken app-streak read as a broken sobriety.
   Preserve lifetime totals + longest streak through any reset.
3. **Recovery-native milestone chips** (24h, 1wk, 30/60/90, 6mo, 1yr) — personal,
   non-competitive (mirrors AA/NA chips). Our badges/bonuses already do this; align
   the intervals.
4. **Weight rewards toward *verified* actions** (video completion, live-group
   attendance, course completion) over self-reported check-ins. Don't put the biggest
   multipliers on the easiest-to-fake tap — this directly serves "reward showing up &
   finishing" and "don't incentivize false data." (Contingency-management evidence:
   rewarding *verified* behavior is what works clinically.)

**Tier 2 — high impact, medium effort**
5. **Wrap videos into named multi-part "journeys/courses" with a completion badge** —
   rewards *finishing programs*, not one-off watching.
6. **Tiered leagues among similar-tenure peers** (Duolingo-style, weekly reset) to
   replace/augment the global board — fixes newcomer discouragement — plus a hard
   opt-out and a personal-best view. Never rank by sobriety length.
7. **Cooperative group goals** for coaching groups (collective progress bar,
   positive-only) — relatedness without head-to-head competition.

**Tier 3 — nice-to-have**
8. Growing avatar/companion (Finch-style) tied to cumulative program completion.
9. Points-as-currency sink (unlock cosmetics / fund a self-chosen real reward).
10. Daily forward pledge paired with the check-in (intention, not surveillance).

**Deliberately avoid:** hearts/lives or any "lose progress for a missed day/mistake"
penalty (maps to punishing slips); ranking users by sobriety length; monetized or
high-variance loot-box randomness (slot-machine mechanics on an addiction-prone
population); guilt-trip notifications. Keep surprise/bonus mechanics mild and never
monetized.

**Guiding principle:** rewards should *reflect* progress, never *substitute* for the
reason to recover (extrinsic reward can crowd out intrinsic motivation). Retain
through accumulated value and support, not anxiety and shame.

### Sources
Duolingo blog; Yu-kai Chou *Octalysis*; BJ Fogg Behavior Model; Nir Eyal *Hooked*;
Self-Determination Theory (Deci & Ryan; 1999 over-justification meta-analysis);
Habitica wiki; I Am Sober; Finch; Fabulous; Streaks / Way of Life; NIDA on
Contingency Management; Kahneman & Tversky (loss aversion). Verify any specific
published statistic against the primary source before using it in product copy.

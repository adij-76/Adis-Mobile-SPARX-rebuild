# Auth identity hardening (audit S-C2) — runbook

**Issue:** #135 · Gate 0 · Critical. Companion finding S-C1 (base tables readable
with the anon key) is already fixed & live (`db/lockdown-base-tables.sql`).

## The exploit, precisely

Every per-user view resolves the caller to a production `users` row by matching
the **email string** in the GoTrue JWT:

```sql
where lower(u.email) = lower(auth.jwt() ->> 'email')
```

Sign-up is open/self-service. So identity is a *mutable, self-asserted email*.
If **email confirmation is disabled**, an attacker can register a victim's email
address, immediately receive a session whose JWT carries that email, and read the
victim's `mobile_me` (name, program, addiction label, zoom_email, team) and every
scoped health view (assessments, check-ins, use-tracking, wheel, …). The same
class covers an unconfirmed GoTrue email-*change* to someone else's address.

## The load-bearing fix — enable email confirmation (dashboard, ~2 min)

This is the single change that closes the exploit, and it can only be done in the
Supabase dashboard (it is an Auth setting, not code):

1. **Supabase → Authentication → Sign In / Providers → Email.**
2. Turn **"Confirm email" ON**. With it on, a new sign-up gets **no session**
   until the address is confirmed from its real inbox — so registering a victim's
   email yields nothing, because the attacker can't open the victim's mail.
3. **Authentication → URL Configuration** — this is REQUIRED, not optional (see
   the gotcha below). Set exactly:
   - **Site URL:**
     ```
     https://adij-76.github.io/Adis-Mobile-SPARX-rebuild
     ```
     Include the `/Adis-Mobile-SPARX-rebuild` sub-path — the app is served there
     on GitHub Pages; the bare `adij-76.github.io` root has no app.
   - **Redirect URLs** (allow-list, wildcards ok):
     ```
     https://adij-76.github.io/Adis-Mobile-SPARX-rebuild/**
     http://localhost:8081/**
     ```
     (the localhost entry is only for local dev testing.)

### GOTCHA: confirmation link → "unreachable page" (already hit once)

If Site URL / Redirect URLs are wrong or unset, the confirmation email verifies
the user and then redirects them to the **default Site URL** — Supabase's stock
`http://localhost:3000`, or the bare `github.io` root with no app — so the tester
lands on an **unreachable page** and can never finish signing up. Symptoms:
"I click the link in the email and get an unreachable/site-can't-be-reached page."

Fixes, both needed:
- **Dashboard:** set Site URL + Redirect URLs exactly as above.
- **App (shipped):** `signUp` now sends its own `redirect_to = origin +
  EXPO_PUBLIC_BASE_URL` (`src/api/supabase.ts`), so confirmation returns to the
  live app and `auth.tsx` picks up the `#access_token` from the hash. Supabase
  only honors that redirect if it matches the **Redirect URLs** allow-list — so
  the dashboard step is still required.
- **Old emails stay broken:** the redirect is baked into each email at send time.
  After fixing the dashboard, the affected tester must request a **fresh**
  confirmation email (resend / sign up again); the old link keeps failing.

### Why this does NOT lock out existing users

Every migrated production user was imported with `email_confirmed_at = now()`
(see `db/auth-and-storage.sql` §1 — the import supplies `now()` for
`email_confirmed_at`). Confirmed accounts are unaffected by the toggle; they keep
signing in normally. Verify before and after flipping it:

```sql
-- Should be 0 (or only genuinely-unconfirmed brand-new testers): existing users
-- who would lose access if confirmation is enforced.
select count(*)
from auth.users
where email_confirmed_at is null;

-- Spot-check that a known real user is confirmed:
select email, email_confirmed_at
from auth.users
where lower(email) = 'adijaffe+1@gmail.com';
```

If a handful of legitimate testers signed up while confirmation was off and never
verified, confirm them once so they aren't stranded:

```sql
-- OPTIONAL, one-off: mark specific known-good tester emails confirmed.
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) in ('fred@example.com', 'idunails@example.com');  -- edit list
```

## Defense-in-depth (optional DB layer) — bind to the confirmed identity

The dashboard toggle is sufficient. As belt-and-suspenders, the DB caller-
resolution can be hardened so it (a) resolves via the immutable `auth.uid()` and
(b) refuses to resolve an **unconfirmed** account even if the toggle were ever
turned back off. A single helper centralises the rule:

```sql
-- Runs first (add to db/testing-access.sql, before any view that scopes by email).
-- Returns the caller's CONFIRMED email, bound to the immutable auth.uid(); NULL
-- for anon or an unconfirmed account. SECURITY DEFINER to read auth.users.
create or replace function public.mobile_caller_email()
  returns text
  language sql
  stable
  security definer
  set search_path = auth, public
as $$
  select au.email
  from auth.users au
  where au.id = auth.uid()
    and au.email_confirmed_at is not null
$$;
grant execute on function public.mobile_caller_email() to authenticated;
```

Then replace `auth.jwt() ->> 'email'` with `public.mobile_caller_email()` at the
~29 call sites across `db/*.sql` (views + `mobile_effective_role_id`).

**Blast-radius warning (AGENTS.md).** Files in `db/apply-order.txt` are
auto-applied to the **live** prod DB on merge to `main`. A subtle mistake in a
scoped view empties the live app for every user — this has happened twice. So
this rebinding must be:

1. Applied only **after** the dashboard toggle is on and the
   `email_confirmed_at is null` count above is 0 (else confirmed-but-unmigrated
   edge users lose access);
2. Validated end-to-end (sign in as a real user, confirm every scoped view still
   returns data) before/at merge;
3. Sequenced in lock-step with `main` per AGENTS.md.

Because the toggle already closes the exploit and the rebinding carries live-app
risk disproportionate to its marginal gain, it is documented here as a reviewed,
ready-to-apply step rather than shipped as an auto-applied migration. Do it as its
own focused, validated change when convenient.

## Checklist

- [ ] Dashboard: **Confirm email = ON** (Authentication → Providers → Email).
- [ ] Dashboard: **Site URL** = `https://adij-76.github.io/Adis-Mobile-SPARX-rebuild`
      (with the sub-path).
- [ ] Dashboard: **Redirect URLs** include `https://adij-76.github.io/Adis-Mobile-SPARX-rebuild/**`
      (+ `http://localhost:8081/**` for dev). Required or confirmation links go to
      the default unreachable page.
- [ ] After fixing URLs, affected testers request a **fresh** confirmation email
      (old links have the broken redirect baked in).
- [ ] Verify `select count(*) from auth.users where email_confirmed_at is null` is
      0 (or only genuinely-unconfirmed accounts you're fine locking out).
- [ ] (Optional) confirm any known-good tester emails left unverified.
- [ ] (Optional, later) apply the `mobile_caller_email()` rebinding, validated and
      lock-stepped with `main`.

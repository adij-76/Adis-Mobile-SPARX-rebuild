#!/usr/bin/env node
/**
 * DB contract audit — asserts the invariants that have regressed before, so they
 * can't silently come back. Run daily + on every merge touching db/ (see
 * .github/workflows/audit-db.yml), or locally.
 *
 * Checks (anon key — always run):
 *   1. Catalog views return rows (mobile_programs / mobile_modules / mobile_lessons).
 *   2. NO lesson fan-out: every mobile_lessons id is unique (the duplicate-rows bug).
 *   3. Back-compat columns exist: mobile_lessons exposes module_id AND portion_id;
 *      mobile_me exposes avatar_url+avatar, addiction_label+addiction,
 *      days_updated_at+days_counter_updated_at (renames that once broke the live app).
 *
 * Checks (with AUDIT_USER_EMAIL/PASSWORD — per-user views):
 *   4. mobile_me returns exactly one row with a non-null name.
 *   5. mobile_recommended_videos: every row has a real title (never empty and never
 *      the "No description available" placeholder).
 *   6. mobile_lessons (as the user) has no duplicate ids and unlocks program content.
 *
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY (required); AUDIT_USER_EMAIL, AUDIT_USER_PASSWORD
 * (optional — enables the per-user checks). Exits non-zero on any failure.
 */

const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const ANON = process.env.SUPABASE_ANON_KEY || '';
const EMAIL = process.env.AUDIT_USER_EMAIL || '';
const PASSWORD = process.env.AUDIT_USER_PASSWORD || '';

if (!BASE || !ANON) {
  console.error('Missing env: set SUPABASE_URL and SUPABASE_ANON_KEY.');
  process.exit(2);
}

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.error(`  ✗ ${msg}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

/** GET a PostgREST view. Returns {status, rows}. token overrides the anon auth. */
async function get(path, token) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token || ANON}`, Accept: 'application/json' },
  });
  let rows = null;
  try {
    rows = await res.json();
  } catch {
    /* non-JSON error body */
  }
  return { status: res.status, rows };
}

/** Assert selecting the given columns succeeds (they exist) — a 400 means a
 *  column was renamed/dropped, which would break whatever build reads it. */
async function assertColumns(view, columns, token) {
  const { status } = await get(`${view}?select=${columns.join(',')}&limit=1`, token);
  if (status === 200) ok(`${view} exposes [${columns.join(', ')}]`);
  else fail(`${view} is missing one of [${columns.join(', ')}] (HTTP ${status}) — a column was renamed/dropped`);
}

async function signIn() {
  const res = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`sign-in failed (${res.status}): ${data.error_description || data.msg || ''}`);
  return data.access_token;
}

const dupes = (ids) => {
  const seen = new Set();
  const dup = new Set();
  for (const id of ids) (seen.has(id) ? dup : seen).add(id);
  return [...dup];
};

async function run() {
  console.log('DB contract audit\n— anon-tier checks —');

  // 1. Catalog health
  for (const view of ['mobile_programs', 'mobile_modules', 'mobile_lessons']) {
    const { status, rows } = await get(`${view}?select=id&limit=1`);
    if (status === 200 && Array.isArray(rows) && rows.length) ok(`${view} returns rows`);
    else fail(`${view} returned nothing (HTTP ${status})`);
  }

  // 2. No lesson fan-out (unique ids)
  {
    const { status, rows } = await get('mobile_lessons?select=id&limit=2000');
    if (status !== 200 || !Array.isArray(rows)) fail(`mobile_lessons id fetch failed (HTTP ${status})`);
    else {
      const d = dupes(rows.map((r) => r.id));
      if (d.length) fail(`mobile_lessons has DUPLICATE ids (fan-out): ${d.slice(0, 5).join(', ')}${d.length > 5 ? '…' : ''}`);
      else ok(`mobile_lessons has no duplicate ids (${rows.length} lessons)`);
    }
  }

  // 3. Back-compat columns
  await assertColumns('mobile_lessons', ['module_id', 'portion_id']);
  await assertColumns('mobile_me', ['avatar_url', 'avatar', 'addiction_label', 'addiction', 'days_updated_at', 'days_counter_updated_at']);

  // Per-user checks
  if (!EMAIL || !PASSWORD) {
    console.log('\n— per-user checks skipped (set AUDIT_USER_EMAIL / AUDIT_USER_PASSWORD to enable) —');
  } else {
    console.log('\n— per-user checks —');
    let token;
    try {
      token = await signIn();
      ok('signed in as audit user');
    } catch (e) {
      fail(String(e.message || e));
    }
    if (token) {
      // 4. mobile_me
      const me = await get('mobile_me?limit=2', token);
      if (me.status === 200 && Array.isArray(me.rows) && me.rows.length === 1 && me.rows[0].name)
        ok('mobile_me returns exactly one row with a name');
      else fail(`mobile_me expected 1 named row, got HTTP ${me.status} / ${JSON.stringify(me.rows)?.slice(0, 120)}`);

      // 5. Recommended video titles (no empty / placeholder)
      const rec = await get('mobile_recommended_videos?select=id,title&limit=50', token);
      if (rec.status !== 200 || !Array.isArray(rec.rows)) fail(`mobile_recommended_videos fetch failed (HTTP ${rec.status})`);
      else if (!rec.rows.length) console.log('  · mobile_recommended_videos empty for audit user (no recommendations) — skipping title check');
      else {
        const bad = rec.rows.filter((r) => !r.title || !r.title.trim() || r.title.trim().toLowerCase() === 'no description available');
        if (bad.length) fail(`${bad.length} recommended video(s) have an empty/placeholder title (e.g. id ${bad[0].id})`);
        else ok(`all ${rec.rows.length} recommended videos have real titles`);
      }

      // 6. mobile_lessons as the user — no dupes, unlocks content
      const ul = await get('mobile_lessons?select=id,accessible&limit=2000', token);
      if (ul.status === 200 && Array.isArray(ul.rows)) {
        const d = dupes(ul.rows.map((r) => r.id));
        if (d.length) fail(`mobile_lessons (as user) has duplicate ids: ${d.slice(0, 5).join(', ')}`);
        else ok(`mobile_lessons (as user) has no duplicates`);
        if (ul.rows.some((r) => r.accessible)) ok('user can access at least one lesson');
        else fail('user has ZERO accessible lessons (gating too strict / me not resolving)');
      } else fail(`mobile_lessons (as user) fetch failed (HTTP ${ul.status})`);
    }
  }

  console.log('');
  if (failures.length) {
    console.error(`AUDIT FAILED — ${failures.length} issue(s).`);
    process.exit(1);
  }
  console.log('AUDIT PASSED — all contract invariants hold.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

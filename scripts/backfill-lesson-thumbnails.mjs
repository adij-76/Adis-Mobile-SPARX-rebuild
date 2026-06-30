#!/usr/bin/env node
/**
 * Backfill lesson (and workshop) thumbnails from the Vimeo API.
 *
 * Workshops/lessons have no thumbnail column in the DB, so the app falls back to
 * Vimeo's public oEmbed — which returns nothing for private/domain-restricted
 * videos. This populates a real `thumbnail_url` column by calling the
 * authenticated Vimeo API (which works regardless of a video's privacy), so the
 * `mobile_lessons` view can surface it and every card gets a real image.
 *
 * For each row that has a Vimeo reference (vimeo_id or a vimeo.com URL) but no
 * thumbnail_url yet, it asks Vimeo for the video's pictures and stores the
 * largest one. Resumable: only rows still missing a thumbnail are touched.
 *
 * Prereqs (run once in Supabase SQL editor):
 *   alter table lessons add column if not exists thumbnail_url text;
 *   -- then expose it in the view (replace the `null::text as thumbnail` line):
 *   --   create or replace view mobile_lessons as select …, thumbnail_url as thumbnail from lessons l;
 *
 * Usage (GitHub Action "Backfill lesson thumbnails", or locally):
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=<service_role> VIMEO_ACCESS_TOKEN=... \
 *   node scripts/backfill-lesson-thumbnails.mjs
 *   TABLE=lessons (default; or snippets)  ·  LIMIT=5  ·  CONCURRENCY=5
 *
 * SECURITY: SUPABASE_SERVICE_KEY is the service_role (secret) key — local/CI only.
 * The VIMEO_ACCESS_TOKEN needs read scope on your videos.
 */

const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_KEY || '';
const VIMEO = process.env.VIMEO_ACCESS_TOKEN || '';
const TABLE = (process.env.TABLE || 'lessons').trim();
const rawLimit = (process.env.LIMIT || '').trim().toLowerCase();
const LIMIT = !rawLimit || rawLimit === '0' || rawLimit === 'all' ? Infinity : parseInt(rawLimit, 10);
const CONCURRENCY = process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : 5;
const PAGE = 200;

if (!BASE || !SERVICE || !VIMEO) {
  console.error('Missing env. Set SUPABASE_URL, SUPABASE_SERVICE_KEY, VIMEO_ACCESS_TOKEN.');
  process.exit(1);
}

const restHeaders = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  'Content-Type': 'application/json',
};

const empty = (s) => !s || !String(s).trim();

/** Numeric Vimeo id from a `vimeo_id` value or a vimeo.com URL. */
function vimeoId(row) {
  if (row.vimeo_id != null && String(row.vimeo_id).trim()) {
    const m = String(row.vimeo_id).match(/\d+/);
    if (m) return m[0];
  }
  if (row.vimeo_url) {
    const m = String(row.vimeo_url).match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (m) return m[1];
  }
  return null;
}

/** Keyset-paginate every row that has a Vimeo reference but no thumbnail yet. */
async function* iterateRows() {
  let lastId = 0;
  for (;;) {
    const params = new URLSearchParams({
      select: 'id,vimeo_url,vimeo_id,thumbnail_url',
      thumbnail_url: 'is.null',
      id: `gt.${lastId}`,
      order: 'id.asc',
      limit: String(PAGE),
    });
    const res = await fetch(`${BASE}/rest/v1/${TABLE}?${params}`, { headers: restHeaders });
    if (!res.ok) throw new Error(`select ${res.status}: ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) return;
    for (const r of rows) yield r;
    lastId = rows[rows.length - 1].id;
  }
}

/** Largest thumbnail URL from the Vimeo video's pictures. */
async function fetchThumbnail(id) {
  const res = await fetch(`https://api.vimeo.com/videos/${id}?fields=pictures.sizes`, {
    headers: { Authorization: `bearer ${VIMEO}`, Accept: 'application/vnd.vimeo.*+json;version=3.4' },
  });
  if (res.status === 404) return null; // video gone / not accessible to this token
  if (!res.ok) throw new Error(`vimeo ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const sizes = data?.pictures?.sizes;
  if (!Array.isArray(sizes) || !sizes.length) return null;
  // sizes is ascending by width; take the largest.
  return sizes[sizes.length - 1].link || null;
}

async function update(id, thumbnail_url) {
  const res = await fetch(`${BASE}/rest/v1/${TABLE}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...restHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ thumbnail_url }),
  });
  if (!res.ok) throw new Error(`update ${id} ${res.status}: ${await res.text()}`);
}

async function run() {
  console.log(`Collecting ${TABLE} rows with a Vimeo ref but no thumbnail…`);
  const todo = [];
  for await (const r of iterateRows()) {
    const id = vimeoId(r);
    if (id && empty(r.thumbnail_url)) todo.push({ rowId: r.id, vimeoId: id });
    if (todo.length >= LIMIT) break;
  }
  console.log(`${todo.length} to process · table ${TABLE} · concurrency ${CONCURRENCY}`);

  let done = 0;
  let skipped = 0;
  let failed = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      const row = todo[cursor++];
      try {
        const thumb = await fetchThumbnail(row.vimeoId);
        if (thumb) {
          await update(row.rowId, thumb);
          done++;
        } else {
          skipped++;
          console.error(`  – id ${row.rowId} (vimeo ${row.vimeoId}): no picture available`);
        }
      } catch (e) {
        failed++;
        console.error(`  ✗ id ${row.rowId}: ${e.message}`);
      }
      if ((done + skipped + failed) % 25 === 0) {
        console.log(`  ${done + skipped + failed}/${todo.length}  (ok ${done}, skip ${skipped}, fail ${failed})`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));
  console.log(`\nDone. Updated ${done}, skipped ${skipped}, failed ${failed}. Re-run to retry failures.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Backfill snippet titles + descriptions from snippets.transcript using Claude.
 *
 * For each classified snippet with a transcript, asks Claude for a short title
 * and a 1–2 sentence description, then fills whichever DB columns are missing:
 *   - ai_summary  (shown as the description) — when empty
 *   - title       — when both title and the description column are empty/placeholder
 *
 * One-off and resumable: only rows still missing something are touched, so you
 * can stop / re-run any time. The mobile_snippets view surfaces these, so the
 * app updates as they land — no redeploy.
 *
 * Usage (GitHub Action "Backfill snippet summaries", or locally):
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=<service_role> ANTHROPIC_API_KEY=... \
 *   node scripts/backfill-snippet-summaries.mjs
 *   LIMIT=5  -> test a few   ·   CONCURRENCY=5   ·   MODEL=claude-haiku-4-5-20251001
 *
 * SECURITY: SUPABASE_SERVICE_KEY is the service_role (secret) key — local/CI only.
 */

const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_KEY || '';
const ANTHROPIC = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.MODEL || 'claude-haiku-4-5-20251001';
const rawLimit = (process.env.LIMIT || '').trim().toLowerCase();
const LIMIT = !rawLimit || rawLimit === '0' || rawLimit === 'all' ? Infinity : parseInt(rawLimit, 10);
const CONCURRENCY = process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : 5;
const PAGE = 200;
const MAX_TRANSCRIPT_CHARS = 6000;

if (!BASE || !SERVICE || !ANTHROPIC) {
  console.error('Missing env. Set SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY.');
  process.exit(1);
}

const restHeaders = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  'Content-Type': 'application/json',
};

const empty = (s) => !s || !String(s).trim();
const placeholderTitle = (s) => empty(s) || /no description/i.test(String(s));

const PROMPT = [
  'You write copy for short-form videos in SPARx, a recovery and personal-growth',
  'coaching app. From the transcript, return ONLY a JSON object with two keys:',
  '"title" — a punchy 3–7 word title (no quotes, no trailing punctuation), and',
  '"summary" — a warm, second-person 1–2 sentence description (max ~240 chars) of',
  'what the viewer gets. Output only the JSON, no markdown, no preamble.',
].join(' ');

/** Keyset-paginate every classified snippet that has a transcript. */
async function* iterateRows() {
  let lastId = 0;
  for (;;) {
    const params = new URLSearchParams({
      select: 'id,transcript,title,description,ai_summary',
      classified: 'eq.true',
      transcript: 'not.is.null',
      id: `gt.${lastId}`,
      order: 'id.asc',
      limit: String(PAGE),
    });
    const res = await fetch(`${BASE}/rest/v1/snippets?${params}`, { headers: restHeaders });
    if (!res.ok) throw new Error(`select ${res.status}: ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) return;
    for (const r of rows) yield r;
    lastId = rows[rows.length - 1].id;
  }
}

async function generate(transcript) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 220,
      messages: [
        { role: 'user', content: `${PROMPT}\n\nTRANSCRIPT:\n${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data.content?.[0]?.text || '').trim();
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const parsed = JSON.parse(json);
  return { title: String(parsed.title || '').trim(), summary: String(parsed.summary || '').trim() };
}

async function update(id, patch) {
  const res = await fetch(`${BASE}/rest/v1/snippets?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...restHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`update ${id} ${res.status}: ${await res.text()}`);
}

async function run() {
  console.log('Collecting snippets that need a title and/or summary…');
  const todo = [];
  for await (const r of iterateRows()) {
    if (empty(r.transcript)) continue;
    const needsSummary = empty(r.ai_summary);
    const needsTitle = empty(r.title) && placeholderTitle(r.description);
    if (needsSummary || needsTitle) {
      todo.push({ id: r.id, transcript: String(r.transcript), needsSummary, needsTitle });
    }
    if (todo.length >= LIMIT) break;
  }
  console.log(`${todo.length} to process · model ${MODEL} · concurrency ${CONCURRENCY}`);

  let done = 0;
  let failed = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      const row = todo[cursor++];
      try {
        const { title, summary } = await generate(row.transcript);
        const patch = {};
        if (row.needsSummary && summary) patch.ai_summary = summary;
        if (row.needsTitle && title) patch.title = title;
        if (Object.keys(patch).length) {
          await update(row.id, patch);
          done++;
        } else {
          failed++;
          console.error(`  ✗ id ${row.id}: model returned nothing usable`);
        }
      } catch (e) {
        failed++;
        console.error(`  ✗ id ${row.id}: ${e.message}`);
      }
      if ((done + failed) % 25 === 0) {
        console.log(`  ${done + failed}/${todo.length}  (ok ${done}, fail ${failed})`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));
  console.log(`\nDone. Updated ${done}, failed ${failed}. Re-run to retry any failures.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

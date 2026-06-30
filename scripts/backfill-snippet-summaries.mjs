#!/usr/bin/env node
/**
 * Backfill snippets.ai_summary from snippets.transcript using Claude.
 *
 * One-off and resumable: it only summarises rows that have a transcript and no
 * ai_summary yet, so you can stop/re-run any time and it picks up where it left
 * off. The mobile_snippets view already surfaces ai_summary as `description`, so
 * the app shows them automatically as they land — no redeploy needed.
 *
 * Usage (run on your machine, not in CI — needs network to Supabase + Anthropic):
 *
 *   SUPABASE_URL="https://aefkemjpzpdblzgvtssy.supabase.co" \
 *   SUPABASE_SERVICE_KEY="<service_role secret key>" \
 *   ANTHROPIC_API_KEY="<your anthropic key>" \
 *   node scripts/backfill-snippet-summaries.mjs
 *
 * Test a handful first:   LIMIT=5 node scripts/backfill-snippet-summaries.mjs
 * Tune throughput:        CONCURRENCY=5  (parallel LLM calls, default 5)
 * Pick a model:           MODEL=claude-haiku-4-5-20251001  (default; cheap + fast)
 *
 * SECURITY: SUPABASE_SERVICE_KEY is the service_role (secret) key — it bypasses
 * RLS so the script can UPDATE. Keep it local; never commit it or ship it to the
 * client. This script is the only place that key should ever be used.
 */

const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_KEY || '';
const ANTHROPIC = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.MODEL || 'claude-haiku-4-5-20251001';
// LIMIT: a number to cap how many to process; "0", "all", or empty means everything.
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

const PROMPT = [
  'You write short, engaging descriptions for short-form videos in SPARx, a',
  'recovery and personal-growth coaching app. From the transcript below, write a',
  'single 1–2 sentence description (max ~240 characters) telling the viewer what',
  "they'll get from this clip. Warm, direct, second person. Output ONLY the",
  'description text — no quotes, no preamble, no markdown.',
].join(' ');

/** Keyset-paginate every classified snippet that has a transcript. */
async function* iterateRows() {
  let lastId = 0;
  for (;;) {
    const params = new URLSearchParams({
      select: 'id,transcript,ai_summary',
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

async function summarize(transcript) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 160,
      messages: [
        { role: 'user', content: `${PROMPT}\n\nTRANSCRIPT:\n${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content?.[0]?.text || '').trim();
}

async function update(id, summary) {
  const res = await fetch(`${BASE}/rest/v1/snippets?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...restHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ ai_summary: summary }),
  });
  if (!res.ok) throw new Error(`update ${id} ${res.status}: ${await res.text()}`);
}

async function run() {
  console.log(`Collecting snippets that need a summary…`);
  const todo = [];
  for await (const r of iterateRows()) {
    const transcript = (r.transcript || '').trim();
    const summary = (r.ai_summary || '').trim();
    if (transcript && !summary) todo.push({ id: r.id, transcript });
    if (todo.length >= LIMIT) break;
  }
  console.log(`${todo.length} to summarise · model ${MODEL} · concurrency ${CONCURRENCY}`);

  let done = 0;
  let failed = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      const row = todo[cursor++];
      try {
        const summary = await summarize(row.transcript);
        if (summary) {
          await update(row.id, summary);
          done++;
        } else {
          failed++;
          console.error(`  ✗ id ${row.id}: empty summary`);
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
  console.log(`\nDone. Summarised ${done}, failed ${failed}. Re-run to retry any failures.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

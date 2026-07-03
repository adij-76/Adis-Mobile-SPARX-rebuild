#!/usr/bin/env node
/**
 * Keeps docs/db-migration-catalogue.md — the "everything needed to migrate
 * production here" bible — in lock-step with the actual DB layer.
 *
 * Fails (exit 1) if:
 *   1. a db/*.sql file isn't named anywhere in the catalogue, or
 *   2. a mobile_* object (view/table/function) defined in db/*.sql isn't
 *      documented in the catalogue.
 *
 * Runs on every db/** or docs/** change AND on a daily schedule, so the doc can
 * never silently drift from the SQL. No DB access — pure file check.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DB_DIR = 'db';
const CATALOGUE = 'docs/db-migration-catalogue.md';

const doc = readFileSync(CATALOGUE, 'utf8');
const sqlFiles = readdirSync(DB_DIR).filter((f) => f.endsWith('.sql'));

const problems = [];

// 1) every SQL file must be referenced by name in the catalogue
for (const f of sqlFiles) {
  if (!doc.includes(f)) {
    problems.push(`db/${f} — file not referenced in the catalogue (add it to section A run order)`);
  }
}

// 2) every mobile_* object created in the SQL must be named in the catalogue
const objectRe =
  /create\s+(?:or\s+replace\s+)?(?:materialized\s+)?(?:view|table|function)\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(mobile_[a-z0-9_]+)/gi;
const objects = new Map(); // name -> defining file
for (const f of sqlFiles) {
  const sql = readFileSync(join(DB_DIR, f), 'utf8');
  for (const m of sql.matchAll(objectRe)) {
    const name = m[1].toLowerCase();
    if (!objects.has(name)) objects.set(name, f);
  }
}
for (const [name, f] of objects) {
  if (!doc.includes(name)) {
    problems.push(`${name} (defined in db/${f}) — object not documented in the catalogue`);
  }
}

if (problems.length) {
  console.error(`\n✗ Migration catalogue is out of date (${CATALOGUE}):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    `\nUpdate ${CATALOGUE} in the same change: add new files to section A (run order),\n` +
      `and app-owned write tables to sections B (preserve) and C (reconcile).\n`,
  );
  process.exit(1);
}

console.log(
  `✓ Migration catalogue OK — ${sqlFiles.length} SQL files and ${objects.size} mobile_* objects all documented.`,
);

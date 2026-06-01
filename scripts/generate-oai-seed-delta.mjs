#!/usr/bin/env node
// Generate a DELTA OAI-seed SQL — top-N ranked from trackers.json, minus the
// names already in oai_registry. Use when expanding the seed (e.g., the
// original migration was partial, or trackers.json gained new entries).
//
// Usage:
//   SUPABASE_PAT=sbp_... node scripts/generate-oai-seed-delta.mjs > delta.sql
//   curl -X POST "https://api.supabase.com/v1/projects/<ref>/database/query" \
//     -H "Authorization: Bearer $SUPABASE_PAT" \
//     -H "Content-Type: application/json" \
//     --data "$(node -e "process.stdout.write(JSON.stringify({query: require('fs').readFileSync('delta.sql','utf8')}))")"
//
// Env vars:
//   TOP_N           — total seed target (default 200)
//   PROJECT_REF     — Supabase project ref (default ujosrvwcimdqofwjhnan, TunnelMind prod)
//   TRACKERS_PATH   — override trackers.json source path
//   SUPABASE_PAT    — PAT for Management API query
//
// First used 2026-05-31 to take the seed from 35 → 200. See
// project_tunnelmind_roadmap.md item #33 / project_p26_oai_standard.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TOP_N = parseInt(process.env.TOP_N || '200', 10);
const PROJECT_REF = process.env.PROJECT_REF || 'ujosrvwcimdqofwjhnan';
const SUPABASE_PAT = process.env.SUPABASE_PAT;
const TRACKERS_PATH = process.env.TRACKERS_PATH ||
  path.join(__dirname, '..', 'public', 'trackers.json');

const I_TO_CATEGORY = {
  ad_tech:        'tracker.pixel.advertising',
  marketing_tech: 'tracker.pixel.marketing',
  analytics:      'tracker.pixel.analytics',
  fingerprinting: 'tracker.fingerprinter',
  data_broker:    'data_broker',
  social:         'tracker.pixel.social',
};

if (!fs.existsSync(TRACKERS_PATH)) {
  console.error(`trackers.json not found at ${TRACKERS_PATH} — set TRACKERS_PATH=...`);
  process.exit(1);
}

const trackers = JSON.parse(fs.readFileSync(TRACKERS_PATH, 'utf8'));

// Aggregate by company (same ranking as generate-oai-seed.js)
const byCompany = new Map();
for (const [domain, entry] of Object.entries(trackers)) {
  if (!I_TO_CATEGORY[entry.i]) continue;
  const company = (entry.c || '').trim();
  if (!company) continue;
  let agg = byCompany.get(company);
  if (!agg) { agg = { name: company, domains: [], industries: {}, max_cpm: 0 }; byCompany.set(company, agg); }
  agg.domains.push(domain);
  agg.industries[entry.i] = (agg.industries[entry.i] || 0) + 1;
  if (typeof entry.cpm === 'number' && entry.cpm > agg.max_cpm) agg.max_cpm = entry.cpm;
}

const ranked = [...byCompany.values()]
  .map(c => ({ ...c, score: c.domains.length * c.max_cpm, dominant_i: Object.entries(c.industries).sort((a,b)=>b[1]-a[1])[0][0] }))
  .sort((a, b) => (b.score - a.score) || a.name.localeCompare(b.name))
  .slice(0, TOP_N);

// Fetch already-seeded names from Supabase (or accept via stdin for offline use)
let existing = new Set();
if (SUPABASE_PAT) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SUPABASE_PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: "SELECT record->>'name' AS name FROM oai_registry WHERE status='reserved'" }),
  });
  if (!r.ok) {
    console.error(`Supabase query failed: ${r.status} ${await r.text()}`);
    process.exit(1);
  }
  const rows = await r.json();
  existing = new Set(rows.map(row => row.name));
  console.error(`Fetched ${existing.size} existing reserved names from Supabase`);
} else {
  console.error(`No SUPABASE_PAT — emitting all top-${TOP_N} without dedup. Pipe `);
  console.error(`through psql or apply with the migration's idempotency guard.`);
}

const missing = ranked.filter(c => !existing.has(c.name));
console.error(`Top-${TOP_N}: ${ranked.length}; already seeded: ${existing.size}; new to insert: ${missing.length}`);

const usedSlugs = new Set();
function makeSlug(name) {
  let s = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  if (!s || !/^[a-z0-9]/.test(s)) return null;
  let candidate = s; let n = 2;
  while (usedSlugs.has(candidate)) candidate = `${s}-${n++}`;
  usedSlugs.add(candidate);
  return candidate;
}

const sqlEscape = s => "'" + String(s).replace(/'/g, "''") + "'";

const lines = [];
lines.push(`-- Delta OAI seed — generated ${new Date().toISOString()}`);
lines.push(`-- Top-${TOP_N} ranked entities from trackers.json, minus ${existing.size} already in oai_registry.`);
lines.push(`-- Status: 'reserved'. Auto-promotes to 'active' on first attested sensor observation.`);
lines.push(``);
lines.push(`DO $$`);
lines.push(`DECLARE v_new_id text;`);
lines.push(`BEGIN`);

let emitted = 0;
for (const c of missing) {
  const slug = makeSlug(c.name);
  if (!slug) { console.error(`Skipping unsluggable: ${JSON.stringify(c.name)}`); continue; }
  const category = I_TO_CATEGORY[c.dominant_i];
  const domainsArr = c.domains.slice().sort().map(d => sqlEscape(d)).join(', ');
  const aliasLit = sqlEscape(`oai:${slug}`);
  const nameLit = sqlEscape(c.name);
  const categoryLit = sqlEscape(category);
  lines.push(`  v_new_id := issue_oai(${categoryLit});`);
  lines.push(`  INSERT INTO oai_registry (oai_id, aliases, record, status) VALUES (`);
  lines.push(`    v_new_id,`);
  lines.push(`    ARRAY[${aliasLit}]::text[],`);
  lines.push(`    jsonb_build_object(`);
  lines.push(`      '@context','https://tunnelmind.ai/oai/context.jsonld',`);
  lines.push(`      '@type','ObservedActor',`);
  lines.push(`      'id', v_new_id,`);
  lines.push(`      'aliases', to_jsonb(ARRAY[${aliasLit}]::text[]),`);
  lines.push(`      'name', ${nameLit},`);
  lines.push(`      'category', ${categoryLit},`);
  lines.push(`      'domains', to_jsonb(ARRAY[${domainsArr}]::text[]),`);
  lines.push(`      'status','reserved',`);
  lines.push(`      'schema_version','1.0',`);
  lines.push(`      'issued_at', to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')`);
  lines.push(`    ),`);
  lines.push(`    'reserved'`);
  lines.push(`  );`);
  emitted++;
}
lines.push(`  RAISE NOTICE 'OAI delta seed: % entries issued.', ${emitted};`);
lines.push(`END $$;`);

process.stdout.write(lines.join('\n') + '\n');
console.error(`Wrote ${emitted} inserts to stdout`);

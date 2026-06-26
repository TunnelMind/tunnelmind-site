// ── Generate public/agent-manifest.json from canonical + manifest data ───────
// Writes the published manifest from scripts/data/agent-manifest.data.mjs (whose
// drift-prone scalars come from canonical.mjs). Before overwriting, it semantically
// diffs the new output against the existing committed file (ignoring generated_at)
// and prints the result — so a regeneration that changes DATA (not just formatting)
// is visible instead of silent. Run as part of `npm run build`.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildManifest } from './data/agent-manifest.data.mjs';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'agent-manifest.json');

// minimal recursive diff → list of differing paths (ignores key order)
function diff(a, b, path = '', out = []) {
  if (a === b) return out;
  const ta = Array.isArray(a) ? 'array' : a === null ? 'null' : typeof a;
  const tb = Array.isArray(b) ? 'array' : b === null ? 'null' : typeof b;
  if (ta !== tb) { out.push(`${path || '(root)'}: ${ta} → ${tb}`); return out; }
  if (ta === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (!(k in a)) out.push(`${path}.${k}: added`);
      else if (!(k in b)) out.push(`${path}.${k}: removed`);
      else diff(a[k], b[k], `${path}.${k}`, out);
    }
  } else if (ta === 'array') {
    if (a.length !== b.length) out.push(`${path}: array length ${b.length} → ${a.length}`);
    for (let i = 0; i < Math.max(a.length, b.length); i++) diff(a[i], b[i], `${path}[${i}]`, out);
  } else if (a !== b) {
    out.push(`${path}: ${JSON.stringify(b)} → ${JSON.stringify(a)}`);
  }
  return out;
}

const next = buildManifest();

let prev = null;
try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* first run */ }

if (prev) {
  const a = { ...next, generated_at: undefined };
  const b = { ...prev, generated_at: undefined };
  const changes = diff(a, b);
  if (changes.length === 0) {
    console.log(`✓ agent-manifest.json: data unchanged (only generated_at: ${prev.generated_at} → ${next.generated_at})`);
  } else {
    console.log(`⚠ agent-manifest.json: ${changes.length} DATA change(s) vs committed file:`);
    for (const c of changes) console.log(`    ${c}`);
  }
}

writeFileSync(OUT, JSON.stringify(next, null, 2) + '\n');
console.log(`→ wrote public/agent-manifest.json (generated_at ${next.generated_at})`);

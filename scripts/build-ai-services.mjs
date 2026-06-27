// ── Generate public/.well-known/ai-services.json from canonical + data ───────
// Renders scripts/data/ai-services.data.mjs (scalars sourced from canonical.mjs).
// Before overwriting, semantically diffs new-vs-committed (ignoring `updated`)
// and prints DATA changes so a regeneration that moves a fact is visible, not
// silent. Run as part of `npm run build`.
//
// Serialization preserves the surface's hand-tuned layout: a blank line before
// each top-level key whose value is an object/array (the scalar header fields
// $schema/version/updated stay grouped). This keeps published bytes stable.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildAiServices } from './data/ai-services.data.mjs';

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..', 'public', '.well-known', 'ai-services.json'
);

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

// Serialize with a blank line before each top-level object/array section.
function serialize(obj) {
  const lines = JSON.stringify(obj, null, 2).split('\n');
  const out = [];
  for (const line of lines) {
    // top-level key opening an object/array has exactly 2 leading spaces
    if (out.length > 1 && /^ {2}"[^"]+":\s*[[{]/.test(line)) out.push('');
    out.push(line);
  }
  return out.join('\n') + '\n';
}

const next = buildAiServices();

let prev = null;
try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* first run */ }

if (prev) {
  const a = { ...next, updated: undefined };
  const b = { ...prev, updated: undefined };
  const changes = diff(a, b);
  if (changes.length === 0) {
    console.log(`✓ ai-services.json: data unchanged (updated: ${prev.updated} → ${next.updated})`);
  } else {
    console.log(`⚠ ai-services.json: ${changes.length} DATA change(s) vs committed file:`);
    for (const c of changes) console.log(`    ${c}`);
  }
}

writeFileSync(OUT, serialize(next));
console.log(`→ wrote public/.well-known/ai-services.json (updated ${next.updated})`);

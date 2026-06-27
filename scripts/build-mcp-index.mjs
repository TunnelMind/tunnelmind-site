// ── Generate public/.well-known/mcp.json from canonical + data ───────────────
// Renders scripts/data/mcp-index.data.mjs (scalars sourced from canonical.mjs).
// Before overwriting, semantically diffs new-vs-committed (ignoring updated_at)
// and prints DATA changes so a moved fact is visible, not silent. Run as part
// of `npm run build`. This surface has no hand-tuned blank-line layout, so plain
// 2-space JSON serialization reproduces it exactly.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildMcpIndex } from './data/mcp-index.data.mjs';

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..', 'public', '.well-known', 'mcp.json'
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

const next = buildMcpIndex();

let prev = null;
try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* first run */ }

if (prev) {
  const a = { ...next, updated_at: undefined };
  const b = { ...prev, updated_at: undefined };
  const changes = diff(a, b);
  if (changes.length === 0) {
    console.log(`✓ mcp.json: data unchanged (updated_at: ${prev.updated_at} → ${next.updated_at})`);
  } else {
    console.log(`⚠ mcp.json: ${changes.length} DATA change(s) vs committed file:`);
    for (const c of changes) console.log(`    ${c}`);
  }
}

writeFileSync(OUT, JSON.stringify(next, null, 2) + '\n');
console.log(`→ wrote public/.well-known/mcp.json (updated_at ${next.updated_at})`);

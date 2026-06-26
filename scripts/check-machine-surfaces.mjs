// ── Machine-surface drift guard ──────────────────────────────────────────────
// Asserts that every published machine surface agrees with scripts/data/canonical.mjs.
// Runs in the build (npm run build) and in tests (npm test). Exits non-zero — failing
// the build — the moment a surface drifts from canonical. This is what makes the
// de-dup contract real: a stale tool count can no longer ship.
//
// Surfaces checked:
//   public/agent-manifest.json
//   public/.well-known/ai-services.json
//   public/.well-known/mcp.json
//   public/llms.txt
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CANONICAL, TOTAL_MCP_TOOLS } from './data/canonical.mjs';

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const errors = [];
const fail = (surface, msg) => errors.push(`  [${surface}] ${msg}`);

function readJSON(rel) {
  try {
    return JSON.parse(readFileSync(resolve(PUBLIC, rel), 'utf8'));
  } catch (e) {
    fail(rel, `could not read/parse: ${e.message}`);
    return null;
  }
}
function readText(rel) {
  try {
    return readFileSync(resolve(PUBLIC, rel), 'utf8');
  } catch (e) {
    fail(rel, `could not read: ${e.message}`);
    return '';
  }
}

const byRegistry = (arr, name, key) =>
  (arr || []).find((s) => s.registry_name === name)?.[key];

// ── agent-manifest.json ──────────────────────────────────────────────────────
const am = readJSON('agent-manifest.json');
if (am) {
  for (const s of CANONICAL.mcpServers) {
    const got = byRegistry(am.mcp_servers, s.registry_name, 'tool_count');
    if (got !== s.toolCount)
      fail('agent-manifest.json', `${s.registry_name} tool_count=${got}, canonical=${s.toolCount}`);
  }
  const atap = (am.standards_published || []).find((x) => x.id === 'atap');
  if (atap?.public_comment_close !== CANONICAL.standards.atap.publicCommentClose)
    fail('agent-manifest.json', `atap public_comment_close=${atap?.public_comment_close}, canonical=${CANONICAL.standards.atap.publicCommentClose}`);
  if (am.auth?.free_tier?.rate_limit_per_day !== CANONICAL.freeTier.rateLimitPerDay)
    fail('agent-manifest.json', `free rate_limit_per_day=${am.auth?.free_tier?.rate_limit_per_day}, canonical=${CANONICAL.freeTier.rateLimitPerDay}`);
  if (am.operator?.oai !== CANONICAL.operator.oai)
    fail('agent-manifest.json', `operator.oai=${am.operator?.oai}, canonical=${CANONICAL.operator.oai}`);
  for (const lens of CANONICAL.lenses)
    if (!(am.products || []).some((p) => p.lens === lens.slug))
      fail('agent-manifest.json', `missing product lens "${lens.slug}" (${lens.name})`);
}

// ── .well-known/ai-services.json ─────────────────────────────────────────────
const ai = readJSON('.well-known/ai-services.json');
if (ai) {
  for (const s of CANONICAL.mcpServers) {
    const got = byRegistry(ai.mcp_servers, s.registry_name, 'tool_count');
    if (got !== s.toolCount)
      fail('ai-services.json', `${s.registry_name} tool_count=${got}, canonical=${s.toolCount}`);
  }
  if (ai.auth?.free_tier?.rate_limit_per_day !== CANONICAL.freeTier.rateLimitPerDay)
    fail('ai-services.json', `free rate_limit_per_day=${ai.auth?.free_tier?.rate_limit_per_day}, canonical=${CANONICAL.freeTier.rateLimitPerDay}`);
  if (ai.service?.operator?.oai !== CANONICAL.operator.oai)
    fail('ai-services.json', `operator oai=${ai.service?.operator?.oai}, canonical=${CANONICAL.operator.oai}`);
  const atap = (ai.standards || []).find((x) => x.name === 'ATAP');
  if (!String(atap?.status || '').includes(CANONICAL.standards.atap.publicCommentClose))
    fail('ai-services.json', `atap status="${atap?.status}" missing close date ${CANONICAL.standards.atap.publicCommentClose}`);
  for (const lens of CANONICAL.lenses)
    if (!(ai.products || []).some((p) => p.lens === lens.slug))
      fail('ai-services.json', `missing product lens "${lens.slug}" (${lens.name})`);
}

// ── .well-known/mcp.json (note: field is tools_count) ────────────────────────
const mj = readJSON('.well-known/mcp.json');
if (mj) {
  for (const s of CANONICAL.mcpServers) {
    const got = byRegistry(mj.servers, s.registry_name, 'tools_count');
    if (got !== s.toolCount)
      fail('mcp.json', `${s.registry_name} tools_count=${got}, canonical=${s.toolCount}`);
  }
  if (mj.operator_oai !== CANONICAL.operator.oai)
    fail('mcp.json', `operator_oai=${mj.operator_oai}, canonical=${CANONICAL.operator.oai}`);
}

// ── llms.txt (prose — assert the scalar facts appear) ────────────────────────
const llms = readText('llms.txt');
if (llms) {
  for (const s of CANONICAL.mcpServers) {
    if (!llms.includes(s.registry_name))
      fail('llms.txt', `missing registry name ${s.registry_name}`);
  }
  // tool counts: "67 tools" once, "12 tools" for scry + sigil (>=2)
  const dataTools = CANONICAL.mcpServers.find((s) => s.id === 'data').toolCount;
  if (!new RegExp(`\\b${dataTools} tools\\b`).test(llms))
    fail('llms.txt', `missing "${dataTools} tools" (data-api)`);
  const twelves = (llms.match(/\b12 tools\b/g) || []).length;
  if (twelves < 2)
    fail('llms.txt', `expected "12 tools" >=2 (scry + sigil), found ${twelves}`);
  if (!llms.includes(CANONICAL.standards.atap.publicCommentClose))
    fail('llms.txt', `missing ATAP public-comment close date ${CANONICAL.standards.atap.publicCommentClose}`);
  if (!new RegExp(`\\b${CANONICAL.freeTier.rateLimitPerDay} req/day\\b`).test(llms))
    fail('llms.txt', `missing "${CANONICAL.freeTier.rateLimitPerDay} req/day" free tier`);
}

// ── report ───────────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`\n✗ machine-surface drift: ${errors.length} mismatch(es) vs scripts/data/canonical.mjs\n`);
  console.error(errors.join('\n'));
  console.error('\nFix the surface(s) above to match canonical.mjs, or update canonical.mjs if the fact itself changed.\n');
  process.exit(1);
}
console.log(`✓ machine surfaces agree with canonical (3 MCP servers, ${TOTAL_MCP_TOOLS} tools total, 5 lenses, ATAP close ${CANONICAL.standards.atap.publicCommentClose})`);

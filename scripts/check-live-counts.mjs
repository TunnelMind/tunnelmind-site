// scripts/check-live-counts.mjs
//
// Live drift guard: canonical.mjs pins each MCP server's toolCount, and every
// machine surface is generated/asserted from it — but the count drifts on the
// API side (a new endpoint = a new generated tool) with no site commit to
// trigger the build-time check. This script asks each server's tools/list
// directly and fails when canonical.mjs has fallen behind reality.
//
// Found the hard way 2026-07-12: surfaces said 67 tools for a month while the
// server served 78. Same pattern as data-api's mcp/generate.test.js drift guard.
//
// Run: node scripts/check-live-counts.mjs   (network required — NOT part of
// `npm test`, so offline dev stays green; CI runs it daily + on dispatch.)

import { CANONICAL } from './data/canonical.mjs';

const UA = 'tunnelmind-site-live-counts/1 (+https://tunnelmind.ai)';

async function liveToolCount(url) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'User-Agent': UA,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  const raw = await res.text();
  // Streamable HTTP answers either as SSE or plain JSON — branch on the
  // declared content type, NEVER by grepping the body for "data: " (tool
  // descriptions legitimately contain that string; found the hard way).
  const isSse = (res.headers.get('content-type') || '').includes('text/event-stream');
  const body = JSON.parse(isSse ? raw.match(/^data: (.+)$/m)[1] : raw);
  const n = body?.result?.tools?.length;
  if (!Number.isInteger(n)) throw new Error('tools/list returned no tools array');
  return n;
}

let drift = 0;
for (const s of CANONICAL.mcpServers) {
  try {
    const live = await liveToolCount(s.url);
    if (live !== s.toolCount) {
      drift++;
      console.error(`✗ ${s.registry_name}: canonical says ${s.toolCount}, server serves ${live} — update scripts/data/canonical.mjs, run npm run build, commit the regenerated surfaces`);
    } else {
      console.log(`✓ ${s.registry_name}: ${live} tools (matches canonical)`);
    }
  } catch (e) {
    // An unreachable server is an OUTAGE, not drift — the estate sweep owns
    // that page. Report it, don't fail this check on it.
    console.log(`- ${s.registry_name}: unreachable (${e.message}) — outage is the estate sweep's job, skipping`);
  }
}

if (drift) {
  const topic = process.env.NTFY_TOPIC || 'tmd-ops-917af2e8768e';
  await fetch(`https://ntfy.sh/${topic}`, {
    method: 'POST',
    headers: {
      Title: `TunnelMind site: ${drift} MCP tool count(s) drifted`,
      Priority: 'default', Tags: 'triangular_ruler,tunnelmind', 'User-Agent': UA,
    },
    body: 'canonical.mjs is behind the live servers. Fix: edit toolCount in scripts/data/canonical.mjs, npm run build (regenerates ai-services/mcp/agent-manifest), commit. See site workflow live-counts.',
  }).catch((e) => console.error('ntfy post failed:', e?.message));
  process.exit(1);
}
console.log('live counts agree with canonical');

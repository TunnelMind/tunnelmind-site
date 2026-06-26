// ── TunnelMind canonical facts — the single source of truth ──────────────────
// Every machine surface (llms.txt, agent-manifest.json, .well-known/ai-services.json,
// .well-known/mcp.json) restates these facts. They MUST NOT be hand-maintained in two
// places that can disagree. Edit a fact HERE, then update the surfaces; the build runs
// scripts/check-machine-surfaces.mjs and FAILS if any surface drifts from this file.
//
// This is the de-dup contract from P-SITE-SYNC GATE 3, enforced as an assertion rather
// than full regeneration — so the hand-tuned prose in each surface is preserved while
// the drift-prone scalar facts (tool counts, standards status, rate limits) can never
// disagree across surfaces again.

export const CANONICAL = {
  operator: {
    oai: 'OAI-2026-0000201',
    single_operator: true,
    investor_capital_received: false,
  },

  // The three MCP servers in the official registry. tool_count is the field that
  // drifts hardest — it changes every time the Data API adds an operation.
  mcpServers: [
    { id: 'data',  registry_name: 'ai.tunnelmind/data',  url: 'https://mcp-data.tunnelmind.ai/mcp',       toolCount: 67, auth: 'oauth2' },
    { id: 'scry',  registry_name: 'ai.tunnelmind/scry',  url: 'https://mcp.tunnelmind.ai/mcp',            toolCount: 12, auth: 'none'   },
    { id: 'sigil', registry_name: 'ai.tunnelmind/sigil', url: 'https://mcp.sigil.tunnelmind.ai/mcp',      toolCount: 12, auth: 'oauth2' },
  ],

  // The four lenses + the cross-lens join. `slug` is the machine lens id used in the
  // discovery surfaces (products[].lens).
  lenses: [
    { name: 'Scry',              slug: 'who_is_attacking',     rest_base: 'https://api.tunnelmind.ai'  },
    { name: 'Sigil',             slug: 'who_can_be_trusted',   rest_base: 'https://data.tunnelmind.ai' },
    { name: 'Tracker',           slug: 'who_is_paying_whom',   rest_base: 'https://data.tunnelmind.ai' },
    { name: 'GhostRoute',        slug: 'where_it_actually_goes', rest_base: 'https://data.tunnelmind.ai' },
    { name: 'Cross-lens verify', slug: 'is_this_real',         rest_base: 'https://data.tunnelmind.ai' },
  ],

  standards: {
    oai:  { version: '1.0' },
    atap: { version: '0.1', publicCommentClose: '2026-08-12' },
  },

  freeTier: { rateLimitPerDay: 50 },

  x402: { version: 1 },
};

// Total surfaced MCP tools — the headline "91" (67 + 12 + 12). Derived, never stored.
export const TOTAL_MCP_TOOLS = CANONICAL.mcpServers.reduce((n, s) => n + s.toolCount, 0);

export function mcpServer(id) {
  const s = CANONICAL.mcpServers.find((m) => m.id === id);
  if (!s) throw new Error(`canonical: unknown mcp server id "${id}"`);
  return s;
}

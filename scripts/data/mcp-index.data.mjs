// ── Data for public/.well-known/mcp.json ─────────────────────────────────────
// Apex MCP discovery index. Prose lives here; the drift-prone scalars
// (tools_count per server, operator OAI) come from canonical.mjs so they cannot
// disagree with the other surfaces. scripts/build-mcp-index.mjs renders to JSON.
//
// `updated_at` is a frozen content date (not a build timestamp) — bump by hand
// when the prose changes, so published bytes only move when content does.
import { CANONICAL, mcpServer } from './canonical.mjs';

const UPDATED_AT = '2026-06-13T00:00:00Z';

export function buildMcpIndex() {
  return {
    schema_version: 'mcp-server-index/1.0-draft',
    service: 'TunnelMind',
    description:
      "Apex discovery index for TunnelMind's Model Context Protocol surface. Four lenses on one signed corpus — Scry (attacker observation), Sigil (advertising supply verification), Tracker (surveillance-economy graph), and GhostRoute (routing integrity / sovereignty), unified in the Data API (the union surface, including the cross-lens fused verdict). Each entry's card_url is the per-server RFC 8615 discovery doc; mcp_url is the streamable-http endpoint to connect to.",
    homepage: 'https://tunnelmind.ai',
    contact: 'api@tunnelmind.ai',
    updated_at: UPDATED_AT,
    operator_oai: CANONICAL.operator.oai,
    servers: [
      {
        name: 'TunnelMind Data API',
        registry_name: mcpServer('data').registry_name,
        mcp_url: mcpServer('data').url,
        card_url: 'https://mcp-data.tunnelmind.ai/.well-known/mcp.json',
        transport: 'streamable-http',
        tools_count: mcpServer('data').toolCount,
        auth: mcpServer('data').auth,
        default_prompt_surface: 'data',
        summary:
          "The union surface: every Data API operation as an MCP tool (auto-generated from openapi.yaml). Tracker / Sigil / GhostRoute / Cross-lens — including cross_lens_verify (fused Scry x Sigil x GhostRoute) and the /v1/profile fused Scry x Sigil x Tracker x GhostRoute entity profile. Start here if you don't know which lens you need.",
      },
      {
        name: 'Scry',
        registry_name: mcpServer('scry').registry_name,
        mcp_url: mcpServer('scry').url,
        card_url: 'https://mcp.tunnelmind.ai/.well-known/mcp.json',
        transport: 'streamable-http',
        tools_count: mcpServer('scry').toolCount,
        auth: mcpServer('scry').auth,
        default_prompt_surface: 'scry',
        summary:
          'Free, no-auth IPv4 lookups against the distributed attacker-observation corpus: per-IP risk, ASN/country rollups, campaign membership, top-actors, and tool/operator attribution.',
      },
      {
        name: 'TunnelMind Sigil',
        registry_name: mcpServer('sigil').registry_name,
        mcp_url: mcpServer('sigil').url,
        card_url: 'https://mcp.sigil.tunnelmind.ai/.well-known/mcp.json',
        transport: 'streamable-http',
        tools_count: mcpServer('sigil').toolCount,
        auth: mcpServer('sigil').auth,
        default_prompt_surface: 'sigil',
        summary:
          'Agentic supply verification for programmatic advertising: ads.txt authorization, IP classification, app-bundle and supply-path verification, entity trust scoring, ATAP receipts, and cross_lens_verify with identical semantics to the data-api surface.',
      },
    ],
    byom_analyst_config: {
      rest: 'https://data.tunnelmind.ai/v1/config/analyst',
      mcp_prompt: 'tunnelmind_analyst',
      available_on_mcp: [
        'https://mcp-data.tunnelmind.ai/mcp',
        'https://mcp.tunnelmind.ai/mcp',
        'https://mcp.sigil.tunnelmind.ai/mcp',
      ],
      note: 'Bring your own model. Each MCP exposes the analyst config as prompt tunnelmind_analyst via prompts/list + prompts/get, defaulting to its own surface (data / scry / sigil). Pass arguments.surface to retarget. Signed bundle_signature always present.',
    },
    openapi_url: 'https://data.tunnelmind.ai/openapi.yaml',
    companion_specs: {
      oai_standard: 'https://tunnelmind.ai/oai/standard',
      atap: 'https://tunnelmind.ai/.well-known/atap.json',
      receipt_format: 'https://tunnelmind.ai/standards/receipt-format/v1',
      eat_profile: 'https://tunnelmind.ai/eat/profile/v0.1',
    },
    agent_onboarding: 'https://tunnelmind.ai/agent-onboarding.md',
    ai_services: 'https://tunnelmind.ai/.well-known/ai-services.json',
    discovery_note:
      "This is the RFC 8615 well-known index for TunnelMind's MCP ecosystem at the apex domain. Each server in `servers` also serves its own mcp-server-card/1.0-draft at its card_url with full auth scopes and tools_count. An agent landing cold should read agent_onboarding for the golden-path call sequence, then connect to the server whose surface matches its task (or the Data API union surface when unsure).",
  };
}

// ── Data for public/.well-known/ai-services.json ─────────────────────────────
// Hand-tuned prose lives here; the drift-prone scalar facts (tool counts, OAI,
// ATAP close date, free-tier rate limit, x402 version, single-operator flags,
// lens slugs) are sourced from canonical.mjs so they cannot disagree with the
// other surfaces. scripts/build-ai-services.mjs renders this to JSON.
//
// `updated` is a frozen content date (not a build timestamp) — bump it by hand
// when the surface's prose meaningfully changes, so the published bytes only
// move when the content does.
import { CANONICAL, mcpServer } from './canonical.mjs';

const UPDATED = '2026-06-13';
const lensSlug = (name) => CANONICAL.lenses.find((l) => l.name === name).slug;

export function buildAiServices() {
  return {
    $schema: 'https://tunnelmind.ai/.well-known/ai-services.schema.json',
    version: '0.1',
    updated: UPDATED,

    service: {
      name: 'TunnelMind',
      summary:
        'The trust attestation layer for the agentic internet. Four lenses (Scry / Sigil / Tracker / GhostRoute) on one signed corpus, with a fused cross-lens verdict no siloed incumbent can compute.',
      homepage: 'https://tunnelmind.ai',
      vision: 'https://tunnelmind.ai/vision',
      operator: {
        legal_name: 'TunnelMind AI, LLC',
        oai: CANONICAL.operator.oai,
        oai_resolver: `https://tunnelmind.ai/id/${CANONICAL.operator.oai}`,
        contact_email: 'agents@tunnelmind.ai',
        contact_pgp: null,
      },
    },

    products: [
      {
        name: 'Scry',
        lens: lensSlug('Scry'),
        summary:
          'Signed observations of hostile network actors. IPs, ASNs, behaviors, threat-feed overlap, actor classification.',
        rest_base: 'https://api.tunnelmind.ai',
        rest_quickstart: 'https://api.tunnelmind.ai/v1/check/8.8.8.8',
      },
      {
        name: 'Sigil',
        lens: lensSlug('Sigil'),
        summary:
          'Programmatic-advertising supply graph: publishers, SSPs, DSPs, seats, OpenRTB SupplyChain, entity trust scores.',
        rest_base: 'https://data.tunnelmind.ai',
        rest_quickstart: 'https://data.tunnelmind.ai/v1/sigil/resolve/domain/nytimes.com',
      },
      {
        name: 'Tracker',
        lens: lensSlug('Tracker'),
        summary:
          'Surveillance-economy graph: trackers, ad networks, data brokers and the relationships between them.',
        rest_base: 'https://data.tunnelmind.ai',
        rest_quickstart: 'https://data.tunnelmind.ai/v1/tracker/resolve/google-analytics.com',
      },
      {
        name: 'GhostRoute',
        lens: lensSlug('GhostRoute'),
        summary:
          'Routing integrity and sovereignty: origin AS, RPKI route validity, the sovereign jurisdiction a service claims versus the one it egresses through, and first-party certificate-transparency witnessing against signature-verified roots.',
        rest_base: 'https://data.tunnelmind.ai',
        rest_quickstart: 'https://data.tunnelmind.ai/v1/ghostroute/check/api.anthropic.com',
      },
      {
        name: 'Cross-lens verify',
        lens: lensSlug('Cross-lens verify'),
        summary:
          'The A2 join. One node key (IP, domain, ASN, entity_slug) returns fused verdict + per-lens blocks (incl. ghostroute) + a signed 5-minute sigil_token. Optional ATAP witness event chained onto the calling agent\'s identity token.',
        rest_base: 'https://data.tunnelmind.ai',
        rest_quickstart: 'POST https://data.tunnelmind.ai/v1/verify/8.8.8.8',
      },
    ],

    mcp_servers: [
      {
        name: 'TunnelMind Data API',
        registry_name: mcpServer('data').registry_name,
        url: mcpServer('data').url,
        card_url: 'https://mcp-data.tunnelmind.ai/.well-known/mcp.json',
        transport: 'streamable-http',
        tool_count: mcpServer('data').toolCount,
        summary:
          'All Data API operations exposed as MCP tools (auto-generated from openapi.yaml). Tracker / Sigil / GhostRoute / Cross-lens — the union of every REST endpoint, including cross_lens_verify (with adversary_class).',
      },
      {
        name: 'Scry',
        registry_name: mcpServer('scry').registry_name,
        url: mcpServer('scry').url,
        card_url: 'https://mcp.tunnelmind.ai/.well-known/mcp.json',
        transport: 'streamable-http',
        tool_count: mcpServer('scry').toolCount,
        summary:
          'Scry-only MCP surface: free IPv4 lookups against the attacker-observation corpus. Auth: none.',
      },
      {
        name: 'Sigil',
        registry_name: mcpServer('sigil').registry_name,
        url: mcpServer('sigil').url,
        card_url: 'https://mcp.sigil.tunnelmind.ai/.well-known/mcp.json',
        transport: 'streamable-http',
        tool_count: mcpServer('sigil').toolCount,
        summary:
          'Sigil-scoped MCP surface: supply verification (incl. sigil_traverse_supply_chain) + cross_lens_verify with identical semantics to the data-api surface. Agents get the right answer no matter which entry point they landed at.',
      },
    ],

    openapi: {
      url: 'https://data.tunnelmind.ai/openapi.yaml',
      version: '3.1.0',
    },

    standards: [
      {
        name: 'OAI',
        full_name: 'Observed Actor Identifier',
        version: CANONICAL.standards.oai.version,
        spec_url: 'https://tunnelmind.ai/oai/standard',
        summary:
          'Permanent, free-to-resolve identifiers for every observed actor on the network.',
      },
      {
        name: 'ATAP',
        full_name: 'Agent Trust Attestation Protocol',
        version: CANONICAL.standards.atap.version,
        status: `public_comment_through_${CANONICAL.standards.atap.publicCommentClose}`,
        spec_url: 'https://tunnelmind.ai/atap/standard',
        context_url: 'https://tunnelmind.ai/atap/context.jsonld',
        reference_verifier: 'https://tunnelmind.ai/atap/verify.sh',
        summary:
          'Capability tokens (AIT), witness-event hash chains, and signed compliance receipts let one agent verify what another agent actually did.',
      },
    ],

    auth: {
      model: 'open_free_tier_plus_paid',
      free_tier: {
        summary: 'All identifiers resolve for free, forever. The radar sample is public.',
        rate_limit_per_day: CANONICAL.freeTier.rateLimitPerDay,
      },
      paid_tier: {
        summary:
          'Depth and scale via API key. Stripe (humans) or x402 USDC micropayments (agents).',
        key_issuance: 'https://tunnelmind.ai/api',
      },
    },

    agent_payments: {
      x402: {
        enabled: true,
        version: CANONICAL.x402.version,
        demo_endpoint: 'https://data.tunnelmind.ai/v1/x402/echo',
        discovery: 'https://tunnelmind.ai/.well-known/x402.json',
        summary:
          'x402 USDC micropayments are the agent rail. See per-endpoint pricing in openapi.yaml x-tunnelmind-pricing extensions; client-validation smoke available via demo_endpoint with no real USDC required.',
      },
    },

    discovery: {
      agent_manifest: 'https://tunnelmind.ai/agent-manifest.json',
      agent_onboarding: 'https://tunnelmind.ai/agent-onboarding.md',
      analyst_config: 'https://data.tunnelmind.ai/v1/config/analyst',
      llms_txt: 'https://tunnelmind.ai/llms.txt',
      robots_txt: 'https://tunnelmind.ai/robots.txt',
      canary: 'https://tunnelmind.ai/canary.json',
      ai_services: 'https://tunnelmind.ai/.well-known/ai-services.json',
      mcp_index: 'https://tunnelmind.ai/.well-known/mcp.json',
      atap_discovery: 'https://tunnelmind.ai/.well-known/atap.json',
      receipt_signing_keys: 'https://tunnelmind.ai/.well-known/receipt-signing-key.json',
      receipt_revocations: 'https://tunnelmind.ai/.well-known/receipt-revocations.json',
      x402_discovery: 'https://tunnelmind.ai/.well-known/x402.json',
    },

    byom_analyst_config: {
      summary:
        'Bring-your-own-model config bundle. Configures any LLM (Claude, GPT, Gemini, local) as a TunnelMind analyst. Customer brings the model + tokens; TunnelMind earns on data API calls.',
      rest_endpoint: 'https://data.tunnelmind.ai/v1/config/analyst',
      mcp_prompt_name: 'tunnelmind_analyst',
      available_on_mcp: [
        'https://mcp-data.tunnelmind.ai/mcp',
        'https://mcp.tunnelmind.ai/mcp',
        'https://mcp.sigil.tunnelmind.ai/mcp',
      ],
      default_surface_by_mcp: {
        'https://mcp-data.tunnelmind.ai/mcp': 'data',
        'https://mcp.tunnelmind.ai/mcp': 'scry',
        'https://mcp.sigil.tunnelmind.ai/mcp': 'sigil',
      },
      surfaces: ['data', 'scry', 'sigil'],
      formats: ['anthropic', 'openai', 'generic'],
    },

    transparency: {
      code_repos: 'https://github.com/TunnelMind',
      warrant_canary: 'https://tunnelmind.ai/canary.json',
      single_operator: CANONICAL.operator.single_operator,
      investor_capital_received: CANONICAL.operator.investor_capital_received,
    },

    principles: [
      'signed_at_the_source',
      'the_corpus_is_public',
      'stable_identifiers_not_vibes',
      'no_profile_poisoning_ever',
      'local_first_where_it_touches_people',
    ],
  };
}

import React, { useState, useRef, useEffect } from 'react'

// P56 — live API playground: drives the real NDJSON stream through the
// same-origin /api/verify-stream proxy (CSP is connect-src 'self').
// Events render at real lens-completion timing; nothing is paced.
function LivePlayground() {
  const traceRef = useRef(null)
  const [node, setNode] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const el = traceRef.current
    if (!el) return
    const done = () => setRunning(false)
    el.addEventListener('verify:done', done)
    el.addEventListener('verify:error', done)
    return () => { el.removeEventListener('verify:done', done); el.removeEventListener('verify:error', done) }
  }, [])

  const run = (e) => {
    e.preventDefault()
    const v = node.trim().toLowerCase()
    if (!v || !traceRef.current) return
    setRunning(true)
    traceRef.current.setAttribute('node', v)
    traceRef.current.play()
  }

  return (
    <div style={{ margin: '0 0 28px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
        Live playground · POST /v1/verify with accept: application/x-ndjson
      </div>
      <form onSubmit={run} style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input
          value={node}
          onChange={(e) => setNode(e.target.value)}
          placeholder="8.8.8.8 or a domain"
          aria-label="Node to verify"
          style={{ fontFamily: 'var(--wpm-font-mono)', fontSize: '15px', padding: '6px 10px', border: '2px solid var(--wpm-ink)', background: 'var(--wpm-paper)', color: 'var(--wpm-ink)', flex: '1 1 220px' }}
        />
        <button type="submit" disabled={running} className="wpm-btn" style={{ fontSize: '15px' }}>
          {running ? 'tracing…' : 'trace it live'}
        </button>
      </form>
      <verify-trace ref={traceRef} mode="live" src="/api/verify-stream" style={{ maxWidth: '640px', display: 'block' }} />
      <p style={{ fontFamily: 'var(--wpm-font-mono)', fontSize: '12px', marginTop: '8px' }}>
        Each row lands when that lens actually resolves. The bar is the real timing, not an animation.
      </p>
    </div>
  )
}

// /api — the full TunnelMind surface catalog, for humans and agents.
//
// Two rails over one signed corpus:
//   • REST   — two services: the Scry attacker corpus (api.tunnelmind.ai) and
//              the Data API (data.tunnelmind.ai: Sigil supply graph, cross-lens
//              verify, tracker signals, provenance, agent payment rail).
//   • MCP    — three servers: Scry, Data, Sigil. Every Data API endpoint is also
//              an MCP tool (1:1, generated from OpenAPI); Scry and Sigil expose
//              curated subsets.
//
// Machine-legible mirrors of this page: data.tunnelmind.ai/openapi.yaml,
// tunnelmind.ai/.well-known/mcp.json, /agent-manifest.json, /llms.txt,
// /agent-onboarding.md. Endpoint blurbs here are sourced from those.

// ── Machine-legible discovery docs ───────────────────────────────────────────
const DISCOVERY = [
  { label: 'OpenAPI 3.1', url: 'https://data.tunnelmind.ai/openapi.yaml',
    desc: 'Every Data API endpoint, machine-readable. The source of truth this page mirrors.' },
  { label: 'MCP index', url: 'https://tunnelmind.ai/.well-known/mcp.json',
    desc: 'All three MCP servers, tool counts, and default prompt surfaces in one card.' },
  { label: 'agent-manifest.json', url: 'https://tunnelmind.ai/agent-manifest.json',
    desc: 'Capabilities, endpoints, auth, and payment rails enumerated for autonomous agents.' },
  { label: 'agent-onboarding.md', url: 'https://tunnelmind.ai/agent-onboarding.md',
    desc: 'The 5-call golden path for an agent landing cold: preflight → verify → receipt.' },
  { label: 'llms.txt', url: 'https://tunnelmind.ai/llms.txt',
    desc: 'Plain-text site + API map for language models.' },
]

// ── MCP servers ──────────────────────────────────────────────────────────────
const MCP_SERVERS = [
  {
    name: 'Scry MCP',
    host: 'mcp.tunnelmind.ai',
    registry: 'ai.tunnelmind/scry',
    count: 12,
    blurb: 'The attacker corpus as callable tools, who is hostile on the open internet, observed first-hand by the sensor fleet.',
    tools: [
      ['scry_check', 'Corpus knowledge for one IPv4, first/last seen, category, actor class, ASN, ports.'],
      ['scry_check_bulk', 'Look up to 100 IPs in one call; same per-IP shape as scry_check.'],
      ['scry_recent', 'Recent observations feed, aggregated by source IP within a window. Cursor-paginated.'],
      ['scry_top', 'Top-N source dimensions over a window, where is the activity right now.'],
      ['scry_timeseries', 'Bucketed observation counts over time, detect bursts and trends.'],
      ['scry_asn', 'Corpus roll-up for one ASN, observation count, distinct IPs, actor mix.'],
      ['scry_country', 'Corpus roll-up by ISO country code.'],
      ['scry_tools', 'Detected attack tools, (protocol, payload, path) tuples from 3+ distinct sources.'],
      ['scry_tool', 'Single attack-tool detail by id.'],
      ['scry_campaigns', 'Active threat campaigns, coordinated attacker activity above the noise floor.'],
      ['scry_campaign', 'Single campaign detail by id.'],
      ['scry_stats', 'Aggregate corpus telemetry, totals, distinct sources, protocol breakdown.'],
    ],
  },
  {
    name: 'Data MCP',
    host: 'mcp-data.tunnelmind.ai',
    registry: 'ai.tunnelmind/data',
    count: 78,
    blurb: 'The full Data API as tools. Every REST endpoint below is also an MCP tool, generated 1:1 from OpenAPI. Flagship decision tools highlighted; call tools/list for the complete set.',
    mirror: true,
    tools: [
      ['cross_lens_verify', 'A2, fused Scry × Sigil × GhostRoute verdict for a node, now carrying its adversary_class.'],
      ['preflight_should_i_act', 'The single call an agent makes before transacting, allow / caution / deny + signed receipt.'],
      ['profile_entity', 'Cross-lens fused profile (Scry × Sigil × Tracker × GhostRoute) + confidence + signed receipt.'],
      ['cross_lens_lookup', 'All four lens views for a node, no fusion, the raw join.'],
      ['sigil_traverse', 'Walk a publisher\'s supply graph, itemized, classified sell paths.'],
      ['signal_dark_pool_risk', 'Two-sided opacity of a publisher\'s declared supply chain.'],
      ['signal_tracker_density', 'Footprint of one tracker entity across the surveillance supply graph.'],
      ['signal_halo_score', 'Peer-reputation halo from an entity\'s supply-graph neighbours.'],
      ['signal_team_signal', 'Coordinated-operation detection via shared identifiers.'],
      ['get_analyst_config', 'BYOM bundle, configure any LLM as a TunnelMind analyst (bring your own tokens).'],
      ['x402_echo', 'Validate an agent\'s x402 payment-rail client implementation.'],
      ['scan_mcp', 'Safety-scan another MCP server before wiring it in, injection patterns + capability heuristics over its tools/list.'],
      ['scan_injection', 'Scan text for prompt-injection signals before it reaches your model.'],
    ],
  },
  {
    name: 'Sigil MCP',
    host: 'mcp.sigil.tunnelmind.ai',
    registry: 'ai.tunnelmind/sigil',
    count: 12,
    blurb: 'The ad supply-chain trust surface for media-buying agents, verify a path, score an entity, attest the buy.',
    tools: [
      ['cross_lens_verify', 'Fuse Scry + Sigil into one verdict on a node (with adversary_class).'],
      ['sigil_verify_supply_path', 'The core pre-bid check, compose ads.txt, IP, fraud, and bundle into one trust verdict + signed token.'],
      ['sigil_verify_supply_chain', 'Verify a full OpenRTB SupplyChain (schain) object, node by node.'],
      ['sigil_traverse_supply_chain', 'Reconstruct a publisher\'s sell paths from the graph, itemized and classified.'],
      ['sigil_verify_ads_txt', 'Is this exchange authorized to sell this publisher\'s inventory?'],
      ['sigil_verify_ip_type', 'Classify an IP as datacenter / residential / mobile, the CTV-fraud signal.'],
      ['sigil_verify_app_bundle', 'Does this app bundle ID actually exist in its store?'],
      ['sigil_score_entity', 'Pre-computed 0–1 trust score for one supply-chain entity.'],
      ['sigil_score_batch', 'Trust scores for up to 200 entities in one round-trip.'],
      ['sigil_atap_register_ait', 'Register an ATAP Agent Identity Token for a media-buying agent.'],
      ['sigil_atap_witness', 'Witness one agent-reported bid/budget event onto a hash-chained AIT.'],
      ['sigil_generate_receipt', 'Generate the ATAP compliance Receipt for an AIT, portable, signed.'],
    ],
  },
]

// ── REST: Scry attacker corpus (api.tunnelmind.ai) ───────────────────────────
const SCRY_GROUPS = [
  {
    name: 'Lookup',
    endpoints: [
      ['GET', '/v1/check/{ip}', 'Look up one IP, category, confidence, protocols/ports, ASN, country, observation count.'],
      ['POST', '/v1/check/bulk', 'Check up to 100 IPs in one round trip, a whole block list at once.'],
      ['GET', '/v1/recent', 'Most recently observed hostile source IPs, newest first. Cursor-paginated.'],
    ],
  },
  {
    name: 'Threat structure',
    endpoints: [
      ['GET', '/v1/campaigns', 'Coordinated clusters of actors sharing a payload signature across networks.'],
      ['GET', '/v1/tools', 'Distinct attacker tools, actor clusters sharing a payload pattern.'],
    ],
  },
  {
    name: 'Slices & totals',
    endpoints: [
      ['GET', '/v1/asn/{asn} · /v1/country/{cc} · /v1/top', 'Slice the corpus by network, geography, or overall volume.'],
      ['GET', '/v1/stats · /v1/stats/timeseries', 'Corpus totals and the same broken out over time.'],
    ],
  },
]

// ── REST: Data API (data.tunnelmind.ai) ──────────────────────────────────────
const DATA_GROUPS = [
  {
    name: 'Cross-lens & agent decisions',
    desc: 'The moat: one verdict over all the lenses, plus the calls an agent makes before it acts.',
    endpoints: [
      ['POST', '/v1/verify/{node}', 'Fused Scry × Sigil × GhostRoute verdict for an IP, domain, ASN, or entity, over a base ip_intel record (geo / ASN / WHOIS / routing) whose every field is provenance-tagged verified/derived/trusted, including a verified-tier measurement axis (observation breadth, distinct signed vantages, durations) from our own fleet that a commodity vendor cannot sign, naming the adversary_class behind it (human_hacker / rogue_agent / surveillance_bigtech / clean) and flagging routing/sovereignty mismatches.'],
      ['POST', '/v1/preflight', 'Agent-facing "should I act?" consultation, allow / caution / deny + a signed consultation receipt.'],
      ['POST', '/v1/profile', 'Cross-lens fused profile (Scry × Sigil × Tracker × GhostRoute) + confidence + signed receipt.'],
      ['GET', '/v1/entity/{node}', 'Fan-out lookup of a node across all four lenses, no fusion, the raw join.'],
      ['GET', '/v1/verify/agent/{ip}', 'Is a claimed crawler really who it says? Checks the UA claim against the operator\'s published IP ranges (Googlebot, Bingbot, GPTBot, PerplexityBot), verified / spoofed / unverifiable, never a guess.'],
    ],
  },
  {
    name: 'Agent safety scans',
    desc: 'Before an agent wires in a tool or ingests a page: is it safe? Signals, not verdicts, both public, no key.',
    endpoints: [
      ['POST', '/v1/scan/mcp', 'Point it at any MCP server: reads its tools/list and scans every tool description for prompt-injection patterns and over-broad capability combinations.'],
      ['POST', '/v1/scan/injection', 'Scan any text or fetched content for prompt-injection signals before it reaches your model.'],
    ],
  },
  {
    name: 'Sigil, ad supply-chain verification',
    desc: 'Is this programmatic ad supply genuine? ads.txt, sellers.json, schain, datacenter IP, app bundle.',
    endpoints: [
      ['POST', '/v1/sigil/verify/supply_path', 'The core pre-bid call, composes ads.txt, datacenter-IP, fraud, and bundle into one trust verdict + signed token.'],
      ['POST', '/v1/sigil/verify/supply_chain', 'Verify an OpenRTB SupplyChain (schain) object you bring, per-node and aggregate.'],
      ['GET', '/v1/sigil/traverse', 'Walk a publisher\'s supply graph from our own crawl, itemized, classified sell paths + downstream resellers.'],
      ['POST', '/v1/sigil/verify/ads_txt', 'Is an exchange authorized to sell a publisher\'s inventory, per ads.txt?'],
      ['POST', '/v1/sigil/verify/ads_txt/batch', 'Batch ads.txt verification, up to 100 in one call.'],
      ['GET', '/v1/sigil/verify/domain', 'Verify publisher domain ownership via a DNS TXT record.'],
      ['GET', '/v1/sigil/verify/ip_type', 'Classify an IP as datacenter / residential / mobile, the CTV-fraud signal.'],
      ['GET', '/v1/sigil/verify/adscert', 'Does a domain publish ads.cert DNS records?'],
      ['POST', '/v1/sigil/verify/app_bundle', 'Verify a mobile/CTV app bundle ID exists in its store.'],
      ['GET', '/v1/sigil/verify/token/{token}', 'Verify a sigil_token issued by a supply-path check.'],
      ['GET', '/v1/sigil/score/{entity_id}', 'Pre-computed 0–1 trust score for one supply-chain entity.'],
      ['POST', '/v1/sigil/score/batch', 'Trust scores for up to 200 entities in one call.'],
      ['GET', '/v1/sigil/score/weights', 'The published, versioned default trust-score weights.'],
      ['GET', '/v1/sigil/publisher/{domain}/ads_txt/history', 'A publisher\'s ads.txt change log, one entry per crawl with changes.'],
    ],
  },
  {
    name: 'Sigil. ATAP attestation',
    desc: 'Agentic Trust & Attestation Protocol: a hash-chained, signed record of what a buying agent did.',
    endpoints: [
      ['POST', '/v1/sigil/atap/ait', 'Register an ATAP Agent Identity Token.'],
      ['POST', '/v1/sigil/atap/witness', 'Witness an agent-reported bid or budget event onto the chain.'],
      ['POST', '/v1/sigil/atap/block', 'Roll pending events into a signed Attestation Block.'],
      ['GET', '/v1/sigil/atap/ait/{id}', 'AIT status and chain summary.'],
      ['POST', '/v1/sigil/receipt/generate', 'Generate an ATAP compliance Receipt ZIP for an AIT.'],
    ],
  },
  {
    name: 'GhostRoute: routing integrity & CT witness',
    desc: 'The fourth lens: is this infrastructure where it claims to be, owned by whom it claims, and provably certificate-logged? Includes TunnelMind\'s first-party Certificate-Transparency witness; we hold our own signature-verified roots.',
    endpoints: [
      ['GET', '/v1/ghostroute/check/{entity}', 'Routing-integrity & sovereignty verdict for an IP, domain, ASN, or cert. Add ?receipt=true to sign + persist a GR-receipt.'],
      ['GET', '/v1/ghostroute/witness', 'Certificate-Transparency witness health: latest signature-verified Signed Tree Head per trusted (non-Google) log, plus append-only regression detection (rewind / fork / bad STH signature).'],
      ['GET', '/v1/ghostroute/proofs', 'Per-cert CT inclusion-proof rollup, corpus-wide, or ?domain= for one host. Proves the exact cert a host serves is included in a log whose root we verified.'],
      ['GET', '/v1/ghostroute/alerts', 'Durable, deduplicated feed of CT append-only regression events. A healthy ecosystem returns empty; any row is a serious trust event.'],
      ['GET', '/v1/ghostroute/asn/{asn}', 'ASN ownership and sovereign zone, registrant + jurisdiction from RIR RDAP.'],
      ['GET', '/v1/ghostroute/cert/{domain}', 'Recent CT certificate observations for a domain, issuing CA and chain provenance.'],
      ['GET', '/v1/ghostroute/ai/{entity}', 'Curated AI-infrastructure match for a domain or ASN.'],
      ['POST', '/v1/ghostroute/batch', 'Batch routing-integrity check, up to 50 subjects in one call.'],
      ['GET', '/v1/ghostroute/verify/{receipt_id}', 'Fetch a persisted GR-receipt (GR-YYYY-NNNNNNN).'],
    ],
  },
  {
    name: 'Adversary & tracker signals',
    desc: 'Read-only signals over the surveillance supply graph, the building blocks of adversary classification.',
    endpoints: [
      ['GET', '/v1/signals/dark-pool-risk/{domain}', 'Two-sided opacity of a publisher\'s declared supply chain (ads.txt × sellers.json).'],
      ['GET', '/v1/signals/tracker-density/{entity_slug}', 'How much of the surveillance supply graph one entity occupies.'],
      ['GET', '/v1/signals/halo-score/{entity_slug}', 'Reputation an entity inherits from its supply-graph neighbours.'],
      ['GET', '/v1/signals/team-signal/{entity_slug}', 'Coordinated-operation detection via shared seller identifiers.'],
    ],
  },
  {
    name: 'Tracker data',
    desc: 'The normalized surveillance graph: who tracks whom, across domains and corporate entities.',
    endpoints: [
      ['GET', '/v1/domains/{domain}', 'Full surveillance tracker record for a domain.'],
      ['GET', '/v1/domains', 'List tracker domains, filterable by category and minimum risk.'],
      ['GET', '/v1/entities/{slug}', 'Full surveillance profile for a corporate entity and its domains.'],
      ['GET', '/v1/entities', 'List surveillance entities, filterable by industry.'],
      ['GET', '/v1/search', 'Full-text search across tracker domains and entities.'],
    ],
  },
  {
    name: 'Domain intelligence',
    desc: 'Live probes of a destination\'s public surface, what it runs, who it lets in, how it treats agents.',
    endpoints: [
      ['GET', '/v1/intel/http', 'HTTP headers, redirect chain, and security posture.'],
      ['GET', '/v1/intel/stack', 'Technology stack. CMS, framework, CDN, analytics.'],
      ['GET', '/v1/intel/robots', 'robots.txt parsed, with AI-crawler policy detection.'],
      ['GET', '/v1/intel/agent', 'The AI-agent surface a domain exposes, llms.txt, MCP, OpenAPI, plugins.'],
      ['GET', '/v1/intel/inject', 'Scan a domain\'s public surface for prompt-injection signals.'],
      ['GET', '/v1/intel/optout', 'AI-training opt-out signals. TDM, noai, license.'],
    ],
  },
  {
    name: 'Provenance, receipts & certificates',
    desc: 'Signed, verifiable artifacts: surveillance receipts, jurisdiction certs, and the BYOM analyst config.',
    endpoints: [
      ['POST', '/v1/receipt/generate', 'Generate a signed surveillance receipt for a list of domains.'],
      ['GET', '/v1/receipt/revoked', 'Check whether a receipt signing key or individual receipt is revoked.'],
      ['POST', '/verify', 'Verify a surveillance receipt\'s integrity by hash + signature.'],
      ['GET', '/verify/{receipt_id}', 'Look up a receipt by ID in the public registry.'],
      ['GET', '/v1/config/analyst', 'BYOM analyst config bundle, system prompt + tool subset + response schema, signed.'],
      ['GET', '/v1/audit/export', 'Export signed, hash-chained audit log entries scoped to the caller.'],
    ],
  },
  {
    name: 'Agent payment rail',
    desc: 'x402 micropayments, how an autonomous agent pays for a metered call and verifies the receipt.',
    endpoints: [
      ['POST', '/v1/x402/echo', 'x402 demo, 402 challenge → X-PAYMENT retry → echo with settlement header.'],
    ],
  },
  {
    name: 'Keys, tasks & status',
    desc: 'Self-serve key management, async task polling, and liveness.',
    endpoints: [
      ['GET', '/v1/keys/me', 'Metadata + today\'s usage for the authenticated API key.'],
      ['DELETE', '/v1/keys/me', 'Permanently revoke the authenticated key.'],
      ['GET', '/v1/tasks/{task_id}', 'Poll an async background task.'],
      ['GET', '/v1/tasks/{task_id}/stream', 'Stream task progress over Server-Sent Events.'],
      ['POST', '/v1/tasks/{task_id}/cancel', 'Cancel a pending or running task.'],
      ['GET', '/v1/health', 'Liveness check.'],
    ],
  },
]

// ── Shared bits ──────────────────────────────────────────────────────────────
function MethodBadge({ method }) {
  const colors = { GET: '--accent-green', POST: '--accent-blue', DELETE: '--accent-red' }
  const c = `var(${colors[method] || '--chrome-border'})`
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, color: c,
      border: `1px solid ${c}`, borderRadius: '2px', padding: '2px 6px',
      flexShrink: 0, minWidth: '46px', textAlign: 'center',
    }}>{method}</span>
  )
}

function EndpointRow({ row }) {
  const [method, path, desc] = row
  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'baseline',
      padding: '11px 0', borderBottom: '1px solid var(--chrome-border)',
    }}>
      <MethodBadge method={method} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <code style={{
          fontFamily: 'var(--font-mono)', fontSize: '12px',
          color: 'var(--chrome-text-bright)', wordBreak: 'break-all',
        }}>{path}</code>
        <p style={{
          fontFamily: 'var(--font-serif)', fontSize: '13px', lineHeight: '1.5',
          color: 'var(--doc-text-dim)', margin: '4px 0 0 0',
        }}>{desc}</p>
      </div>
    </div>
  )
}

function ToolRow({ tool }) {
  const [name, desc] = tool
  return (
    <div style={{ padding: '9px 0', borderBottom: '1px solid var(--chrome-border)' }}>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)' }}>{name}</code>
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', color: 'var(--doc-text-dim)', marginLeft: '8px' }}>{desc}</span>
    </div>
  )
}

function Collapsible({ title, badge, badgeColor, subtitle, link, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div style={{ border: '1px solid var(--chrome-border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 16px',
        background: open ? 'var(--doc-paper)' : 'var(--chrome-bg2)', cursor: 'pointer',
        transition: 'background var(--transition)', flexWrap: 'wrap',
      }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--chrome-text-bright)', margin: 0 }}>{title}</h3>
        {badge != null && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '8px', color: `var(${badgeColor || '--accent-green'})`,
            border: `1px solid var(${badgeColor || '--accent-green'})`, borderRadius: '2px', padding: '1px 5px',
          }}>{badge}</span>
        )}
        {subtitle && <span style={{ fontFamily: 'var(--font-serif)', fontSize: '12px', color: 'var(--doc-text-dim)', flex: 1, minWidth: 0 }}>{subtitle}</span>}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--chrome-text-dim)', marginLeft: 'auto' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '8px 18px 16px', borderTop: '1px solid var(--chrome-border)', background: 'var(--doc-bg)' }}>
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-blue)', textDecoration: 'none',
              display: 'inline-block', margin: '8px 0 4px',
            }}>{link.replace('https://', '')} ↗</a>
          )}
          {children}
        </div>
      )}
    </div>
  )
}

function SectionTitle({ eyebrow, children }) {
  return (
    <>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-green)', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '44px 0 10px' }}>{eyebrow}</div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 400, color: 'var(--chrome-text-bright)', margin: '0 0 18px' }}>{children}</h2>
    </>
  )
}

export default function Api({ onNavigate }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        {/* Header */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-green)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '12px' }}>● APIs &amp; MCP</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 400, color: 'var(--chrome-text-bright)', marginBottom: '10px' }}>
          The whole surface, for humans and agents.
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', lineHeight: '1.7', color: 'var(--doc-text-dim)', marginBottom: '28px', maxWidth: '640px' }}>
          One signed corpus, two rails. <strong style={{ color: 'var(--chrome-text)' }}>REST</strong> over
          the Scry attacker corpus and the Data API; <strong style={{ color: 'var(--chrome-text)' }}>MCP</strong> for
          agents, every Data API endpoint is also a tool. JSON in, JSON out, CORS open. The free tier needs no key.
        </p>

        <LivePlayground />

        {/* Related builder surfaces (demoted from the top nav 2026-07 — kept
            one click away here so Docs is the single builder hub). */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--chrome-text-dim)', marginBottom: '28px', display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
          <span style={{ color: 'var(--chrome-text-dim)' }}>also:</span>
          {[
            { label: 'Claude Skills', page: 'skills' },
            { label: 'Agents / MCP', page: 'agents' },
            { label: 'Products', page: 'products' },
            { label: 'Compare', page: 'compare' },
            { label: 'Whitepapers', page: 'whitepapers' },
          ].map(l => (
            <span key={l.page} onClick={() => onNavigate && onNavigate(l.page)} style={{ color: 'var(--accent-blue)', cursor: 'pointer' }}>{l.label}</span>
          ))}
          <a href="/standards" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Standards ↗</a>
        </div>

        {/* Machine-legible discovery */}
        <div style={{ padding: '18px 20px', background: 'var(--chrome-bg2)', border: '1px solid var(--chrome-border)', borderLeft: '3px solid var(--accent-cyan)', borderRadius: '4px', marginBottom: '8px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Machine-legible · start here if you are an agent</div>
          {DISCOVERY.map(d => (
            <div key={d.url} style={{ marginBottom: '10px' }}>
              <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-blue)', textDecoration: 'none' }}>{d.label} ↗</a>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', color: 'var(--doc-text-dim)', marginLeft: '8px' }}>{d.desc}</span>
            </div>
          ))}
        </div>

        {/* MCP servers */}
        <SectionTitle eyebrow="MCP · agent-native">Three MCP servers</SectionTitle>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: '1.65', color: 'var(--doc-text-dim)', marginBottom: '18px' }}>
          JSON-RPC 2.0 over streamable HTTP. Point any MCP-capable agent at a server and call <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-amber)' }}>tools/list</code> to discover what is available. All three are in the public MCP registry.
        </p>
        {MCP_SERVERS.map(s => (
          <Collapsible
            key={s.host}
            title={s.name}
            badge={`${s.count} tools · ${s.registry}`}
            badgeColor="--accent-cyan"
            subtitle={s.host}
            link={`https://${s.host}`}
          >
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', lineHeight: '1.6', color: 'var(--doc-text)', margin: '8px 0 12px' }}>{s.blurb}</p>
            {s.mirror && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--chrome-text-dim)', margin: '0 0 10px' }}>
                ↳ all {s.count} tools mirror the Data API endpoints below, 1:1. Highlights:
              </p>
            )}
            <div>{s.tools.map(t => <ToolRow key={t[0]} tool={t} />)}</div>
          </Collapsible>
        ))}

        {/* REST: Scry corpus */}
        <SectionTitle eyebrow="REST · attacker corpus">Scry API, api.tunnelmind.ai</SectionTitle>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: '1.65', color: 'var(--doc-text-dim)', marginBottom: '18px' }}>
          The signed corpus the radar draws, real source IPs, campaigns, attacker tools, and rolling stats, observed first-hand by the sensor fleet.
        </p>
        {SCRY_GROUPS.map(g => (
          <Collapsible key={g.name} title={g.name} defaultOpen>
            {g.endpoints.map(e => <EndpointRow key={e[1]} row={e} />)}
          </Collapsible>
        ))}

        {/* REST: Data API */}
        <SectionTitle eyebrow="REST · the agentic surface">Data API, data.tunnelmind.ai</SectionTitle>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: '1.65', color: 'var(--doc-text-dim)', marginBottom: '18px' }}>
          The cross-lens moat, the Sigil supply graph, tracker signals, provenance, and the agent payment rail. Every endpoint here is also an MCP tool on <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-amber)' }}>mcp-data.tunnelmind.ai</code>.
        </p>
        {DATA_GROUPS.map(g => (
          <Collapsible key={g.name} title={g.name} badge={`${g.endpoints.length}`} subtitle={g.desc} defaultOpen={g.name === 'Cross-lens & agent decisions'}>
            {g.endpoints.map(e => <EndpointRow key={e[1]} row={e} />)}
          </Collapsible>
        ))}

        {/* Auth + pricing */}
        <SectionTitle eyebrow="Access">Auth, limits &amp; payment</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '40px' }}>
          <div style={{ padding: '18px 20px', background: 'var(--chrome-bg2)', border: '1px solid var(--chrome-border)', borderLeft: '3px solid var(--accent-green)', borderRadius: '4px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Authentication</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', lineHeight: '1.6', color: 'var(--doc-text-dim)', margin: 0 }}>
              No key needed for the free tier, call it straight from the browser or an agent. Pass{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-amber)' }}>Authorization: Bearer &lt;key&gt;</code>{' '}for a paid tier.
            </p>
          </div>
          <div style={{ padding: '18px 20px', background: 'var(--chrome-bg2)', border: '1px solid var(--chrome-border)', borderLeft: '3px solid var(--accent-amber)', borderRadius: '4px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Rate limits</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', lineHeight: '1.6', color: 'var(--doc-text-dim)', margin: 0 }}>
              Per-IP on the free tier, every response carries{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-amber)' }}>X-RateLimit-*</code>{' '}headers so agents back off cleanly.
            </p>
          </div>
          <div style={{ padding: '18px 20px', background: 'var(--chrome-bg2)', border: '1px solid var(--chrome-border)', borderLeft: '3px solid var(--accent-blue)', borderRadius: '4px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Payment</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', lineHeight: '1.6', color: 'var(--doc-text-dim)', margin: 0 }}>
              Identifier resolution is free, forever. Metered calls: a $20 prepaid block (Stripe, for humans) or{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-amber)' }}>x402</code>{' '}USDC on Base (for agents).{' '}
              <span onClick={() => onNavigate && onNavigate('pricing')} style={{ color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}>See pricing</span>.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

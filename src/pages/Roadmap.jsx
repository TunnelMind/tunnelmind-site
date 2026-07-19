import React from 'react'

export const STATUS = {
  live: { label: 'Live', color: 'var(--accent-green)' },
  active: { label: 'Active', color: 'var(--accent-cyan)' },
  comment: { label: 'Public comment', color: 'var(--accent-amber)' },
  drafting: { label: 'Drafting', color: 'var(--accent-amber)' },
  spec: { label: 'Spec locked', color: 'var(--accent-purple)' },
  planned: { label: 'Planned', color: 'var(--chrome-text-dim)' },
}

export const SECTIONS = [
  {
    eyebrow: 'Shipping now',
    title: 'The trust attestation layer is live.',
    summary: 'One correlated graph of who is attacking, who is watching, who can be trusted, and where the traffic actually goes, read through four lenses (Scry, Sigil, Tracker, GhostRoute) and queryable identically by humans and AI agents. Free to read, free to query, no key required to start. The cross-lens join is the part no siloed incumbent can compute.',
    items: [
      { name: 'Surveillance Radar', status: 'live', desc: 'The live attacker corpus as the front door of tunnelmind.ai, every dot a real source IP a sensor watched in the last hour, geo + ASN-enriched, sampled but never edited. SSE stream, click-to-inspect, three view modes (Visual / JSON / curl).' },
      { name: 'Cross-lens verify: the join', status: 'live', desc: 'POST /v1/verify/{node} on data.tunnelmind.ai fuses Scry × Sigil × GhostRoute into one verdict on any entity, with the per-lens blocks shown alongside, a 5-minute signed sigil_token, an optional ATAP witness event, and an adversary-class read (human hacker / rogue agent / big-tech surveillance). The moat: the botnet running your ad fraud is the botnet scanning your edge.', link: { label: 'See the catalog', href: '/api' } },
      { name: 'Scry: who is attacking', status: 'live', desc: 'Signed observations of hostile network actors: IPs, ASNs, behaviors, threat-feed overlap, actor- and adversary-class overlays. REST at api.tunnelmind.ai, /v1/check, /recent, /bulk, /campaigns, /stats. Free, no key, Durable-Object rate limit.', link: { label: 'Browse the endpoints', href: '/api' } },
      { name: 'Sigil: who can you trust', status: 'live', desc: 'The supply-graph trust layer at data.tunnelmind.ai: ads.txt / sellers.json / app-ads.txt verification, supply-chain and supply-path traversal, entity trust scoring, and ATAP receipt generation. First application: programmatic advertising for AI media-buying agents.' },
      { name: 'Tracker: who is watching', status: 'live', desc: 'The demand-side graph of the surveillance economy: tracker-operator entities, the resellers they buy from, the publishers they reach. Surfaced today through cross-lens joins; deepening the demand layer is next.' },
      { name: 'GhostRoute, where it actually goes', status: 'live', desc: 'Routing integrity and sovereignty under /v1/ghostroute/ and fused into /v1/verify: origin AS, RPKI route validity (read first-party from our own corpus), the sovereign jurisdiction a service claims versus the one it egresses through, and certificate-transparency logs witnessed against signature-verified roots we hold ourselves, with append-only regression alerts. Catches the EU-claimed / hyperscaler-routed mismatch with cryptographic proof, not a marketing page.' },
      { name: 'Augur, clearnet recon corpus', status: 'live', desc: 'Continuous passive collection across eight threat-feed sources (URLhaus, ThreatFox, Tor exit lists, Spamhaus DROP, crt.sh, Feodo, Emerging Threats), CIDR-aware, intent-tagged. The corpus the radar draws and the API serves.' },
      { name: 'Familiar, attested sensor fleet', status: 'live', desc: 'Distributed passive sensor that Ed25519-signs every observation at the source and submits over a frozen v1.0 signed-ingest contract. Bad signatures are dropped before ingest. 5-node bootstrap fleet, each carrying an OAI sensor identity; fleet expands as paying entities cover the marginal cost.' },
      { name: 'Three MCP servers', status: 'live', desc: 'JSON-RPC 2.0 over streamable HTTP, all listed in the official MCP registry: mcp.tunnelmind.ai (Scry, 12 tools), mcp-data.tunnelmind.ai (Data, 78 tools), mcp.sigil.tunnelmind.ai (Sigil, 12 tools). Same corpus, structured for a model to consume directly.' },
      { name: 'Agent self-serve. BYOM, preflight, x402', status: 'live', desc: 'GET /v1/config/analyst hands any LLM a signed config bundle (bring your own model + tokens). POST /v1/preflight gives an allow / caution / deny verdict plus a signed consultation receipt before an agent acts. x402 USDC micropayments let an agent pay per call with no human in the loop, discovery at /.well-known/x402.json.' },
      { name: 'Corpus inspector, the right panel of the Radar', status: 'live', desc: 'Click any radar node or type any domain or IP to open a 14-tab intel surface. WHOIS, DNS, Mail (SPF/DMARC/DKIM), Certs, Subdomains, ASN, HTTP, Stack, Tracker, Crawlers, Agent surface, Injection, Opt-Out, Reputation. Same data over REST and MCP. Deep-linkable at /?inspect=<host>; the retired NetProbe subdomain 301s here.' },
      { name: 'OAI resolver. Observed Actor Identifier', status: 'live', desc: 'Every observed actor and operator carries a stable, resolvable identifier. The edge resolver at tunnelmind.ai/id/{id-or-alias} does status-aware caching and content negotiation (HTML + JSON-LD), free and unauthenticated. The v1.0 standard is in public comment.', link: { label: 'Read the spec', href: '/oai/standard' } },
      { name: 'Open standards. ATAP, Receipt, EAT', status: 'comment', desc: 'The attestation rails are open (Apache-2.0 / CC-BY) so anyone can issue or verify. ATAP v0.1 (npm @tunnelmindai/atap) and the TunnelMind Receipt format v1.0 are both in public comment, with reference verifiers shipped; an EAT (IETF RATS) profile is in draft. The moat is not the format, it is what signs it.', link: { label: 'Read the spec', href: 'https://tunnelmind.ai/atap/standard' } },
    ],
  },
  {
    eyebrow: 'In active development',
    title: 'Turning the sampled corpus into revenue, human rail and agent rail.',
    summary: 'The free surfaces above are deliberately sampled. The work in flight makes the depth purchasable, by humans on Stripe, by agents on x402, without compromising the public-by-default stance. No subscription tier: identifiers resolve free forever; you pay for depth and scale.',
    items: [
      { name: 'Block checkout, $20 access block', status: 'active', desc: 'A one-time $20 prepaid block of API calls instead of a monthly subscription (the old Defender tier is retired). Client and webhook code are complete and deployed; the remaining gate is the Stripe product setup plus the credit endpoint before checkout flips live.' },
      { name: 'x402, real-USDC settlement', status: 'active', desc: 'The agent rail is operational in demo mode (HMAC, no real USDC) end-to-end: 402 challenge → X-PAYMENT retry → 200 + settlement header. Wiring the Coinbase facilitator for real USDC settlement is pending wallet provisioning.' },
      { name: 'Inbound discovery', status: 'drafting', desc: 'Show HN / writeups and search resolvability so "ads.txt verification API" and "sellers.json supply-chain verification" surface TunnelMind, not a name-collision rival. The draft is written; it fires when the timing is right.' },
      { name: 'Monitor / post-candidate bot', status: 'drafting', desc: 'Fleet-health watcher plus a post-candidate generator off the same event stream. Dry-run by default; live posting gated behind an explicit env flag and confirmed credentials.' },
      { name: 'Augur source expansion', status: 'active', desc: 'Phase 2b sources beyond the current eight. ASNDROP, an AbuseIPDB licensing evaluation, GreyNoise, more cross-source links and campaigns visible without enlarging the sensor fleet beyond bootstrap.' },
    ],
  },
  {
    eyebrow: 'Planned',
    title: 'Deepen the graph, then own the silicon.',
    summary: 'Gated behind first revenue on the block model. Each item makes the cross-lens graph denser or the attestation chain stronger; the silicon track stays off the critical path until a data gap appears that only custom hardware can close.',
    items: [
      { name: 'CT-log ingestion', status: 'planned', desc: 'Stream Certificate Transparency logs directly, replacing the brittle crt.sh dependency, a seismograph for the trust-migration thesis as issuance patterns shift.' },
      { name: 'MISP / STIX-TAXII tap', status: 'planned', desc: 'Bidirectional threat-intel exchange: receive IOCs from the established ecosystem, contribute signed cross-lens verdicts back.' },
      { name: 'Contribute-and-earn', status: 'planned', desc: 'A signed-submission path where agents and Familiar nodes submit observations for credit, the route to making a Sigil receipt an automatic byproduct of every MCP call (the witnessability gap).' },
      { name: 'Tracker demand-layer deepening', status: 'planned', desc: 'Recurring SDK/script fingerprints, demand concentration, and made-for-advertising share trends, turning Tracker from a bootstrap mirror into a full demand-side graph.' },
      { name: 'Compliance-grade agent-action ledger', status: 'planned', desc: 'A tamper-evident, retained ledger of an agent’s receipts with a compliance-oriented export, converting receipts from "nice proof" into a required audit record. Builds when a named prospect with a compliance mandate appears.' },
      { name: 'Microkernel sensor, silicon-root attestation', status: 'planned', desc: 'A Rust microkernel sensor with attestation pushed to silicon, eBPF line-rate capture, and signed transport. Explicitly off the critical path until first revenue exists and a gap appears that only hardware can close.' },
    ],
  },
]

export const Badge = ({ status }) => {
  const s = STATUS[status]
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '3px',
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: s.color,
      border: `1px solid ${s.color}`,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

export default function Roadmap() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        {/* Header */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-green)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          ● Roadmap
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 400,
          lineHeight: '1.25',
          color: 'var(--chrome-text-bright)',
          marginBottom: '20px',
        }}>
          You can&apos;t fight what you can&apos;t see. The roadmap is the work of making it visible.
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '16px',
          lineHeight: '1.8',
          color: 'var(--doc-text-dim)',
          marginBottom: '48px',
          maxWidth: '600px',
        }}>
          TunnelMind is a single-operator project building the trust attestation layer for the
          agentic internet: every entity that attacks, watches, or transacts on the open web
          should be identifiable by a stable handle, every observation should be signed at the
          source, and every verdict should carry a receipt a human or a machine can replay later.
          The corpus is public by default. Below is what is shipping, what is being built, and
          what is queued.
        </p>

        <div style={{ height: '1px', background: 'var(--chrome-border)', marginBottom: '48px' }} />

        {/* Sections */}
        {SECTIONS.map((section, i) => (
          <section key={section.eyebrow} style={{ marginBottom: i === SECTIONS.length - 1 ? '0' : '64px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}>
              {section.eyebrow}
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(20px, 3vw, 26px)',
              fontWeight: 400,
              lineHeight: '1.3',
              color: 'var(--chrome-text-bright)',
              marginBottom: '14px',
            }}>
              {section.title}
            </h2>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '15px',
              lineHeight: '1.7',
              color: 'var(--doc-text-dim)',
              marginBottom: '28px',
              maxWidth: '600px',
            }}>
              {section.summary}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {section.items.map(item => (
                <div key={item.name} style={{
                  background: 'var(--doc-paper)',
                  border: '1px solid var(--chrome-border)',
                  borderRadius: '4px',
                  padding: '18px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--chrome-text-bright)',
                    }}>
                      {item.name}
                    </div>
                    <Badge status={item.status} />
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'var(--doc-text-dim)',
                  }}>
                    {item.desc}
                  </div>
                  {item.link && (
                    <a
                      href={item.link.href}
                      style={{
                        display: 'inline-block',
                        marginTop: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--accent-green)',
                        textDecoration: 'none',
                        borderBottom: '1px solid var(--accent-green-dim)',
                        paddingBottom: '1px',
                      }}
                    >
                      {item.link.label} →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div style={{ height: '1px', background: 'var(--chrome-border)', margin: '64px 0 32px' }} />

        {/* Footer note */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--chrome-text-dim)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          How this roadmap works
        </div>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '14px',
          lineHeight: '1.7',
          color: 'var(--doc-text-dim)',
          maxWidth: '600px',
        }}>
          TunnelMind is one person. The order things ship in is determined by what unblocks the
          most leverage, not by a quarterly plan. Standards (OAI, ATAP) go public for comment
          before code locks; products consume the standards rather than the reverse. The corpus
          is open; the resolver is free; the registry payload is dedicated to the public domain.
        </p>
      </div>
    </div>
  )
}

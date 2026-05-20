import React from 'react'

const STATUS = {
  live: { label: 'Live', color: 'var(--accent-green)' },
  active: { label: 'Active', color: 'var(--accent-cyan)' },
  comment: { label: 'Public comment', color: 'var(--accent-amber)' },
  drafting: { label: 'Drafting', color: 'var(--accent-amber)' },
  spec: { label: 'Spec locked', color: 'var(--accent-purple)' },
  planned: { label: 'Planned', color: 'var(--chrome-text-dim)' },
}

const SECTIONS = [
  {
    eyebrow: 'Shipping now',
    title: 'The observability layer is live.',
    summary: 'A single corpus of attested observations, exposed three ways — a public radar, a free REST API, and an MCP server agents can wire straight into a model. Free to read, free to query, no key required to start.',
    items: [
      { name: 'Surveillance Radar', status: 'live', desc: 'The live attacker corpus as the front door of tunnelmind.ai — every dot a real source IP a sensor watched in the last hour, geo + ASN-enriched, sampled but never edited. SSE stream, click-to-inspect, three view modes (Visual / JSON / curl).' },
      { name: 'Augur — clearnet recon corpus', status: 'live', desc: 'Continuous passive collection from URLhaus, ThreatFox, Tor exit and DAN lists, Spamhaus DROP, and crt.sh. 6 sources running, 125+ actors with cross-source links, CIDR-aware. The corpus the radar draws and the API serves.' },
      { name: 'Familiar — attested sensor fleet', status: 'live', desc: 'Distributed passive sensor that Ed25519-signs every observation at the source and submits to the corpus. Bad signatures are dropped before ingest. 5-node bootstrap fleet live; fleet expands as paying entities cover the marginal cost.' },
      { name: 'Tracker Data API', status: 'live', desc: 'REST over the same corpus the radar draws, at api.tunnelmind.ai. Free anonymous tier with a Durable-Object rate limit; paid keys for unmetered defender lookups. Geo, ASN, campaign membership, payload signatures, time series.', link: { label: 'Browse the endpoints', href: '/api' } },
      { name: 'MCP server', status: 'live', desc: 'JSON-RPC 2.0 over streamable HTTP at mcp.tunnelmind.ai. The same corpus, structured for an AI agent to consume directly — agent-native because the agents are the new internet.' },
      { name: 'Sigil verification surfaces', status: 'live', desc: 'Eight verify endpoints at data.tunnelmind.ai — entity trust scoring, supply-chain attestations, ATAP receipt verification, signed bundles, IP/domain reputation. The "who can you trust" layer for programmatic supply.' },
      { name: 'Corpus inspector — the right panel of the Radar', status: 'live', desc: 'Click any radar node or type any domain or IP to open a 14-tab intel surface — WHOIS, DNS, Mail (SPF/DMARC/DKIM), Certs, Subdomains, ASN, HTTP, Stack, Tracker, Crawlers, Agent surface, Injection, Opt-Out, Reputation. Same data over REST and MCP. Deep-linkable at /#/?inspect=<host>; the retired NetProbe subdomain 301s here.' },
      { name: 'ATAP — Agent Trust Attestation Protocol', status: 'comment', desc: 'v0.1 protocol spec, receipt format, JSON Schemas, JSON-LD context, and reference verifier — all published. npm @tunnelmindai/atap shipped. In public comment through 2026-08-12.', link: { label: 'Read the spec', href: 'https://tunnelmind.ai/atap/standard' } },
      { name: 'OAI — Observed Actor Identifier Standard', status: 'comment', desc: 'Open identifier standard for trackers, fingerprinters, surveillance vendors, ad networks, data brokers, threat actors, and sensor operators. CVE editorial model: free resolution, permanent canonical identifiers, signed observations. v1.0 in public comment through 2026-08-12.', link: { label: 'Read the spec', href: '/oai/standard' } },
    ],
  },
  {
    eyebrow: 'In active development',
    title: 'Turning the corpus into a defender tier and an agent rail.',
    summary: 'The free surfaces above are deliberately sampled. The work in flight is what makes the rest of the corpus purchasable — by humans on Stripe, and by agents on x402 — without compromising the public-by-default stance.',
    items: [
      { name: 'Defender & Team tiers — block checkout', status: 'active', desc: 'Prepaid $20 call blocks against the API, one-time payment, volume rate computed per block from Stripe charge history. Client and webhook code-complete and deployed; the credit endpoint on scry-server and the Stripe product setup are the remaining gates before checkout flips live.' },
      { name: 'x402 agent rail', status: 'drafting', desc: 'USDC micropayments per call so AI agents can transact directly against the API without a human in the loop. Stripe stays the human rail; x402 is the agent rail. Spec landed; production wiring in progress.' },
      { name: 'OAI Resolver', status: 'drafting', desc: 'Dedicated edge resolver at tunnelmind.ai/id/{id-or-alias}. Status-aware caching, content negotiation (HTML + JSON-LD), no rate limit, authentication forbidden.' },
      { name: 'Monitor / post-candidate bot', status: 'drafting', desc: 'Fleet-health watcher plus a post-candidate generator off the same event stream. Dry-run by default; live posting gated behind an explicit env flag and confirmed credentials.' },
      { name: 'Augur source expansion', status: 'active', desc: 'Phase 2b sources beyond the current six — more passive feeds, more cross-source links, more campaigns visible without enlarging the sensor fleet beyond bootstrap.' },
    ],
  },
  {
    eyebrow: 'Planned',
    title: 'Standards infrastructure and the Sigil supply line.',
    summary: 'Specifications drafted, ship order depends on adoption of the layers below. The standards lock first; the products consume the standards rather than the reverse.',
    items: [
      { name: 'Sigil — programmatic ad supply verification', status: 'spec', desc: 'The "who can you trust" verification layer for the agentic internet. First application: programmatic advertising. Built on OAI as the identifier substrate and ATAP as the receipt format. Verification surfaces are live today; the paid Sigil products consume them.' },
      { name: 'OAI Schema Repository', status: 'planned', desc: 'GitHub-hosted JSON Schema, JSON-LD context, worked examples, and tooling. Opens once v1.0 closes comment.' },
      { name: 'OAI Sensor Issuance', status: 'planned', desc: 'Per-country issuance flow for OAI-SENSOR-{cc}-{seq} identifiers. Enables external sensor operators to contribute signed observations into the corpus.' },
      { name: 'OAI Transparency Log', status: 'planned', desc: 'Ed25519 attestation log at /oai/log. Append-only, publicly verifiable, mirrors the registry payload archive.' },
      { name: 'Federation', status: 'planned', desc: 'Multiple resolvers, multiple registries, canonical 301 chain. v2 governance work.' },
    ],
  },
]

const Badge = ({ status }) => {
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
          TunnelMind is a single-operator project building toward one outcome: every entity that
          observes, profiles, or acts against users should be identifiable by a stable handle,
          their observations should be signed, and the corpus should be public. Below is what
          is shipping, what is being built, and what is queued.
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

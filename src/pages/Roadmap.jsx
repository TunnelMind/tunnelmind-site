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
    title: 'The observability layer is already running.',
    summary: 'Tools that make the surveillance economy legible — all free, all public, all running today.',
    items: [
      { name: 'Surveillance Receipt', status: 'live', desc: 'Line-item invoice showing what your browsing data is worth, broken down by tracker, company, and category. Local, signed, verifiable.' },
      { name: 'Surveillance Radar', status: 'live', desc: '704 surveillance entities and 9,786 domains rendered as an interactive force-directed graph. Click any node to walk corporate ownership.' },
      { name: 'Tracker Data API', status: 'live', desc: 'REST API with 50 free requests/day, CORS open, no key required. Powers every tool above.' },
      { name: 'NetProbe', status: 'live', desc: 'Full domain intelligence: WHOIS, DNS, SPF/DMARC/DKIM, certificate transparency, headers, tech stack — plus tracker scores and ownership.' },
      { name: 'GhostRoute Certificate Verification', status: 'live', desc: 'Independently verify any GhostRoute Jurisdictional Routing Certificate. Public, free, signed.' },
      { name: 'Browser Extension', status: 'live', desc: 'Passive tracker interception as you browse. Real-time popup of who is watching and what your session is worth.' },
    ],
  },
  {
    eyebrow: 'In active development',
    title: 'The observability layer for the agentic internet.',
    summary: 'When the consumers of the web are agents, not humans, identification of the entities behind every request becomes the load-bearing question. These are the systems that make that legible.',
    items: [
      { name: 'OAI — Observed Actor Identifier Standard', status: 'comment', desc: 'Open identifier standard for trackers, fingerprinters, surveillance vendors, ad networks, data brokers, threat actors, and sensor operators. CVE editorial model: free resolution, permanent canonical identifiers, signed observations. v1.0 in public comment through 2026-08-12.', link: { label: 'Read the spec', href: '/oai/standard' } },
      { name: 'OAI Resolver', status: 'drafting', desc: 'Dedicated edge resolver at tunnelmind.ai/id/{id-or-alias}. Status-aware caching, content negotiation (HTML + JSON-LD), no rate limit, authentication forbidden.' },
      { name: 'Augur — clearnet recon corpus', status: 'active', desc: 'Continuous passive collection from URLhaus, ThreatFox, Tor exit lists, Spamhaus DROP, certificate transparency. 6 sources live; source expansion in progress.' },
      { name: 'Familiar — distributed passive sensor', status: 'spec', desc: 'Single-node sensor that signs every observation with Ed25519 and submits to the corpus. Bootstrap fleet at 5 nodes; scales when paying entities cover the delta.' },
      { name: 'Radar v2', status: 'drafting', desc: 'Surveillance Radar rebuilt as the main tunnelmind.ai landing surface. Sample-only public view; full corpus access on the defender tier.' },
    ],
  },
  {
    eyebrow: 'Planned',
    title: 'Programmatic ad supply, attribution, and downstream products.',
    summary: 'Specifications drafted, ship order depends on adoption of the layers below.',
    items: [
      { name: 'Sigil — programmatic ad supply verification', status: 'spec', desc: '"Who can you trust" verification layer for the agentic internet. First application: programmatic advertising. Built on OAI as the identifier substrate.' },
      { name: 'ATAP — Agent Trust Attestation Protocol', status: 'spec', desc: 'Protocol specification, receipt format, and reference verifier. Precondition for Sigil and the defender-tier products.' },
      { name: 'OAI Schema Repository', status: 'planned', desc: 'GitHub-hosted JSON Schema, JSON-LD context, worked examples, and tooling. Opens once v1.0 closes comment.' },
      { name: 'OAI Sensor Issuance', status: 'planned', desc: 'Per-country issuance flow for OAI-SENSOR-{cc}-{seq} identifiers. Enables external sensor operators to contribute signed observations.' },
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

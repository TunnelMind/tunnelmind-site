import React from 'react'
import PageDesc from '../components/PageDesc.jsx'

// /products — post-pivot (P25 Phase 2). The full registry of the
// observability layer: the pipelines that build the corpus, the surfaces
// onto it, the open standards on top, and the verification layer.
// NetShell is shelved and the old eBPF "personal" line is retired — both
// deliberately absent.

const GROUPS = [
  {
    label: '● The Corpus',
    color: 'var(--accent-green)',
    note: 'Two pipelines feed one signed record of hostile network activity.',
    items: [
      {
        name: 'Familiar',
        desc: 'A distributed fleet of passive sensors. Each node signs every observation with an Ed25519 key before submitting it, so the corpus carries cryptographic proof of provenance. Bootstrap fleet online; it scales as paying entities cover the delta.',
        tag: 'Live',
      },
      {
        name: 'Augur',
        desc: 'A continuous clearnet recon pipeline. Ingests public threat intelligence — URLhaus, ThreatFox, Tor exit lists, Spamhaus DROP, certificate transparency, and more — and folds it into the corpus alongside the sensor feed.',
        tag: 'Live',
      },
    ],
  },
  {
    label: '◎ Surfaces',
    color: 'var(--accent-blue)',
    note: 'Different ways to query the same corpus — all free to start.',
    items: [
      {
        name: 'Scry Radar',
        desc: 'The live attacker corpus as a force-directed graph. A public sample, refreshed every 10 seconds — the front page of tunnelmind.ai.',
        url: 'https://tunnelmind.ai',
        label: 'tunnelmind.ai',
        tag: 'Live · Free',
      },
      {
        name: 'Chat',
        desc: 'Plain-language questions, sourced answers grounded in signed observations. No account required to start.',
        url: 'https://chat.tunnelmind.ai',
        label: 'chat.tunnelmind.ai',
        tag: 'Live · Free',
      },
      {
        name: 'Corpus API',
        desc: 'REST over the corpus — single and bulk IP checks, recent actors, campaigns, tools, and rolling stats. CORS open, free tier, no key.',
        url: 'https://api.tunnelmind.ai',
        label: 'api.tunnelmind.ai',
        tag: 'Live · Free tier',
      },
      {
        name: 'MCP Server',
        desc: 'JSON-RPC 2.0 over streamable HTTP. Wires the corpus into any Model Context Protocol agent as a callable tool.',
        url: 'https://mcp.tunnelmind.ai',
        label: 'mcp.tunnelmind.ai',
        tag: 'Live · Free',
      },
      {
        name: 'Browser Extension',
        desc: 'Passive checks as you browse — third-party requests matched against the corpus, no proxy and no DNS redirect. Firefox + Chrome.',
        url: 'https://addons.mozilla.org/firefox/addon/tunnelmind-surveillance-receipt/',
        label: 'Firefox · Chrome Web Store',
        tag: 'In review',
      },
    ],
  },
  {
    label: '⬡ Standards',
    color: 'var(--accent-cyan)',
    note: 'Open specifications, published for public comment before the code locks.',
    items: [
      {
        name: 'OAI — Observed Actor Identifier',
        desc: 'An open identifier standard giving every observed actor — tracker, scanner, ad network, threat actor, sensor — a permanent, free-to-resolve handle. CVE-style editorial model. v1.0 in public comment.',
        url: '/standards',
        label: 'tunnelmind.ai/standards',
        tag: 'Public comment',
      },
      {
        name: 'ATAP — Agent Trust Attestation Protocol',
        desc: 'A protocol, receipt format, and reference verifier that let one agent check another’s claims against signed evidence. v0.1 published; reference verifier and JSON Schemas shipped.',
        url: 'https://tunnelmind.ai/atap/standard',
        label: 'tunnelmind.ai/atap/standard',
        tag: 'v0.1 published',
      },
    ],
  },
  {
    label: '◆ Verification',
    color: 'var(--accent-purple)',
    note: 'The trust layer built on top of OAI and ATAP.',
    items: [
      {
        name: 'Sigil',
        desc: 'An agentic supply-verification layer — "who can you trust" for the agentic internet. Entity trust scoring and signed verification endpoints, with programmatic advertising as the first application.',
        url: 'https://data.tunnelmind.ai',
        label: 'data.tunnelmind.ai',
        tag: 'Live',
      },
    ],
  },
]

function TagColor(tag) {
  if (tag.includes('review') || tag.includes('comment')) return 'var(--accent-amber)'
  return 'var(--accent-green)'
}

function ProductCard({ tool }) {
  const isLink = !!tool.url
  const El = isLink ? 'a' : 'div'
  const isHash = isLink && tool.url.startsWith('/')
  const linkProps = isLink
    ? { href: tool.url, ...(isHash ? {} : { target: '_blank', rel: 'noopener noreferrer' }) }
    : {}
  const tagColor = TagColor(tool.tag)

  return (
    <El
      {...linkProps}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        background: 'var(--chrome-bg2)',
        border: '1px solid var(--chrome-border)',
        borderRadius: '3px',
        textDecoration: 'none',
        transition: 'border-color 150ms ease, background 150ms ease',
        cursor: isLink ? 'pointer' : 'default',
      }}
      onMouseEnter={isLink ? e => {
        e.currentTarget.style.borderColor = tagColor
        e.currentTarget.style.background = 'var(--doc-paper)'
      } : undefined}
      onMouseLeave={isLink ? e => {
        e.currentTarget.style.borderColor = 'var(--chrome-border)'
        e.currentTarget.style.background = 'var(--chrome-bg2)'
      } : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--chrome-text-bright)',
        }}>
          {tool.name}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: tagColor,
          border: `1px solid ${tagColor}`,
          borderRadius: '2px',
          padding: '1px 5px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          opacity: 0.85,
        }}>
          {tool.tag}
        </span>
      </div>

      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '15px',
        lineHeight: '1.6',
        color: 'var(--doc-text)',
        margin: 0,
        flex: 1,
      }}>
        {tool.desc}
      </p>

      {tool.label && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent-blue)',
          marginTop: 'auto',
        }}>
          {tool.label} ↗
        </span>
      )}
    </El>
  )
}

export default function Products() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <PageDesc
        title="products"
        desc="The observability layer for the agentic internet, end to end — the pipelines that build the signed corpus, the surfaces onto it, the open standards on top, and the verification layer they support."
      />

      <div style={{ padding: 'clamp(12px, 4vw, 32px)', maxWidth: '960px', margin: '0 auto' }}>
        {GROUPS.map((group, gi) => (
          <section key={group.label} style={{ marginBottom: gi === GROUPS.length - 1 ? '0' : '36px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: group.color,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              {group.label}
            </div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '14px',
              color: 'var(--doc-text-dim)',
              marginBottom: '14px',
              lineHeight: '1.6',
            }}>
              {group.note}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '10px',
            }}>
              {group.items.map(tool => (
                <ProductCard key={tool.name} tool={tool} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

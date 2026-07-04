import React from 'react'

// /tools — post-pivot (P25 Phase 2). The corpus has one source of truth
// and several surfaces onto it. This page is the index of those surfaces.

const SURFACES = [
  {
    name: 'Scry Radar',
    desc: 'The live attacker corpus as a force-directed graph. Every dot is a real source IP a sensor watched attack something in the last hour; amber hubs are coordinated campaigns. Click any node to inspect protocols, ASN, country, and registry records.',
    page: 'landing',
    label: 'tunnelmind.ai',
    tag: 'Live · Free',
    tagColor: '--accent-green',
  },
  {
    name: 'Chat',
    desc: 'Ask the corpus in plain language. Sourced, real-time answers about IPs, networks, campaigns, and threats — grounded in signed observations, not in vibes. No account required to start.',
    href: 'https://chat.tunnelmind.ai',
    label: 'chat.tunnelmind.ai',
    tag: 'Live · Free',
    tagColor: '--accent-green',
  },
  {
    name: 'Tracker Data API',
    desc: 'REST over the same corpus the radar draws. Check a single IP, bulk-check a block list, pull recent attackers, campaigns, tools, and stats. Free tier to start; paid plans for unmetered scale.',
    href: 'https://api.tunnelmind.ai',
    label: 'api.tunnelmind.ai',
    tag: 'Live · Free tier',
    tagColor: '--accent-blue',
  },
  {
    name: 'MCP Server',
    desc: 'Wire the corpus into any AI agent. JSON-RPC 2.0 over streamable HTTP — agent-native, because the agents are the new internet. Point a Model Context Protocol client at the endpoint and the corpus becomes a tool.',
    href: 'https://mcp.tunnelmind.ai',
    label: 'mcp.tunnelmind.ai',
    tag: 'Live · Free',
    tagColor: '--accent-blue',
  },
  {
    name: 'Standards & Verification',
    desc: 'Resolve an OAI identifier, verify an ATAP attestation, or check an entity trust score. The naming and verification layers on top of the corpus — open specs, free resolution.',
    href: '/standards',
    label: 'tunnelmind.ai/standards',
    tag: 'Live · Public',
    tagColor: '--accent-cyan',
  },
  {
    name: 'GhostRoute',
    desc: 'The fourth lens — routing integrity and sovereignty. Check the origin AS, RPKI route validity, and the sovereign jurisdiction a service claims versus the one it actually egresses through; inspect certificate-transparency proofs witnessed against roots we verify ourselves. Fused into /v1/verify, queryable under /v1/ghostroute/.',
    href: 'https://data.tunnelmind.ai/v1/ghostroute/check/api.anthropic.com',
    label: 'data.tunnelmind.ai/v1/ghostroute',
    tag: 'Live · Free',
    tagColor: '--accent-purple',
  },
]

function SurfaceCard({ tool, onNavigate }) {
  function open() {
    if (tool.page && onNavigate) onNavigate(tool.page)
    else if (tool.href && tool.href.startsWith('/')) window.location.href = tool.href
    else if (tool.href) window.open(tool.href, '_blank', 'noopener')
  }
  const accent = `var(${tool.tagColor})`
  return (
    <div style={{
      padding: '22px',
      background: 'var(--chrome-bg2)',
      border: '1px solid var(--chrome-border)',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
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
          fontSize: '8px',
          color: accent,
          border: `1px solid ${accent}`,
          borderRadius: '2px',
          padding: '2px 6px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          opacity: 0.85,
        }}>
          {tool.tag}
        </span>
      </div>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '14px',
        lineHeight: '1.7',
        color: 'var(--doc-text)',
        margin: 0,
        flex: 1,
      }}>
        {tool.desc}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)' }}>
          {tool.label}
        </span>
        <button
          onClick={open}
          style={{
            padding: '7px 16px',
            background: accent,
            border: 'none',
            borderRadius: '3px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--chrome-bg)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Open ↗
        </button>
      </div>
    </div>
  )
}

export default function Tools({ onNavigate }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-green)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          ● Surfaces
        </div>

        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 400,
          color: 'var(--chrome-text-bright)',
          marginBottom: '10px',
          letterSpacing: '-0.01em',
        }}>
          One corpus. Several ways in.
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          lineHeight: '1.7',
          color: 'var(--doc-text-dim)',
          marginBottom: '40px',
          maxWidth: '580px',
        }}>
          The attacker corpus is one source of truth. These are the surfaces onto
          it — pick the one that fits how you work. Every one of them is free to
          start, and no, you don&apos;t need an account to look around.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
        }}>
          {SURFACES.map(tool => (
            <SurfaceCard key={tool.name} tool={tool} onNavigate={onNavigate} />
          ))}
        </div>

        <div style={{
          marginTop: '48px',
          padding: '20px 24px',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderLeft: '3px solid var(--accent-green)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--accent-green)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              Need the whole corpus?
            </div>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              color: 'var(--doc-text-dim)',
              margin: 0,
            }}>
              A prepaid $20 call block unlocks full campaign membership,
              payload signatures, and bulk corpus export.
            </p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('pricing')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--accent-green)',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--accent-green)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            See pricing →
          </button>
        </div>

      </div>
    </div>
  )
}

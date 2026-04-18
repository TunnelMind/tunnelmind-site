import React from 'react'

const TOOLS = [
  {
    name: 'NetProbe',
    desc: 'Full domain intelligence — WHOIS, DNS records, SSL certificate transparency, HTTP headers, tech stack fingerprinting, plus surveillance tracker scores and corporate ownership data.',
    href: 'https://netprobe.tunnelmind.ai',
    label: 'netprobe.tunnelmind.ai',
    tag: 'Beta',
    tagColor: '--accent-amber',
    accentVar: '--accent-amber',
    note: 'Some Explorer features not yet ported to the web version.',
  },
  {
    name: 'Surveillance Receipt',
    desc: 'Paste any domains or URLs you\'ve visited. Get a line-item invoice showing what your browsing data is worth to the surveillance economy — broken down by tracker, company, and data category. Fully local, nothing leaves your browser.',
    page: 'receipt',
    label: 'tunnelmind.ai/receipt',
    tag: 'Free · Local',
    tagColor: '--accent-green',
    accentVar: '--accent-green',
  },
  {
    name: 'Surveillance Radar',
    desc: '704 surveillance entities and 9,786 domains rendered as an interactive force-directed graph. Click any node to explore corporate ownership chains and see which actors share infrastructure.',
    href: 'https://radar.tunnelmind.ai',
    label: 'radar.tunnelmind.ai',
    tag: 'Free',
    tagColor: '--accent-green',
    accentVar: '--accent-green',
  },
]

function ToolCard({ tool, onNavigate }) {
  function handleLaunch() {
    if (tool.href) window.open(tool.href, '_blank', 'noopener')
    else if (tool.page && onNavigate) onNavigate(tool.page)
  }

  return (
    <div style={{
      padding: '24px',
      background: 'var(--chrome-bg2)',
      border: '1px solid var(--chrome-border)',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
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
          color: `var(${tool.tagColor})`,
          border: `1px solid var(${tool.tagColor})`,
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

      {tool.note && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-amber)',
          padding: '6px 8px',
          background: 'var(--accent-amber-dim)',
          borderRadius: '2px',
          border: '1px solid rgba(251,191,36,0.2)',
        }}>
          ⚠ {tool.note}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--chrome-text-dim)',
        }}>
          {tool.label}
        </span>
        <button
          onClick={handleLaunch}
          style={{
            padding: '7px 16px',
            background: `var(${tool.accentVar})`,
            border: 'none',
            borderRadius: '3px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 600,
            color: '#0f172a',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Launch ↗
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
          ● Free Tools
        </div>

        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 400,
          color: 'var(--chrome-text-bright)',
          marginBottom: '10px',
          letterSpacing: '-0.01em',
        }}>
          Surveillance intelligence tools
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          lineHeight: '1.7',
          color: 'var(--doc-text-dim)',
          marginBottom: '40px',
          maxWidth: '560px',
        }}>
          Public web tools — no account required. Powered by 53K+ tracked domains
          and 6,600+ corporate entities in the TunnelMind surveillance database.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
        }}>
          {TOOLS.map(tool => (
            <ToolCard key={tool.name} tool={tool} onNavigate={onNavigate} />
          ))}
        </div>

        <div style={{
          marginTop: '48px',
          padding: '20px 24px',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderLeft: '3px solid var(--accent-blue)',
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
              color: 'var(--accent-blue)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              Build on the data
            </div>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              color: 'var(--doc-text-dim)',
              margin: 0,
            }}>
              All tools run on the Tracker Data REST API — 50 free requests/day, CORS open, no key required.
            </p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('api')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--accent-blue)',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--accent-blue)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            API docs →
          </button>
        </div>

      </div>
    </div>
  )
}

import React from 'react'

const PAPERS = [
  {
    id: 'atap',
    title: 'ATAP — Adversarial Telemetry Attestation Protocol',
    abstract: 'A hardware-anchored chain of trust for kernel-level traffic observation. ATAP establishes device identity from enrollment through eBPF enforcement, enabling verifiable surveillance intelligence without relying on browser-level interception or DNS proxies. Covers Ed25519 attestation, WireGuard enrollment, and the identity tier model used by TunnelMind Personal.',
    date: null,
    pdf: null,
    status: 'coming-soon',
  },
]

function PaperCard({ paper }) {
  const isLive = paper.status === 'live'

  return (
    <article
      id={paper.id}
      style={{
        padding: '28px',
        background: 'var(--chrome-bg2)',
        border: '1px solid var(--chrome-border)',
        borderLeft: isLive ? '3px solid var(--accent-green)' : '3px solid var(--chrome-border)',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        opacity: isLive ? 1 : 0.7,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          fontWeight: 400,
          color: 'var(--chrome-text-bright)',
          margin: 0,
          lineHeight: '1.35',
          flex: 1,
        }}>
          {paper.title}
        </h2>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          color: isLive ? 'var(--accent-green)' : 'var(--chrome-text-dim)',
          border: `1px solid ${isLive ? 'var(--accent-green)' : 'var(--chrome-border)'}`,
          borderRadius: '2px',
          padding: '2px 6px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          marginTop: '3px',
        }}>
          {isLive ? 'Published' : 'Coming soon'}
        </span>
      </div>

      {paper.date && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--chrome-text-dim)',
        }}>
          {paper.date}
        </div>
      )}

      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '14px',
        lineHeight: '1.75',
        color: 'var(--doc-text-dim)',
        margin: 0,
      }}>
        {paper.abstract}
      </p>

      {isLive && paper.pdf && (
        <a
          href={paper.pdf}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            background: 'transparent',
            border: '1px solid var(--accent-green)',
            borderRadius: '3px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--accent-green)',
            textDecoration: 'none',
            transition: 'background var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-green-dim)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          ↓ Download PDF
        </a>
      )}
    </article>
  )
}

export default function Whitepapers() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-green)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          ● Research
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 400,
          color: 'var(--chrome-text-bright)',
          marginBottom: '10px',
        }}>
          Whitepapers
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          lineHeight: '1.7',
          color: 'var(--doc-text-dim)',
          marginBottom: '40px',
          maxWidth: '560px',
        }}>
          Technical documentation on the protocols, models, and systems that power
          TunnelMind. All papers are freely available and independently verifiable.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {PAPERS.map(paper => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
        </div>

      </div>
    </div>
  )
}

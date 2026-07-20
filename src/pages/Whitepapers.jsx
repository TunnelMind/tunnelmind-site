import React from 'react'

// The published open standards behind the trust attestation layer. Each links
// to its canonical spec page (the unified index lives at /standards).
const PAPERS = [
  {
    id: 'oai',
    title: 'OAI v1.0: Observed Actor Identifier',
    abstract: 'A permanent, free-to-resolve handle for every observed actor on the network, tracker, scanner, ad network, threat actor, or sensor. CVE-style editorial model, stable identifiers instead of vibes. Public comment.',
    href: '/oai/standard',
    status: 'live',
  },
  {
    id: 'atap',
    title: 'ATAP v0.1: Agent Trust Attestation Protocol',
    abstract: 'Capability tokens, witness chains, and signed receipts that let one agent verify another’s claims against signed evidence. Reference verifier and JSON Schemas shipped; public comment through 2026-08-12.',
    href: '/atap/standard',
    status: 'live',
  },
  {
    id: 'reconciliation-verdict',
    title: 'Reconciliation Verdict v1.0',
    abstract: 'The attestation reconciliation layer: read every root of trust (App Attest, Play Integrity, TPM, iSIM/EID, bare keys), normalize them into one comparable tier, self-asserted → software → tee-tpm → silicon-root, and emit a portable, self-verifying verdict.',
    href: '/standards/reconciliation-verdict/v1',
    status: 'live',
  },
  {
    id: 'receipt-format',
    title: 'Receipt Format v1.0',
    abstract: 'The unified, self-verifying receipt every TunnelMind verdict ships with. Open receipt-verify tooling plus a STIX/TAXII bridge so a verdict is replayable by any auditor, human or machine.',
    href: '/standards/receipt-format/v1',
    status: 'live',
  },
  {
    id: 'eat-profile',
    title: 'EAT Profile v0.1',
    abstract: 'An RFC 9711 Entity Attestation Token serialization of the receipt, for relying parties that consume standard attestation tokens rather than the native JSON receipt.',
    href: '/eat/profile/v0.1',
    status: 'live',
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
          fontSize: '16px',
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
        fontSize: '16px',
        lineHeight: '1.75',
        color: 'var(--doc-text-dim)',
        margin: 0,
      }}>
        {paper.abstract}
      </p>

      {isLive && (paper.href || paper.pdf) && (
        <a
          href={paper.href || paper.pdf}
          {...(paper.pdf && !paper.href ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
          {paper.pdf && !paper.href ? '↓ Download PDF' : 'Read the spec ↗'}
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
          fontSize: '32px',
          fontWeight: 400,
          color: 'var(--chrome-text-bright)',
          marginBottom: '10px',
        }}>
          Whitepapers
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '16px',
          lineHeight: '1.7',
          color: 'var(--doc-text-dim)',
          marginBottom: '40px',
          maxWidth: '560px',
        }}>
          The open standards behind the trust attestation layer, identity, provenance,
          and witnessability. Every spec is free, citation-grade, and independently
          verifiable. The unified index lives at{' '}
          <a href="/standards" style={{ color: 'var(--accent-green)' }}>tunnelmind.ai/standards</a>.
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

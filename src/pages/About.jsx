import React from 'react'

// /about — post-pivot (P25 Phase 2). TunnelMind is the observability
// layer for the agentic internet; this page covers the company, how the
// corpus is built, and what we deliberately do not do.

const eyebrow = (color) => ({
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  color,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  marginBottom: '12px',
})
const sectionLabel = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  color: 'var(--chrome-text-dim)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: '16px',
}
const prose = {
  fontFamily: 'var(--font-serif)',
  fontSize: '15px',
  lineHeight: '1.8',
  color: 'var(--doc-text-dim)',
  marginBottom: '14px',
}
const rule = { height: '1px', background: 'var(--chrome-border)', marginBottom: '48px' }

export default function About() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        {/* ── Mission ──────────────────────────────────────────────── */}
        <div style={eyebrow('var(--accent-green)')}>● About</div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 400,
          lineHeight: '1.25',
          color: 'var(--chrome-text-bright)',
          marginBottom: '20px',
        }}>
          The internet should be legible. We&apos;re building the layer that makes it so.
        </h1>
        <p style={{ ...prose, fontSize: '16px', maxWidth: '600px', marginBottom: '48px' }}>
          TunnelMind builds the observability layer for the agentic internet — a
          public, signed corpus of who is acting on the network and what they
          have done. When the consumers of the web are machines, identifying the
          entity behind a request stops being a nicety and becomes the question
          everything else depends on.
        </p>

        <div style={rule} />

        {/* ── Company ──────────────────────────────────────────────── */}
        <section style={{ marginBottom: '48px' }}>
          <div style={sectionLabel}>Company</div>
          <p style={prose}>
            <strong style={{ color: 'var(--chrome-text-bright)' }}>TunnelMind AI, LLC</strong> is
            based in Cabot, Arkansas. It is a single-operator project: no venture
            funding, no board, no runway clock. Growth is measured in sensors
            online, sources ingested, and standards shipped — not in burn.
          </p>
          <p style={{ ...prose, marginBottom: 0 }}>
            The order things ship in is decided by what unblocks the most
            leverage. Standards go public for comment before the code locks;
            products consume the standards rather than the reverse. The roadmap
            is published and kept current.
          </p>
        </section>

        <div style={rule} />

        {/* ── How the corpus is built ──────────────────────────────── */}
        <section style={{ marginBottom: '48px' }}>
          <div style={sectionLabel}>How the corpus is built</div>
          <p style={prose}>
            Two pipelines feed the corpus.{' '}
            <strong style={{ color: 'var(--chrome-text-bright)' }}>Familiar</strong> is a
            distributed fleet of passive sensors — each one signs every
            observation with an Ed25519 key before submitting it, so the data
            carries cryptographic proof of where it came from.{' '}
            <strong style={{ color: 'var(--chrome-text-bright)' }}>Augur</strong> is a
            continuous clearnet recon pipeline drawing on public threat feeds:
            URLhaus, ThreatFox, Tor exit lists, Spamhaus DROP, and certificate
            transparency, among others.
          </p>
          <p style={{ ...prose, marginBottom: 0 }}>
            Together they produce a record of hostile network activity — real
            source IPs, the protocols they attacked, the tools they share, the
            campaigns they cluster into. Every observation is signed at the
            source. Data that cannot prove its own provenance does not enter the
            corpus.
          </p>
        </section>

        <div style={rule} />

        {/* ── What we don't do ─────────────────────────────────────── */}
        <section>
          <div style={sectionLabel}>What we don&apos;t do</div>
          <p style={prose}>
            The corpus is built from hostile infrastructure, not from people. We
            do not collect or store personally identifying information, and we do
            not build profiles of users. Anything that analyzes a person&apos;s
            own traffic runs locally on their device — it is never transmitted to
            TunnelMind.
          </p>
          <p style={{ ...prose, marginBottom: 0 }}>
            We do not poison feeds, fabricate observations, or fight noise with
            noise. The product is honest observation: naming what is real and
            signing it so anyone can check. The radar on the front page shows a
            live public sample of the corpus, free and with no account — because
            the right to look should not be metered.
          </p>
        </section>

      </div>
    </div>
  )
}

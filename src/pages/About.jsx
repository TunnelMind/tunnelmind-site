import React from 'react'

export default function About() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        {/* ── Mission ──────────────────────────────────────────────── */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-green)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          ● Mission
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 400,
          lineHeight: '1.25',
          color: 'var(--chrome-text-bright)',
          marginBottom: '20px',
        }}>
          Work and the internet should be organized around contribution, not extraction.
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '16px',
          lineHeight: '1.8',
          color: 'var(--doc-text-dim)',
          marginBottom: '48px',
          maxWidth: '600px',
        }}>
          The surveillance economy runs on the gap between what people know and what
          companies know about them. TunnelMind exists to close that gap — with real
          signal, at the kernel level, not via browser extensions or DNS proxies.
        </p>

        <div style={{ height: '1px', background: 'var(--chrome-border)', marginBottom: '48px' }} />

        {/* ── Company ──────────────────────────────────────────────── */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            Company
          </div>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            lineHeight: '1.8',
            color: 'var(--doc-text-dim)',
            marginBottom: '14px',
          }}>
            <strong style={{ color: 'var(--chrome-text-bright)' }}>TunnelMind AI, LLC</strong> is
            based in Cabot, Arkansas. It was founded to build privacy tools that give
            individuals the same quality of surveillance intelligence that corporations
            have about them.
          </p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            lineHeight: '1.8',
            color: 'var(--doc-text-dim)',
            marginBottom: '0',
          }}>
            No venture funding. No board. The company is self-funded and structured around
            a solo founder plus a growing network of collaborators. Growth is measured in
            tools shipped and data collected — not runway.
          </p>
        </section>

        <div style={{ height: '1px', background: 'var(--chrome-border)', marginBottom: '48px' }} />

        {/* ── Data sources ─────────────────────────────────────────── */}
        <section>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            Data sources
          </div>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            lineHeight: '1.8',
            color: 'var(--doc-text-dim)',
            marginBottom: '14px',
          }}>
            The TunnelMind surveillance database (53K+ domains, 6,600+ corporate entities)
            is compiled from public DNS records, certificate transparency logs, corporate
            ownership filings, RDAP/WHOIS data, and ongoing active enumeration.
          </p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            lineHeight: '1.8',
            color: 'var(--doc-text-dim)',
            margin: 0,
          }}>
            No personally identifiable information is collected or stored.
            Traffic observed via eBPF stays on-device and is used only to generate
            your local surveillance map and dossier — it is never transmitted to
            TunnelMind servers.
          </p>
        </section>

      </div>
    </div>
  )
}

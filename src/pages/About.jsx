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

        {/* ── Team ─────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>
            Team
          </div>
          <div style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-start',
            padding: '24px',
            background: 'var(--chrome-bg2)',
            border: '1px solid var(--chrome-border)',
            borderRadius: '4px',
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              background: 'var(--accent-green-dim)',
              border: '1px solid var(--accent-green)',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '16px',
              color: 'var(--accent-green)',
              flexShrink: 0,
            }}>
              J
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--chrome-text-bright)',
                }}>
                  Josh Jacobs
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--accent-green)',
                  border: '1px solid var(--accent-green)',
                  borderRadius: '2px',
                  padding: '1px 5px',
                  opacity: 0.8,
                }}>
                  Founder
                </span>
              </div>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '14px',
                lineHeight: '1.7',
                color: 'var(--doc-text-dim)',
                margin: 0,
              }}>
                22 years enterprise network engineering. CWNE candidate. Built
                and operated production networks across financial, healthcare, and
                government sectors before turning that expertise toward surveillance
                intelligence tooling.
              </p>
            </div>
          </div>
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

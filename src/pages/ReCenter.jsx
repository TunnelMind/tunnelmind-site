import React, { useState } from 'react'

const STEPS = [
  {
    n: '01',
    label: 'Enroll',
    desc: 'Generate a WireGuard identity inside ReCenter. One click sends an enrollment request to the TunnelMind VPS — no manual config editing.',
    icon: '◈',
    color: '--accent-green',
  },
  {
    n: '02',
    label: 'Tunnel',
    desc: 'ReCenter installs and activates the WireGuard interface on your device. Traffic routes through an encrypted hub-and-spoke VPN. Hook injection (PostUp/PreDown) is sanitized and blocked.',
    icon: '⟳',
    color: '--accent-blue',
  },
  {
    n: '03',
    label: 'Map',
    desc: 'Once enrolled, eBPF observes DNS traffic at the kernel level. Open the TunnelMind desktop app to see a live surveillance map — every actor contacting your device, in real time.',
    icon: '◎',
    color: '--accent-cyan',
  },
]

const FEATURES = [
  {
    title: 'WireGuard tunnel enrollment',
    desc: 'Generates a keypair, submits an enrollment request via the TunnelMind bootstrap API, and installs the WireGuard interface — all from one UI. No wg-quick, no config files to edit manually.',
    icon: '⬡',
    color: '--accent-green',
  },
  {
    title: 'Identity management',
    desc: 'Your peer ID, device name, and peer IP are stored in ~/.tunnelmind/config.json at mode 0o600. Shared with the TunnelMind desktop app and Go CLI — all three read the same config.',
    icon: '◈',
    color: '--accent-amber',
  },
  {
    title: 'eBPF status display',
    desc: 'Shows whether the eBPF enforcement layer (Aya TC hook) is active on your enrolled device. Indicates kernel-level traffic observation status — not browser-level.',
    icon: '◉',
    color: '--accent-blue',
  },
  {
    title: 'Hook sanitization',
    desc: 'Server-provided WireGuard config is stripped of PostUp, PreUp, PostDown, and PreDown directives before installation. The server cannot execute arbitrary commands on your device.',
    icon: '⊘',
    color: '--accent-red',
  },
]

export default function ReCenter({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleWaitlist(e) {
    e.preventDefault()
    if (!email.trim()) return
    // TODO: wire to Supabase waitlist table when Phase 2 is live
    setSubmitted(true)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '56px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--accent-blue)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            ● ReCenter — Desktop App
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(26px, 5vw, 42px)',
            fontWeight: 400,
            lineHeight: '1.2',
            color: 'var(--chrome-text-bright)',
            marginBottom: '18px',
          }}>
            Reset your online presence.
          </h1>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '16px',
            lineHeight: '1.75',
            color: 'var(--doc-text-dim)',
            maxWidth: '580px',
            marginBottom: '32px',
          }}>
            ReCenter is a native desktop app that enrolls your device into the TunnelMind
            network — establishing a WireGuard tunnel, managing your identity, and surfacing
            eBPF enforcement status. Small, standalone, no Electron.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '6px 12px',
              background: 'var(--accent-blue-dim, rgba(96,165,250,0.12))',
              border: '1px solid var(--accent-blue)',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--accent-blue)',
            }}>
              Linux · macOS · Windows
            </span>
            <span style={{
              padding: '6px 12px',
              background: 'var(--chrome-bg2)',
              border: '1px solid var(--chrome-border)',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
            }}>
              Rust · egui · 360×480px
            </span>
          </div>
        </div>

        {/* ── What it does ─────────────────────────────────────────── */}
        <section style={{ marginBottom: '56px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>
            What it does
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
          }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                padding: '20px',
                background: 'var(--chrome-bg2)',
                border: '1px solid var(--chrome-border)',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '16px',
                    color: `var(${f.color})`,
                  }}>
                    {f.icon}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--chrome-text-bright)',
                  }}>
                    {f.title}
                  </span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '13px',
                  lineHeight: '1.65',
                  color: 'var(--doc-text-dim)',
                  margin: 0,
                }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section style={{ marginBottom: '56px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '24px',
          }}>
            How it works
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0',
            position: 'relative',
          }}>
            {STEPS.map((step, i) => (
              <div key={step.n} style={{
                padding: '24px',
                background: 'var(--chrome-bg2)',
                borderTop: '1px solid var(--chrome-border)',
                borderBottom: '1px solid var(--chrome-border)',
                borderLeft: '1px solid var(--chrome-border)',
                borderRight: i === STEPS.length - 1 ? '1px solid var(--chrome-border)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: `var(${step.color})`,
                    fontWeight: 700,
                  }}>
                    {step.n}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '18px',
                    color: `var(${step.color})`,
                  }}>
                    {step.icon}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--chrome-text-bright)',
                  }}>
                    {step.label}
                  </span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '13px',
                  lineHeight: '1.65',
                  color: 'var(--doc-text-dim)',
                  margin: 0,
                }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Technical foundation ─────────────────────────────────── */}
        <section style={{
          marginBottom: '56px',
          padding: '24px',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderLeft: '3px solid var(--accent-purple)',
          borderRadius: '4px',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--accent-purple)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '10px',
          }}>
            Technical foundation
          </div>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '14px',
            lineHeight: '1.7',
            color: 'var(--doc-text-dim)',
            margin: 0,
          }}>
            ReCenter's identity layer is built on ATAP — the Adversarial Telemetry Attestation
            Protocol. ATAP establishes a hardware-anchored chain of trust from device identity
            through enrollment to kernel-level traffic observation. The same attestation chain
            powers TunnelMind Personal tier features.{' '}
            <span
              onClick={() => onNavigate && onNavigate('whitepapers')}
              style={{ color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Read the ATAP whitepaper →
            </span>
          </p>
        </section>

        {/* ── Waitlist CTA ─────────────────────────────────────────── */}
        <section style={{
          padding: '32px',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderRadius: '4px',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--accent-green)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '12px',
          }}>
            Early access
          </div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '22px',
            fontWeight: 400,
            color: 'var(--chrome-text-bright)',
            marginBottom: '10px',
          }}>
            Join the waitlist
          </h2>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '14px',
            lineHeight: '1.65',
            color: 'var(--doc-text-dim)',
            marginBottom: '24px',
            maxWidth: '460px',
            margin: '0 auto 24px',
          }}>
            ReCenter builds are available for enrolled beta testers. We'll notify you when
            public downloads open.
          </p>

          {submitted ? (
            <div style={{
              padding: '12px 20px',
              background: 'var(--accent-green-dim)',
              border: '1px solid var(--accent-green)',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--accent-green)',
              display: 'inline-block',
            }}>
              ✓ You're on the list. We'll be in touch.
            </div>
          ) : (
            <form onSubmit={handleWaitlist} style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  padding: '9px 14px',
                  background: 'var(--chrome-bg)',
                  border: '1px solid var(--chrome-border)',
                  borderRadius: '3px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--chrome-text-bright)',
                  width: '240px',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                onBlur={e => e.target.style.borderColor = 'var(--chrome-border)'}
              />
              <button
                type="submit"
                style={{
                  padding: '9px 20px',
                  background: 'var(--accent-green)',
                  border: 'none',
                  borderRadius: '3px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                Join waitlist
              </button>
            </form>
          )}
        </section>

      </div>
    </div>
  )
}

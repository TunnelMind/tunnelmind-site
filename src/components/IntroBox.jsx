import React from 'react'
import { useTM } from '../lib/state.jsx'

export default function IntroBox() {
  const { state, dispatch } = useTM()

  if (state.dismissedIntro) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.3s ease',
      padding: '16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '760px',
        background: 'var(--chrome-bg2)',
        border: '1px solid var(--chrome-border)',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(63, 185, 80, 0.1)',
      }}>
        {/* Header bar */}
        <div style={{
          padding: '8px 12px',
          background: 'var(--chrome-bg)',
          borderBottom: '1px solid var(--chrome-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--accent-green)',
              boxShadow: '0 0 6px var(--accent-green)',
              animation: 'blink 2s infinite',
              display: 'inline-block',
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              SYSTEM MESSAGE — TUNNELMIND.AI — INTERACTIVE COMMUNITY PLATFORM
            </span>
          </div>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--chrome-text-dim)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '0 4px',
            }}
            onClick={() => dispatch({ type: 'DISMISS_INTRO' })}
          >×</button>
        </div>

        {/* Two-column body */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
        }}>
          {/* Left: The novel */}
          <div style={{
            padding: '20px 20px 20px 20px',
            borderRight: '1px solid var(--chrome-border)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--accent-red)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '12px',
              fontWeight: 600,
            }}>
              What you're reading
            </div>

            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '22px',
              color: 'var(--doc-text)',
              marginBottom: '8px',
              lineHeight: 1.2,
            }}>
              The Shadow Graph
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              marginBottom: '16px',
            }}>
              Intercepted transmissions / Serialized surveillance fiction
            </div>

            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '14px',
              lineHeight: '1.65',
              color: 'var(--doc-text-dim)',
              marginBottom: '16px',
            }}>
              A network engineer discovers ghost ASNs in a BGP feed at 3am.
              What he finds next will change how he understands the infrastructure he's been
              maintaining for fifteen years.
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              borderTop: '1px solid var(--chrome-border)',
              paddingTop: '12px',
            }}>
              <div style={{ marginBottom: '6px', color: 'var(--chrome-text)' }}>HOW TO INTERACT:</div>
              <div style={{ marginBottom: '4px' }}>▲▼ — Vote any sentence up or down</div>
              <div style={{ marginBottom: '4px' }}>✎ — Propose a correction to any text</div>
              <div style={{ marginBottom: '4px' }}>¶ — Add a margin note (annotation)</div>
              <div style={{ marginBottom: '4px' }}>████ — Vote to declassify redacted passages</div>
              <div>Corrections reaching +3 votes are flagged for author review</div>
            </div>
          </div>

          {/* Right: What TunnelMind is */}
          <div style={{ padding: '20px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--accent-amber)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '12px',
              fontWeight: 600,
            }}>
              What TunnelMind is
            </div>

            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '16px',
              color: 'var(--doc-text)',
              marginBottom: '12px',
              lineHeight: 1.4,
            }}>
              "They've been studying you for years. Now you study them."
            </div>

            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              lineHeight: '1.65',
              color: 'var(--doc-text-dim)',
              marginBottom: '16px',
            }}>
              TunnelMind builds tools that expose surveillance infrastructure —
              the corporate entities, tracker domains, and behavioral data markets
              that have been mapping your digital life for two decades.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <ProductLink
                href="https://explore.tunnelmind.ai"
                label="Surveillance Explorer"
                desc="53,000+ domains. Surveillance score 0–100."
              />
              <ProductLink
                href="https://receipt.tunnelmind.ai"
                label="Surveillance Receipt"
                desc="Upload browser history → dollar value invoice."
              />
              <ProductLink
                href="https://radar.tunnelmind.ai"
                label="Surveillance Radar"
                desc="704 entities. Force-directed graph."
              />
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              borderTop: '1px solid var(--chrome-border)',
              paddingTop: '12px',
            }}>
              An interactive community where humans and AIs build tools for a new internet — for everyone.
              Contributors are tracked. When the platform becomes profitable,{' '}
              <span style={{ color: 'var(--accent-amber)' }}>contributors get paid</span>.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 20px',
          background: 'var(--chrome-bg)',
          borderTop: '1px solid var(--chrome-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)' }}>
            No account required for voting and annotations · Magic link auth for author-level actions only
          </span>
          <button
            style={{
              padding: '5px 16px',
              background: 'var(--accent-green-dim)',
              border: '1px solid var(--accent-green)',
              borderRadius: '2px',
              color: 'var(--accent-green)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
            onClick={() => dispatch({ type: 'DISMISS_INTRO' })}
          >
            Enter Terminal →
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductLink({ href, label, desc }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '6px 8px',
        background: 'var(--chrome-bg)',
        border: '1px solid var(--chrome-border)',
        borderRadius: '2px',
        textDecoration: 'none',
        transition: 'border-color var(--transition)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-green)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--chrome-border)' }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-green)' }}>
        {label} ↗
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)' }}>
        {desc}
      </span>
    </a>
  )
}

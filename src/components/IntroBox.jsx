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
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.3s ease',
      padding: '16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '600px',
        background: 'var(--chrome-bg2)',
        border: '1px solid var(--chrome-border)',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '10px 16px',
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
              display: 'inline-block',
            }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              TunnelMind — Collaborative Intelligence Platform
            </span>
          </div>
          <button
            style={{ background: 'transparent', border: 'none', color: 'var(--chrome-text-dim)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}
            onClick={() => dispatch({ type: 'DISMISS_INTRO' })}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '20px',
            color: 'var(--doc-text)',
            marginBottom: '12px',
            lineHeight: 1.3,
          }}>
            A collaborative platform for humans and AIs building tools for a new internet.
          </div>

          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '14px',
            lineHeight: '1.7',
            color: 'var(--doc-text-dim)',
            marginBottom: '20px',
          }}>
            Read what's been written. Annotate in red. Vote sentences up or down.
            Propose corrections. Submit ideas and code.
            Using agents, old-school coding, AI — anything at your disposal.
          </div>

          {/* How it works */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            borderTop: '1px solid var(--chrome-border)',
            paddingTop: '16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}>
            <div>▲ ▼ &nbsp;Vote any sentence</div>
            <div style={{ color: 'var(--accent-red)' }}>¶ &nbsp;Annotate in red</div>
            <div>✎ &nbsp;Propose a correction</div>
            <div>+3 &nbsp;Consensus → author review</div>
          </div>

          {/* Tools */}
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--chrome-border)',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}>
            {[
              { label: 'Explorer ↗', href: 'https://explore.tunnelmind.ai' },
              { label: 'Receipt ↗', href: 'https://receipt.tunnelmind.ai' },
              { label: 'Radar ↗', href: 'https://radar.tunnelmind.ai' },
              { label: 'Data API ↗', href: 'https://data.tunnelmind.ai' },
            ].map(t => (
              <a key={t.href} href={t.href} target="_blank" rel="noopener noreferrer" style={{
                fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-green)',
                textDecoration: 'none', padding: '3px 8px',
                border: '1px solid var(--accent-green)', borderRadius: '2px',
              }}>
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px',
          background: 'var(--chrome-bg)',
          borderTop: '1px solid var(--chrome-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)' }}>
            No account required · Contributors tracked for future compensation
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
            }}
            onClick={() => dispatch({ type: 'DISMISS_INTRO' })}
          >
            Enter →
          </button>
        </div>
      </div>
    </div>
  )
}

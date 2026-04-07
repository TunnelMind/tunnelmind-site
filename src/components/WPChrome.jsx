import React from 'react'
import { useTM } from '../lib/state.jsx'

// WP 5.1-inspired chrome: menu bar + ruler + status bar
// Re-skinned for dark terminal surveillance aesthetic

export function MenuBar({ currentPage, onNavigate }) {
  return null // integrated into SubredditNav
}

export function Ruler({ page, classification }) {
  const ticks = Array.from({ length: 72 }, (_, i) => i)

  return (
    <div style={{
      height: 'var(--ruler-height)',
      background: 'var(--chrome-bg)',
      borderBottom: '1px solid var(--chrome-border)',
      display: 'flex',
      alignItems: 'flex-end',
      paddingBottom: '2px',
      paddingLeft: '8px',
      paddingRight: '8px',
      overflow: 'hidden',
      userSelect: 'none',
      position: 'relative',
    }}>
      {/* Tick marks — WP ruler DNA */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 0,
        height: '100%',
        flex: 1,
      }}>
        {ticks.map(i => (
          <div key={i} style={{
            width: '10px',
            height: i % 10 === 0 ? '10px' : i % 5 === 0 ? '6px' : '3px',
            borderLeft: '1px solid',
            borderColor: i % 10 === 0
              ? 'var(--chrome-text-dim)'
              : i % 5 === 0
                ? 'var(--chrome-border)'
                : 'var(--chrome-bg2)',
            flexShrink: 0,
          }} />
        ))}
      </div>

      {/* Classification stamp — right side of ruler */}
      {classification && (
        <div style={{
          position: 'absolute',
          right: '8px',
          bottom: '3px',
          fontSize: '8px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-red)',
          letterSpacing: '0.08em',
          fontWeight: 600,
          opacity: 0.8,
        }}>
          {classification}
        </div>
      )}
    </div>
  )
}

export function StatusBar({ page }) {
  const { state } = useTM()

  const totalAnnotations = Object.values(state.annotations).reduce(
    (sum, list) => sum + (list?.length || 0), 0
  )
  const totalVotes = Object.values(state.sentenceVotes).reduce(
    (sum, v) => sum + (v?.up || 0) + (v?.down || 0), 0
  )
  const totalCorrections = Object.values(state.corrections).reduce(
    (sum, list) => sum + (list?.length || 0), 0
  )

  // Simulated active contributors (Phase 2: realtime)
  const simulatedOnline = 1 + Math.floor(Math.random() * 3) // 1-3

  const pageMap = {
    dialog: 'THE SHADOW GRAPH',
    products: 'PRODUCTS',
    roadmap: 'ROADMAP',
    contributors: 'CONTRIBUTORS',
    about: 'ABOUT',
  }

  return (
    <div style={{
      height: 'var(--status-height)',
      background: 'var(--chrome-bg)',
      borderTop: '1px solid var(--chrome-border)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '8px',
      paddingRight: '8px',
      gap: '0',
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
      color: 'var(--chrome-text-dim)',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <StatusCell label="DOC" value={pageMap[page] || page?.toUpperCase()} />
      <StatusDivider />
      <StatusCell label="ANNOTATIONS" value={totalAnnotations} />
      <StatusDivider />
      <StatusCell label="CORRECTIONS" value={totalCorrections} />
      <StatusDivider />
      <StatusCell label="VOTES" value={totalVotes} />
      <StatusDivider />
      <StatusCell
        label="ONLINE"
        value={`${simulatedOnline} contributor${simulatedOnline !== 1 ? 's' : ''}`}
        valueColor="var(--accent-green)"
      />
      <StatusDivider />
      <StatusCell
        label="MODE"
        value={state.authorMode ? 'AUTHOR' : 'READER'}
        valueColor={state.authorMode ? 'var(--accent-purple)' : undefined}
      />

      {/* WP cursor-style position indicator — far right */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
        <StatusCell label="Ln" value="—" />
        <StatusCell label="Col" value="—" />
        <StatusCell label="TunnelMind" value="v1.0" valueColor="var(--accent-green)" />
      </div>
    </div>
  )
}

function StatusCell({ label, value, valueColor }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '0 8px',
    }}>
      <span style={{ color: 'var(--chrome-text-dim)', fontSize: '8px' }}>{label}:</span>
      <span style={{ color: valueColor || 'var(--chrome-text-bright)', fontSize: '9px' }}>
        {value}
      </span>
    </div>
  )
}

function StatusDivider() {
  return (
    <div style={{
      width: '1px',
      height: '12px',
      background: 'var(--chrome-border)',
    }} />
  )
}

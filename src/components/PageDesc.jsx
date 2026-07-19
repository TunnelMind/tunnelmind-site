import React from 'react'

export default function PageDesc({ title, desc }) {
  return (
    <div style={{
      borderBottom: '1px solid var(--chrome-border)',
      padding: '12px 32px',
      display: 'flex',
      alignItems: 'baseline',
      gap: '16px',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--accent-green)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        margin: 0,
      }}>
        {title}
      </h1>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--chrome-text-bright)',
        lineHeight: '1.5',
      }}>
        {desc}
      </span>
    </div>
  )
}

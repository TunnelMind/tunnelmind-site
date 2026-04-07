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
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--accent-green)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {title}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--chrome-text-bright)',
        lineHeight: '1.5',
      }}>
        {desc}
      </span>
    </div>
  )
}

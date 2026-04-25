import React from 'react'

const S = {
  wrap: { flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' },
  inner: { maxWidth: '720px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' },
  eyebrow: { fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-green)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '12px' },
  h1: { fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 400, lineHeight: '1.25', color: 'var(--chrome-text-bright)', marginBottom: '8px' },
  meta: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--chrome-text-dim)', marginBottom: '40px' },
  divider: { height: '1px', background: 'var(--chrome-border)', margin: '40px 0' },
  h2: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-green)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px', marginTop: '0' },
  p: { fontFamily: 'var(--font-serif)', fontSize: '15px', lineHeight: '1.8', color: 'var(--doc-text-dim)', marginBottom: '18px' },
  ul: { fontFamily: 'var(--font-serif)', fontSize: '15px', lineHeight: '1.8', color: 'var(--doc-text-dim)', marginBottom: '18px', paddingLeft: '20px' },
  section: { marginBottom: '40px' },
  contact: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--chrome-text-dim)', background: 'var(--chrome-bg)', border: '1px solid var(--chrome-border)', padding: '16px', marginTop: '40px' },
}

export function LegalPage({ eyebrow, title, effective, children }) {
  return (
    <div style={S.wrap}>
      <div style={S.inner}>
        <div style={S.eyebrow}>{eyebrow}</div>
        <h1 style={S.h1}>{title}</h1>
        <div style={S.meta}>Effective {effective} · TunnelMind AI, LLC · legal@tunnelmind.ai</div>
        <div style={S.divider} />
        {children}
      </div>
    </div>
  )
}

export function Section({ title, children }) {
  return (
    <div style={S.section}>
      <h2 style={S.h2}>{title}</h2>
      {children}
    </div>
  )
}

export function P({ children }) { return <p style={S.p}>{children}</p> }
export function UL({ items }) {
  return <ul style={S.ul}>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
}
export function Divider() { return <div style={S.divider} /> }
export function ContactBox({ children }) { return <div style={S.contact}>{children}</div> }

// TODO(alloy-migration): moved to alloy.tunnelmind.ai/graph
import React from 'react'
import { Ruler } from '../components/WPChrome.jsx'

export default function Roadmap() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="roadmap" />
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '64px 32px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-green)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>Moved</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 400, color: 'var(--doc-text)', marginBottom: '16px', lineHeight: 1.3 }}>The roadmap has moved to Alloy.</h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--doc-text-dim)', lineHeight: 1.7, marginBottom: '32px' }}>Vote priorities, annotate timelines, and propose corrections — all tracked in the contribution ledger.</p>
        <a href="https://alloy.tunnelmind.ai/#/graph" style={{ display: 'inline-block', padding: '10px 28px', background: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '3px', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em', textDecoration: 'none' }}>
          Open Graph at alloy.tunnelmind.ai →
        </a>
      </div>
    </div>
  )
}

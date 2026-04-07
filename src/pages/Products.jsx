import React from 'react'
import { Ruler } from '../components/WPChrome.jsx'
import DocumentEditor from '../components/DocumentEditor.jsx'
import PageDesc from '../components/PageDesc.jsx'

const LIVE_TOOLS = [
  {
    name: 'Surveillance Explorer',
    desc: '53,000+ tracker domains with surveillance scores 0–100, corporate ownership trees, and shareable URLs.',
    url: 'https://explore.tunnelmind.ai',
    label: 'explore.tunnelmind.ai',
    tag: 'Live · Free',
  },
  {
    name: 'Surveillance Receipt',
    desc: 'Upload your browser history and get a dollar-value invoice showing what your behavioral data is worth. 100% client-side.',
    url: 'https://receipt.tunnelmind.ai',
    label: 'receipt.tunnelmind.ai',
    tag: 'Live · Free · No upload',
  },
  {
    name: 'Surveillance Radar',
    desc: '704 surveillance entities and 9,786 domains rendered as an interactive force-directed graph.',
    url: 'https://radar.tunnelmind.ai',
    label: 'radar.tunnelmind.ai',
    tag: 'Live · Free',
  },
  {
    name: 'Tracker Data API',
    desc: 'REST API with 50 free requests/day, CORS open, no key required. The dataset powering all TunnelMind tools.',
    url: 'https://data.tunnelmind.ai',
    label: 'data.tunnelmind.ai',
    tag: 'Live · 50 req/day free',
  },
]

function ProductCard({ tool }) {
  return (
    <a
      href={tool.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        background: 'var(--chrome-bg2)',
        border: '1px solid var(--chrome-border)',
        borderRadius: '3px',
        textDecoration: 'none',
        transition: 'border-color 150ms ease, background 150ms ease',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent-green)'
        e.currentTarget.style.background = 'var(--doc-paper)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--chrome-border)'
        e.currentTarget.style.background = 'var(--chrome-bg2)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--chrome-text-bright)',
        }}>
          {tool.name}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          color: 'var(--accent-green)',
          border: '1px solid var(--accent-green)',
          borderRadius: '2px',
          padding: '1px 5px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {tool.tag}
        </span>
      </div>

      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '13px',
        lineHeight: '1.6',
        color: 'var(--doc-text-dim)',
        margin: 0,
      }}>
        {tool.desc}
      </p>

      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--accent-blue)',
        marginTop: 'auto',
      }}>
        {tool.label} ↗
      </span>
    </a>
  )
}

export default function Products() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="products" />
      <PageDesc
        title="t/products"
        desc="Tools we've built and what's in development. Free tools live at explore, receipt, radar, and data.tunnelmind.ai — no account required."
      />

      {/* Product cards */}
      <div style={{ padding: '24px 32px 0', maxWidth: '960px', margin: '0 auto' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-green)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          ● Live Now
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          marginBottom: '32px',
        }}>
          {LIVE_TOOLS.map(tool => (
            <ProductCard key={tool.url} tool={tool} />
          ))}
        </div>

        <div style={{ height: '1px', background: 'var(--chrome-border)', marginBottom: '0' }} />
      </div>

      {/* Author-written content below */}
      <DocumentEditor pageId="products" />
    </div>
  )
}

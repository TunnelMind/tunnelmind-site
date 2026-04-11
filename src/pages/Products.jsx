import React from 'react'
import { Ruler } from '../components/WPChrome.jsx'
import DocumentEditor from '../components/DocumentEditor.jsx'
import PageDesc from '../components/PageDesc.jsx'

const LIVE_TOOLS = [
  {
    name: 'Surveillance Receipt',
    desc: 'Paste any domains or URLs you\'ve visited. Get a line-item invoice showing what your browsing data is worth to the surveillance economy — broken down by tracker, company, and data category. Fully local, nothing leaves your browser. If you have the TunnelMind extension installed, it auto-loads your real session.',
    url: '/#/receipt',
    label: 'tunnelmind.ai/receipt',
    tag: 'Live · Free · Local',
  },
  {
    name: 'Surveillance Explorer',
    desc: '53,000+ tracker domains with surveillance scores 0–100, corporate ownership trees, and shareable URLs.',
    url: 'https://explore.tunnelmind.ai',
    label: 'explore.tunnelmind.ai',
    tag: 'Live · Free',
  },
  {
    name: 'Surveillance Radar',
    desc: '704 surveillance entities and 9,786 domains rendered as an interactive force-directed graph. Click any node to explore corporate ownership chains.',
    url: 'https://radar.tunnelmind.ai',
    label: 'radar.tunnelmind.ai',
    tag: 'Live · Free',
  },
  {
    name: 'Tracker Data API',
    desc: 'REST API with 50 free requests/day, CORS open, no key required. The dataset powering all TunnelMind tools — domains, entities, scores, ownership.',
    url: 'https://data.tunnelmind.ai',
    label: 'data.tunnelmind.ai',
    tag: 'Live · 50 req/day free',
  },
  {
    name: 'Receipt Verification',
    desc: 'Independently verify any TunnelMind Surveillance Receipt. Submit a receipt_id to confirm it was signed by TunnelMind and the content has not been tampered with.',
    url: 'https://data.tunnelmind.ai/verify/',
    label: 'data.tunnelmind.ai/verify/',
    tag: 'Live · Free · Public',
  },
  {
    name: 'GhostRoute Certificate Verification',
    desc: 'Independently verify any GhostRoute Jurisdictional Routing Certificate. Submit a certificate_id to confirm it was signed by TunnelMind and the jurisdiction data has not been tampered with. POST /ghostroute/verify with certificate_id, content_hash, and signature.',
    url: 'https://data.tunnelmind.ai/ghostroute/verify',
    label: 'data.tunnelmind.ai/ghostroute/verify',
    tag: 'Live · Free · Public',
  },
  {
    name: 'Browser Extension',
    desc: 'Passive tracker interception as you browse — no proxy, no DNS redirect. Every third-party request is matched against 9,786 known surveillance domains. Real-time popup shows who\'s watching and what your session is worth. One-click access to the live surveillance map. Firefox + Chrome.',
    url: 'https://addons.mozilla.org/firefox/addon/tunnelmind-surveillance-receipt/',
    label: 'Firefox · Chrome Web Store',
    tag: 'Pending Review',
  },
]

const PERSONAL_TOOLS = [
  {
    name: 'Surveillance Map',
    desc: 'Live force-directed graph of every surveillance actor that has contacted your device — built from eBPF DNS telemetry at the kernel level, not browser-level interception. Nodes are color-coded by category (ad tech, data broker, analytics, CDN). Click any node for corporate ownership, contact frequency, and data categories. Updates in real time as traffic flows.',
    tag: 'Personal · Enrolled',
  },
  {
    name: 'Surveillance Dossier Receipt',
    desc: 'A cryptographically signed document proving what the surveillance ecosystem knows about you, what your data is worth, and which jurisdictions it flows through. Signed with Ed25519, verifiable at data.tunnelmind.ai. Includes a one-click generator for GDPR Art. 15 / CCPA §1798.100 legal letters to every actor that touched you.',
    tag: 'Personal · Enrolled',
  },
  {
    name: 'Resonance',
    desc: 'Detects which surveillance actors are coordinating with each other through your traffic — purely from beacon timing patterns. When DoubleClick fires and LiveRamp fires 87ms later, every time, that\'s not a coincidence. Resonance builds a cross-actor coordination graph showing who\'s talking to whom about you, with Pearson correlation, lag times, and cluster analysis.',
    tag: 'Personal · Enrolled',
  },
  {
    name: 'GhostRoute',
    desc: 'Generates a cryptographically signed certificate proving which legal jurisdictions your DNS traffic traversed — EU GDPR-adequate zones, FISA 702 reach, Five Eyes, China, Russia. Weighted by traffic volume so high-frequency domains count more. Verdicts: COMPLIANT | PARTIAL | NON_COMPLIANT. Each certificate includes GDPR Art. 44 legal citations and an Ed25519 signature verifiable by any third party at data.tunnelmind.ai. Built for DPOs, legal teams, and anyone who needs to prove where their data actually went.',
    tag: 'Personal · New',
  },
  {
    name: 'Dark Mirror',
    desc: 'What advertisers believe they know about you. Inferred from every surveillance actor observed contacting your device: age range, income bracket, health signals, political targeting exposure, purchase intent. The profile being bought and sold about you, made visible.',
    tag: 'Personal · Enrolled',
  },
  {
    name: 'Cost of You',
    desc: 'Real-time dollar valuation of your data profile. Every actor that contacted your device contributes an estimated annual data value based on their CPM rates and your inferred demographic. Broken down by category: who is extracting the most, and what they\'re getting paid for it.',
    tag: 'Personal · Enrolled',
  },
]

function TagColor(tag) {
  if (tag.includes('New'))      return '#00d4a8'
  if (tag.includes('Personal')) return 'var(--accent-blue)'
  return 'var(--accent-green)'
}

function ProductCard({ tool }) {
  const isLink = !!tool.url
  const El = isLink ? 'a' : 'div'
  const linkProps = isLink ? { href: tool.url, target: '_blank', rel: 'noopener noreferrer' } : {}
  const tagColor = TagColor(tool.tag)

  return (
    <El
      {...linkProps}
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
        cursor: isLink ? 'pointer' : 'default',
      }}
      onMouseEnter={isLink ? e => {
        e.currentTarget.style.borderColor = tagColor
        e.currentTarget.style.background = 'var(--doc-paper)'
      } : undefined}
      onMouseLeave={isLink ? e => {
        e.currentTarget.style.borderColor = 'var(--chrome-border)'
        e.currentTarget.style.background = 'var(--chrome-bg2)'
      } : undefined}
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
          color: tagColor,
          border: `1px solid ${tagColor}`,
          borderRadius: '2px',
          padding: '1px 5px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          opacity: 0.85,
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

      {tool.label && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-blue)',
          marginTop: 'auto',
        }}>
          {tool.label} ↗
        </span>
      )}
    </El>
  )
}

export default function Products() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="products" />
      <PageDesc
        title="t/products"
        desc="Tools we've built. Public web tools require no account. Personal features require an enrolled TunnelMind device — traffic observed at the kernel level, not via browser extension."
      />

      {/* Product cards */}
      <div style={{ padding: '24px 32px 0', maxWidth: '960px', margin: '0 auto' }}>

        {/* Public web tools */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-green)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          ● Public Web Tools
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

        {/* Personal tier */}
        <div style={{ height: '1px', background: 'var(--chrome-border)', marginBottom: '24px' }} />
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-blue)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          ◎ TunnelMind Personal — Enrolled Device Features
        </div>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '12px',
          color: 'var(--doc-text-dim)',
          marginBottom: '14px',
          lineHeight: '1.6',
        }}>
          These features require a TunnelMind-enrolled device (VPN peer). Traffic is observed at the kernel level via eBPF — not via a browser extension or proxy. The signal is real.
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          marginBottom: '32px',
        }}>
          {PERSONAL_TOOLS.map(tool => (
            <ProductCard key={tool.name} tool={tool} />
          ))}
        </div>

        <div style={{ height: '1px', background: 'var(--chrome-border)', marginBottom: '0' }} />
      </div>

      {/* Author-written content below */}
      <DocumentEditor pageId="products" />
    </div>
  )
}

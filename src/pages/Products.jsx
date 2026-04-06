import React from 'react'
import InteractiveSentence from '../components/InteractiveSentence.jsx'
import { Ruler } from '../components/WPChrome.jsx'

// Structured product content — all text runs through InteractiveSentence
const PRODUCTS = {
  live: [
    {
      key: 'explorer',
      name: 'Surveillance Explorer',
      status: 'LIVE',
      statusColor: 'var(--accent-green)',
      url: 'https://explore.tunnelmind.ai',
      urlLabel: 'explore.tunnelmind.ai',
      tag: 'Free · No account',
      sentences: [
        { key: 's1', text: 'Search 53,000+ tracker domains with a surveillance score from 0 (minimal) to 100 (pervasive) based on behavioral tracking, fingerprinting, and data broker relationships.' },
        { key: 's2', text: 'Each domain surfaces its corporate ownership tree — revealing how a single ad-tech holding company can operate hundreds of tracking domains under different brand names.' },
        { key: 's3', text: 'Shareable URLs make every result a citation you can send to a privacy-curious colleague or include in a compliance report.' },
        { key: 's4', text: 'Built on three data sources: DuckDuckGo Tracker Radar, IAB TCF vendor registry, and Disconnect.me — updated weekly.' },
      ],
    },
    {
      key: 'receipt',
      name: 'Surveillance Receipt',
      status: 'LIVE',
      statusColor: 'var(--accent-green)',
      url: 'https://receipt.tunnelmind.ai',
      urlLabel: 'receipt.tunnelmind.ai',
      tag: 'Free · Client-side · Chrome / Firefox / Safari',
      sentences: [
        { key: 's1', text: 'Export your browser history from Chrome, Firefox, or Safari and upload it to receive a formatted dollar-value invoice showing what your behavioral data is worth on the surveillance economy.' },
        { key: 's2', text: '100% client-side processing — your browsing history never leaves your machine, never touches a server, and is discarded the moment you close the tab.' },
        { key: 's3', text: 'The valuation model is based on published data broker pricing, CPM rates for behavioral targeting segments, and documented identity graph prices.' },
        { key: 's4', text: 'The receipt format is designed to be shareable — send it to your family, post it in a Slack channel, or present it at a board meeting as a concrete illustration of personal data exposure.' },
      ],
    },
    {
      key: 'radar',
      name: 'Surveillance Radar',
      status: 'LIVE',
      statusColor: 'var(--accent-green)',
      url: 'https://radar.tunnelmind.ai',
      urlLabel: 'radar.tunnelmind.ai',
      tag: 'Free · No account · Live graph',
      sentences: [
        { key: 's1', text: '704 surveillance entities and 9,786 associated domains rendered as an interactive force-directed graph — the structural map of who owns what in the commercial surveillance ecosystem.' },
        { key: 's2', text: 'Nodes cluster by corporate family: hover any entity to see its domain portfolio, ownership chain, and connection to other surveillance actors.' },
        { key: 's3', text: 'Filter by category (ad networks, data brokers, analytics platforms, CDNs, identity verification) to trace specific threat classes through the graph.' },
        { key: 's4', text: 'The dataset is derived from IAB TCF registered vendors and cross-referenced with WHOIS, corporate registration records, and known acquisition histories.' },
      ],
    },
    {
      key: 'api',
      name: 'Tracker Data API',
      status: 'LIVE',
      statusColor: 'var(--accent-green)',
      url: 'https://data.tunnelmind.ai',
      urlLabel: 'data.tunnelmind.ai',
      tag: '50 req/day free · CORS open · Pro/Enterprise tiers',
      sentences: [
        { key: 's1', text: 'REST API giving programmatic access to the full 53,000+ domain surveillance dataset with scores, categories, ownership data, and entity relationships.' },
        { key: 's2', text: 'CORS is open on the free tier — build a browser extension, a content blocker UI, or a compliance dashboard without a backend proxy.' },
        { key: 's3', text: 'The free tier requires no API key for the first 50 requests per day from a given IP; Pro and Enterprise tiers add higher rate limits, bulk endpoints, and webhook support for dataset updates.' },
        { key: 's4', text: 'The API is the foundation layer for all TunnelMind products — every tool we build runs on the same dataset we expose to developers.' },
      ],
    },
  ],
  development: [
    {
      key: 'personal',
      name: 'TunnelMind Personal',
      status: 'ALPHA',
      statusColor: 'var(--accent-amber)',
      tag: 'In Development',
      sentences: [
        { key: 's1', text: 'A local-first surveillance intelligence platform that runs entirely on your machine — WireGuard-secured tunnel, eBPF kernel enforcement, DNS sinkhole, and a local Mistral 7B LLM for adversarial analysis.' },
        { key: 's2', text: 'The real-time surveillance graph shows every network connection your devices make, scored against the tracker database, mapped to corporate entities, and timestamped for playback.' },
        { key: 's3', text: 'The Dark Mirror feature builds a model of your digital behavioral profile — the same one surveillance actors already have — so you can see what they see and understand what they infer.' },
        { key: 's4', text: 'Eleven MCP tools expose the surveillance intelligence layer to any AI agent you authorize — query your behavioral data, request domain analysis, or run pattern-of-life detection against your own traffic.' },
        { key: 's5', text: 'All inference runs locally; no behavioral data is ever transmitted to cloud LLM providers.' },
      ],
    },
    {
      key: 'enterprise',
      name: 'TunnelMind Enterprise',
      status: 'DESIGN',
      statusColor: 'var(--chrome-text-dim)',
      tag: 'In Development',
      sentences: [
        { key: 's1', text: 'A CISO/DPO compliance platform built on TunnelMind\'s behavioral attestation infrastructure, designed for organizations that need auditable records of what surveillance actors have access to their employees\' data.' },
        { key: 's2', text: 'ATAP (Agent Trust Attestation Protocol) generates cryptographically signed behavioral attestation certificates that can be included in vendor compliance packages, regulatory submissions, and contract negotiations.' },
        { key: 's3', text: 'LDevID certificates provide hardware-rooted identity for enrolled devices, enabling organizations to prove the provenance of behavioral measurements used in attestation reports.' },
        { key: 's4', text: 'GDPR compliance exports are structured as machine-readable packages with a human-readable summary, designed to answer the "what data do you have and where does it go" question with cryptographic rigor.' },
      ],
    },
    {
      key: 'intelligence',
      name: 'TunnelMind Intelligence',
      status: 'RESEARCH',
      statusColor: 'var(--chrome-text-dim)',
      tag: 'In Development',
      sentences: [
        { key: 's1', text: 'A distributed sensor network built from Personal deployments — each enrolled device contributes anonymized routing observations that feed a shadow BGP topology map of surveillance infrastructure.' },
        { key: 's2', text: 'Prefix hijack detection watches for unauthorized route changes to known surveillance infrastructure ASNs, enabling early warning for network-level attacks on privacy infrastructure.' },
        { key: 's3', text: 'Jurisdictional routing analysis determines which regulatory jurisdictions your traffic transits — essential for GDPR cross-border transfer analysis and for organizations operating under data residency requirements.' },
        { key: 's4', text: 'The Intelligence product is downstream of Personal: it cannot exist without the distributed sensor network that Personal deployments create.' },
      ],
    },
  ],
  wontBuild: [
    { key: 'p1', text: 'Profile poisoning or data pollution tools that attempt to corrupt surveillance profiles with false behavioral signals.' },
    { key: 'p2', text: 'Agent identity certificates designed to enable impersonation or deception in multi-agent systems.' },
    { key: 'p3', text: 'BGP injection tools or route manipulation capabilities that could be used to intercept or redirect traffic.' },
    { key: 'p4', text: 'Cloud-dependent LLM processing for any behavioral or identity data — all inference in TunnelMind products runs locally, on hardware you control.' },
  ],
}

function SentenceBlock({ sentences, prefix }) {
  return (
    <div style={{ marginTop: '8px' }}>
      {sentences.map(s => (
        <p key={s.key} style={{ marginBottom: '8px', lineHeight: 0 }}>
          <InteractiveSentence
            sentenceId={`${prefix}-${s.key}`}
            content={s.text}
          />
        </p>
      ))}
    </div>
  )
}

function ProductCard({ product, prefix }) {
  return (
    <div style={{
      marginBottom: '32px',
      padding: '20px',
      background: 'var(--chrome-bg2)',
      border: '1px solid var(--chrome-border)',
      borderRadius: '3px',
      borderLeft: '3px solid',
      borderLeftColor: product.statusColor,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--chrome-text-bright)',
            marginBottom: '4px',
          }}>{product.name}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '8px',
              fontWeight: 700,
              color: product.statusColor,
              letterSpacing: '0.1em',
              padding: '2px 6px',
              border: '1px solid',
              borderColor: product.statusColor,
              borderRadius: '2px',
            }}>
              {product.status}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
            }}>
              {product.tag}
            </span>
          </div>
        </div>
        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--accent-green)',
              textDecoration: 'none',
              padding: '4px 10px',
              border: '1px solid var(--accent-green)',
              borderRadius: '2px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {product.urlLabel} ↗
          </a>
        )}
      </div>

      <SentenceBlock sentences={product.sentences} prefix={`products-${prefix}-${product.key}`} />
    </div>
  )
}

export default function Products() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="products" classification="TUNNELMIND // PRODUCTS" />

      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '40px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            t/products — TunnelMind Tools
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '30px',
            fontWeight: 400,
            color: 'var(--doc-text)',
            marginBottom: '8px',
          }}>
            Products
          </h1>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            color: 'var(--doc-text-dim)',
            fontStyle: 'italic',
          }}>
            <InteractiveSentence
              sentenceId="products-header-tagline"
              content="Every TunnelMind product is designed around a single constraint: we build tools that expose surveillance infrastructure, not tools that participate in it."
            />
          </div>
        </div>

        {/* Live Products */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--accent-green)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--accent-green)',
              display: 'inline-block',
              boxShadow: '0 0 6px var(--accent-green)',
            }} />
            Live Now — Free, No Account Required
          </div>

          {PRODUCTS.live.map(p => (
            <ProductCard key={p.key} product={p} prefix="live" />
          ))}
        </section>

        {/* In Development */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--accent-amber)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--accent-amber)',
              display: 'inline-block',
            }} />
            In Development
          </div>

          {PRODUCTS.development.map(p => (
            <ProductCard key={p.key} product={p} prefix="dev" />
          ))}
        </section>

        {/* What We Don't Build */}
        <section>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--accent-red)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            What We Don't Build
          </div>
          <div style={{
            padding: '16px 20px',
            background: 'var(--chrome-bg2)',
            border: '1px solid var(--chrome-border)',
            borderLeft: '3px solid var(--accent-red)',
            borderRadius: '3px',
          }}>
            {PRODUCTS.wontBuild.map(s => (
              <p key={s.key} style={{ marginBottom: '8px', lineHeight: 0 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--accent-red)',
                  marginRight: '6px',
                }}>✗</span>
                <InteractiveSentence
                  sentenceId={`products-wontbuild-${s.key}`}
                  content={s.text}
                />
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

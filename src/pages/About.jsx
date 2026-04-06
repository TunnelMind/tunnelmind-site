import React from 'react'
import InteractiveSentence from '../components/InteractiveSentence.jsx'
import { Ruler } from '../components/WPChrome.jsx'

const ABOUT_CONTENT = [
  {
    section: 'origin',
    title: 'Origin',
    sentences: [
      { key: 's1', text: 'Twenty-two years of enterprise network engineering — BGP, MPLS, SD-WAN, MPLS-over-GRE, every acronym the networking industry has invented since 2002 — gives you a specific kind of technical literacy that the surveillance economy does not expect its subjects to have.' },
      { key: 's2', text: 'I know what a BGP feed looks like, what an autonomous system is, what it means when a route appears and then vanishes in 47 seconds.' },
      { key: 's3', text: 'I know how to read a RIPE registration, cross-reference an ASN, and identify when a corporate entity is structured specifically to obscure its actual function.' },
      { key: 's4', text: 'The surveillance industry is built on the assumption that the people whose data it harvests will never understand the infrastructure being used to harvest it.' },
      { key: 's5', text: 'TunnelMind is what happens when that assumption turns out to be wrong.' },
    ],
  },
  {
    section: 'why-novel',
    title: 'Why a Novel',
    sentences: [
      { key: 's1', text: 'The Shadow Graph is not a marketing device or an explainer dressed up as fiction.' },
      { key: 's2', text: 'The surveillance infrastructure Marcus discovers in the novel is real — the ASN registration patterns, the ghost prefixes, the Cloudflare-fronted single-page entities with no discoverable clients.' },
      { key: 's3', text: 'The medium is the message: you are reading a surveillance thriller inside a surveillance intelligence platform, and the classification markings on each transmission are the same format TunnelMind uses to classify behavioral data internally.' },
      { key: 's4', text: 'Fiction is how we make the abstract concrete — reading about Marcus logging ghost ASNs at 3am does more to communicate what TunnelMind actually does than any product description could.' },
    ],
  },
  {
    section: 'data-sources',
    title: 'Data Sources',
    sentences: [
      { key: 's1', text: 'The 53,000+ domain dataset is built from three primary sources, each covering different parts of the surveillance ecosystem.' },
      { key: 's2', text: 'DuckDuckGo Tracker Radar is the most comprehensive behavioral tracker dataset available — built by crawling the top million websites and observing every third-party request, updated regularly by the DuckDuckGo team.' },
      { key: 's3', text: 'The IAB TCF (Transparency and Consent Framework) vendor registry contains every company that has registered for GDPR consent collection — a self-reported list of surveillance actors that is both legally significant and frequently ignored.' },
      { key: 's4', text: 'Disconnect.me is the curated blocklist built and maintained by former intelligence community researchers specifically to identify tracking and advertising infrastructure.' },
      { key: 's5', text: 'All three sources are cross-referenced, deduplicated, and scored weekly — the number you see on any domain is current within seven days.' },
    ],
  },
  {
    section: 'flywheel',
    title: 'The Flywheel',
    sentences: [
      { key: 's1', text: 'TunnelMind\'s product flywheel works like this: Personal deployments create a distributed sensor network; the sensor network generates BGP and DNS telemetry; the telemetry feeds the Intelligence dataset; the Intelligence dataset makes Enterprise attestation meaningful.' },
      { key: 's2', text: 'Each product depends on the one before it, which means the path to Intelligence and Enterprise runs through getting Personal into the hands of people who care about their network.' },
      { key: 's3', text: 'This is the Cloudflare 1.1.1.1 model — the free product for individuals creates the infrastructure that the enterprise product needs.' },
      { key: 's4', text: 'Unlike most freemium models, TunnelMind\'s individual users are not the product being sold to enterprise customers — they are the sensor network that makes the enterprise product credible.' },
    ],
  },
  {
    section: 'philosophy',
    title: 'Philosophy',
    sentences: [
      { key: 's1', text: 'Radical transparency is an architectural constraint, not a policy position.' },
      { key: 's2', text: 'Every capability TunnelMind builds for surveillance analysis is also a capability we expose to you — if we can measure your traffic, you can see the measurement.' },
      { key: 's3', text: 'We do not build profile poisoning tools, deception certificates, or BGP manipulation capabilities — not because they aren\'t technically interesting but because they are the tools of surveillance actors, not surveillance subjects.' },
      { key: 's4', text: 'The question we ask before building anything is: does this help someone understand the surveillance infrastructure they\'re inside, or does it help someone operate that infrastructure more effectively?' },
      { key: 's5', text: 'Tools that answer the first question, we build. Tools that answer the second question, we don\'t.' },
    ],
  },
  {
    section: 'practical',
    title: 'Practical Details',
    sentences: [
      { key: 's1', text: 'TunnelMind is built evenings and weekends from Cabot, Arkansas by a solo founder.' },
      { key: 's2', text: 'The infrastructure runs on Hetzner (cheap, EU-regulated), deployed via Docker Compose with no managed services except Cloudflare and Supabase.' },
      { key: 's3', text: 'All LLM inference in TunnelMind products runs locally on Mistral 7B Instruct — no behavioral data is sent to any cloud LLM provider.' },
      { key: 's4', text: 'The codebase is a monorepo: Rust (the tmd daemon and browser), Python (FastAPI backend), Go (CLI client), TypeScript (React UI).' },
      { key: 's5', text: 'Everything is on GitHub under the TunnelMind organization.' },
    ],
  },
]

function StatsBar() {
  const stats = [
    { value: '53,000+', label: 'Domains' },
    { value: '6,600+', label: 'Trackers' },
    { value: '704', label: 'Entities' },
    { value: '9,786', label: 'Entity Domains' },
    { value: '3', label: 'Data Sources' },
    { value: 'Weekly', label: 'Update Cadence' },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '1px',
      background: 'var(--chrome-border)',
      border: '1px solid var(--chrome-border)',
      borderRadius: '3px',
      overflow: 'hidden',
      marginBottom: '40px',
    }}>
      {stats.map(s => (
        <div key={s.label} style={{
          padding: '14px 10px',
          background: 'var(--chrome-bg2)',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--accent-green)',
            marginBottom: '4px',
          }}>
            {s.value}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function About() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="about" classification="TUNNELMIND // ABOUT // UNCLASSIFIED" />

      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            t/about — Origin Story
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '30px',
            fontWeight: 400,
            color: 'var(--doc-text)',
            marginBottom: '8px',
          }}>
            About TunnelMind
          </h1>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '18px',
            color: 'var(--doc-text-dim)',
            fontStyle: 'italic',
            marginBottom: '24px',
          }}>
            "They've been studying you for years. Now you study them."
          </div>
        </div>

        <StatsBar />

        {ABOUT_CONTENT.map(section => (
          <section key={section.section} style={{ marginBottom: '36px' }}>
            <h2 style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--chrome-text)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '14px',
              paddingBottom: '6px',
              borderBottom: '1px solid var(--chrome-border)',
            }}>
              {section.title}
            </h2>
            {section.sentences.map(s => (
              <p key={s.key} style={{ marginBottom: '10px', lineHeight: 0 }}>
                <InteractiveSentence
                  sentenceId={`about-${section.section}-${s.key}`}
                  content={s.text}
                />
              </p>
            ))}
          </section>
        ))}

        {/* Contact + links footer */}
        <div style={{
          borderTop: '1px solid var(--chrome-border)',
          paddingTop: '24px',
          marginTop: '16px',
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
        }}>
          <a href="mailto:signal@tunnelmind.ai" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
            signal@tunnelmind.ai
          </a>
          <a href="https://github.com/TunnelMind" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
            github.com/TunnelMind ↗
          </a>
          <a href="https://explore.tunnelmind.ai" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-green)', textDecoration: 'none' }}>
            explore.tunnelmind.ai ↗
          </a>
          <a href="https://receipt.tunnelmind.ai" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-green)', textDecoration: 'none' }}>
            receipt.tunnelmind.ai ↗
          </a>
          <a href="https://radar.tunnelmind.ai" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-green)', textDecoration: 'none' }}>
            radar.tunnelmind.ai ↗
          </a>
        </div>
      </div>
    </div>
  )
}

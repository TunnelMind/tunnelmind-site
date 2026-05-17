import React, { useRef, useEffect } from 'react'
import { initRadar } from '../lib/radar/initRadar.js'

// Radar — the main landing (P25 Phase 2). The live attacker-corpus radar is
// the hero, but it's wrapped in a deliberate conversion frame so a cold
// visitor still gets oriented and a next step:
//
//   [ hero: headline + subhead + CTA row ]
//   [ live radar  ~76vh ]
//   [ what this is · three ways in · defender tier ]
//
// The force graph itself is vanilla JS (initRadar.js, kept verbatim from
// the scry-radar Worker). React owns markup + lifecycle; initRadar attaches
// to the container ref and returns a cleanup fn run on unmount.

const CURL_EXAMPLES = [
  {
    title: 'Check one IP',
    note: 'Free, anonymous. Returns category, confidence_bucket, protocols, ports, ASN, country.',
    cmd: 'curl -s https://api.tunnelmind.ai/v1/check/45.141.56.49',
  },
  {
    title: 'Bulk check (up to 100 IPs)',
    note: '',
    cmd: 'curl -s -X POST https://api.tunnelmind.ai/v1/check/bulk \\\n  -H "Content-Type: application/json" \\\n  -d \'{"ips":["1.2.3.4","5.6.7.8"]}\'',
  },
  {
    title: 'Top ASNs targeting telnet (last 24h)',
    note: '',
    cmd: "curl -s 'https://api.tunnelmind.ai/v1/top?dimension=asn&limit=10'",
  },
  {
    title: 'Active threat campaigns',
    note: '',
    cmd: 'curl -s https://api.tunnelmind.ai/v1/campaigns',
  },
  {
    title: 'Recent attacker IPs (paginated)',
    note: '',
    cmd: "curl -s 'https://api.tunnelmind.ai/v1/recent?limit=50'",
  },
  {
    title: 'Tools detected (3+ actors sharing a payload pattern)',
    note: '',
    cmd: 'curl -s https://api.tunnelmind.ai/v1/tools',
  },
  {
    title: 'MCP — JSON-RPC 2.0 from any agent',
    note: '',
    cmd: 'curl -s -X POST https://mcp.tunnelmind.ai/mcp \\\n  -H "Content-Type: application/json" \\\n  -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list"}\'',
  },
]

// The three free ways into the product, shown below the radar.
const SURFACES = [
  {
    name: 'Chat',
    blurb: 'Ask in plain language. Sourced, real-time answers about domains, networks, and threats — grounded in the corpus.',
    href: 'https://chat.tunnelmind.ai',
  },
  {
    name: 'Tracker Data API',
    blurb: 'Build on the corpus directly. REST endpoints over the same data the radar draws — a free tier plus paid plans for scale.',
    href: 'https://api.tunnelmind.ai',
  },
  {
    name: 'MCP',
    blurb: 'Wire the corpus into any AI agent. JSON-RPC 2.0 over streamable HTTP — agent-native by design.',
    href: 'https://mcp.tunnelmind.ai',
  },
]

export default function Radar({ onNavigate }) {
  const rootRef = useRef(null)

  useEffect(() => {
    if (!rootRef.current) return
    const cleanup = initRadar(rootRef.current, { pollMs: 10000 })
    return cleanup
  }, [])

  return (
    <div className="radar-page">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="tm-hero">
        <div className="tm-eyebrow">● TunnelMind — observability layer</div>
        <h1>
          Observability for the agentic internet.
          <br />
          <span className="tm-accent">Real attacker IPs, attested at the sensor.</span>
        </h1>
        <p>
          Sourced, real-time answers about domains, networks, and threats —
          grounded in public feeds and a distributed fleet of attested sensors.
          Every observation Ed25519-signed at the source.
        </p>
        <div className="tm-cta-row">
          <a className="tm-btn tm-btn-primary" href="https://chat.tunnelmind.ai">
            Try the chat
          </a>
          <button
            className="tm-btn tm-btn-ghost"
            type="button"
            onClick={() => onNavigate && onNavigate('api')}
          >
            API docs
          </button>
          <button
            className="tm-btn tm-btn-ghost"
            type="button"
            onClick={() => onNavigate && onNavigate('pricing')}
          >
            Defender tier
          </button>
        </div>
      </section>

      {/* ── The radar (vanilla-JS force graph mounts here) ───────── */}
      <div className="radar-root" ref={rootRef}>
        <header className="radar-bar">
          <h2 className="radar-title">Scry Radar</h2>
          <span className="radar-tag">live attacker corpus</span>
          <span className="radar-stat" id="radarStats">—</span>
          <nav className="radar-modes">
            <button data-mode="visual" className="active">Visual</button>
            <button data-mode="json">JSON</button>
            <button data-mode="curl">curl</button>
          </nav>
          <span className="radar-links">
            <a href="https://chat.tunnelmind.ai">chat</a>
            <a href="https://api.tunnelmind.ai">api</a>
            <a href="https://mcp.tunnelmind.ai">mcp</a>
          </span>
        </header>

        <div className="radar-sample-note">
          You're watching a <strong>live sample</strong> of the Scry corpus,
          refreshed every 10s. The full corpus, campaign membership, and
          defender intel are the paid defender tier.
        </div>

        <main className="radar-main">
          <section id="viewVisual" className="radar-view active">
            <div id="graphArea">
              <svg id="graphSvg" xmlns="http://www.w3.org/2000/svg"></svg>
            </div>
            <aside id="inspector">
              <div className="placeholder">
                Click a node to inspect.<br />
                Larger nodes = more observations.<br />
                Color: <span className="badge actor">actor</span>{' '}
                <span className="badge scanner">scanner</span>{' '}
                <span className="badge campaign-key">campaign</span>
              </div>
            </aside>
          </section>

          <section id="viewJson" className="radar-view">
            <div className="block">
              <h3>GET /v1/recent (last hour, top 50, hostile only)</h3>
              <pre id="json-recent">loading…</pre>
            </div>
            <div className="block">
              <h3>GET /v1/campaigns</h3>
              <pre id="json-campaigns">loading…</pre>
            </div>
            <div className="block">
              <h3>GET /v1/stats</h3>
              <pre id="json-stats">loading…</pre>
            </div>
          </section>

          <section id="viewCurl" className="radar-view">
            {CURL_EXAMPLES.map((ex) => (
              <React.Fragment key={ex.title}>
                <h3>{ex.title}</h3>
                {ex.note ? <p>{ex.note}</p> : null}
                <pre>
                  <code>{ex.cmd}</code>
                  <button className="copy" type="button">copy</button>
                </pre>
              </React.Fragment>
            ))}
          </section>
        </main>

        <footer className="radar-foot">
          <span>tunnelmind.ai · refreshes every 10s</span>
          <span>every observation Ed25519-signed at the sensor</span>
        </footer>
      </div>

      {/* ── Conversion frame below the radar ─────────────────────── */}
      <div className="tm-below">

        {/* What this is */}
        <section className="tm-block">
          <div className="tm-section-label">What you're looking at</div>
          <p className="tm-prose">
            Every dot is a real source IP a TunnelMind sensor observed
            attacking something in the last hour. Amber hubs are coordinated
            campaigns — materialized when ≥5 actors share a tool across ≥3
            networks. Nothing here is a guess: each observation is
            cryptographically signed at the sensor before it ever reaches the
            corpus. This is a deliberately limited public sample. It is the
            point of the product, not a teaser around it.
          </p>
        </section>

        {/* Three ways in */}
        <section className="tm-block">
          <div className="tm-section-label">Three ways in — all free to start</div>
          <div className="tm-surfaces">
            {SURFACES.map((s) => (
              <a key={s.name} className="tm-surface" href={s.href}>
                <span className="tm-surface-name">{s.name}</span>
                <span className="tm-surface-blurb">{s.blurb}</span>
                <span className="tm-surface-link">{s.href.replace('https://', '')} ↗</span>
              </a>
            ))}
          </div>
        </section>

        {/* Defender tier */}
        <section className="tm-block">
          <div className="tm-pricing">
            <div>
              <div className="tm-section-label">Defender tier</div>
              <p className="tm-prose" style={{ margin: 0 }}>
                The radar samples the corpus. Defenders get the whole thing —
                full campaign membership, payload signatures, tool
                fingerprints, and unmetered lookups.
              </p>
            </div>
            <button
              className="tm-btn tm-btn-primary"
              type="button"
              onClick={() => onNavigate && onNavigate('pricing')}
            >
              See pricing →
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}

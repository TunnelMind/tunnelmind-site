import React, { useRef, useEffect, useState } from 'react'
import { initRadar } from '../lib/radar/initRadar.js'

// Radar — the TunnelMind landing (P25 Phase 2). The live attacker-corpus
// force graph is the hero, wrapped in a deliberate conversion frame so a
// cold visitor gets oriented and a next step:
//
//   [ hero: headline + subhead + live stat strip + CTA row ]
//   [ live radar — graph + live intel panel + activity ticker ]
//   [ what this is · read it four ways · three ways in · defender tier ]
//
// The force graph is vanilla JS (initRadar.js). React owns markup +
// lifecycle; initRadar attaches to the container ref and returns a
// cleanup fn run on unmount.

const CURL_EXAMPLES = [
  {
    title: 'Check one IP',
    note: 'Free, anonymous. Category, confidence, protocols, ports, ASN, country, org.',
    cmd: 'curl -s https://api.tunnelmind.ai/v1/check/45.141.56.49',
  },
  {
    title: 'Bulk check (up to 100 IPs)',
    note: 'One round trip for a whole block list.',
    cmd: 'curl -s -X POST https://api.tunnelmind.ai/v1/check/bulk \\\n  -H "Content-Type: application/json" \\\n  -d \'{"ips":["1.2.3.4","5.6.7.8"]}\'',
  },
  {
    title: 'Corpus stats + 24h time series',
    note: 'Totals, last-24h volume, protocol breakdown, hourly buckets.',
    cmd: 'curl -s https://api.tunnelmind.ai/v1/stats\ncurl -s https://api.tunnelmind.ai/v1/stats/timeseries',
  },
  {
    title: 'Active threat campaigns',
    note: 'Coordinated clusters of actors sharing a tool.',
    cmd: 'curl -s https://api.tunnelmind.ai/v1/campaigns',
  },
  {
    title: 'Recent attacker IPs (what the radar draws)',
    note: 'The same feed behind the graph — paginated, geo-enriched.',
    cmd: "curl -s 'https://api.tunnelmind.ai/v1/recent?limit=50'",
  },
  {
    title: 'Roll up by country or ASN',
    note: 'Where is this coming from, and on whose network.',
    cmd: 'curl -s https://api.tunnelmind.ai/v1/country/NL\ncurl -s https://api.tunnelmind.ai/v1/asn/213373',
  },
  {
    title: 'MCP — JSON-RPC 2.0 from any agent',
    note: 'Agent-native. The same corpus, wired straight into a model.',
    cmd: 'curl -s -X POST https://mcp.tunnelmind.ai/mcp \\\n  -H "Content-Type: application/json" \\\n  -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list"}\'',
  },
]

// The three free ways into the product, shown below the radar.
const SURFACES = [
  {
    name: 'Chat',
    blurb: 'Ask in plain language. Sourced, real-time answers about domains, networks, and threats — grounded in the corpus, not in vibes.',
    href: 'https://chat.tunnelmind.ai',
  },
  {
    name: 'Tracker Data API',
    blurb: 'Build on the corpus directly. REST over the same data the radar draws — free tier to start, paid plans for scale.',
    href: 'https://api.tunnelmind.ai',
  },
  {
    name: 'MCP',
    blurb: 'Wire the corpus into any AI agent. JSON-RPC 2.0 over streamable HTTP — agent-native, because the agents are the new internet.',
    href: 'https://mcp.tunnelmind.ai',
  },
]

// Four readings of the same data — the radar is built so a different
// visitor each finds their own way in.
const AUDIENCES = [
  {
    who: 'For the analyst',
    text: 'ASN, ports, payload-hash prefixes, confidence buckets, campaign membership. Click any node — or flip to the JSON view for the raw record.',
  },
  {
    who: 'For the executive',
    text: 'The 24-hour pulse and protocol mix say what is trending and how hard, no SOC required. One glance is the briefing.',
  },
  {
    who: 'For the builder & the agent',
    text: 'The exact same corpus over REST and MCP. JSON-RPC 2.0, streamable HTTP — structured for a model to consume, not just a human.',
  },
  {
    who: 'For the merely curious',
    text: 'Every dot is a real machine attacking something on the internet right now. Watch new ones arrive. Click around. It is oddly calming.',
  },
]

// Count-up animation for the hero stat strip — ease-out cubic, ~1.1s.
function useCountUp(target, ms = 1100) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    let raf
    let start = null
    const step = (t) => {
      if (start === null) start = t
      const p = Math.min(1, (t - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return val
}

function HeroStat({ value, label }) {
  const shown = useCountUp(value)
  return (
    <div className="tm-stat">
      <span className="tm-stat-value">{value ? shown.toLocaleString() : '—'}</span>
      <span className="tm-stat-label">{label}</span>
    </div>
  )
}

// Pulls /api/stats once so the hero leads with real numbers, not adjectives.
function HeroStats() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    let live = true
    fetch('/api/stats')
      .then((r) => r.json())
      .then((s) => { if (live) setStats(s) })
      .catch(() => {})
    return () => { live = false }
  }, [])
  return (
    <div className="tm-stat-strip">
      <HeroStat value={stats && stats.total_observations} label="signed observations" />
      <HeroStat value={stats && stats.distinct_source_ips} label="distinct attacker IPs" />
      <HeroStat value={stats && stats.observations_last_24h} label="seen in the last 24h" />
    </div>
  )
}

// Parse ?inspect=<host> out of the hash so /#/?inspect=example.com lands
// straight in the Corpus tab view. Used when retiring netprobe.tunnelmind.ai
// by 301 — old links keep working, the new surface answers them.
function inspectFromHash() {
  if (typeof window === 'undefined') return null
  const h = window.location.hash || ''
  const q = h.indexOf('?')
  if (q < 0) return null
  try {
    const p = new URLSearchParams(h.slice(q + 1))
    const v = p.get('inspect')
    return v ? v.trim() : null
  } catch { return null }
}

export default function Radar({ onNavigate }) {
  const rootRef = useRef(null)

  useEffect(() => {
    if (!rootRef.current) return
    const cleanup = initRadar(rootRef.current, {
      pollMs: 10000,
      initialLookup: inspectFromHash(),
    })
    return cleanup
  }, [])

  return (
    <div className="radar-page">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="tm-hero">
        <div className="tm-eyebrow">
          <span className="tm-live-dot" aria-hidden="true" />
          TunnelMind · the observability layer
        </div>
        <h1>
          Observability for the agentic internet.
          <br />
          <span className="tm-accent">Real attacker IPs, attested at the sensor.</span>
        </h1>
        <p>
          The web is filling up with traffic no human ever typed. TunnelMind
          watches the hostile slice of it — a distributed fleet of attested
          sensors plus public feeds, every observation Ed25519-signed at the
          source so the data can prove where it came from. Below is a live,
          unedited window into that corpus.
        </p>
        <HeroStats />
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
        <div className="tm-scroll-cue" aria-hidden="true">
          live corpus below ↓
        </div>
      </section>

      {/* ── The radar (vanilla-JS force graph mounts here) ───────── */}
      <div className="radar-root" ref={rootRef}>
        <header className="radar-bar">
          <span className="radar-brand">
            <span className="radar-livedot" aria-hidden="true" />
            Scry Radar
          </span>
          <span className="radar-tag">live attacker corpus</span>
          <span className="radar-stat" id="radarStats">connecting…</span>
          <nav className="radar-modes" aria-label="Radar view mode">
            <button data-mode="visual" className="active">Visual</button>
            <button data-mode="json">JSON</button>
            <button data-mode="curl">curl</button>
          </nav>
        </header>

        <div className="radar-sample-note">
          A <strong>live sample</strong> of the Scry corpus, refreshed every 10s.
          The full corpus, campaign membership, and defender intel are the paid
          defender tier — the sample is the point of the product, not a teaser.
        </div>

        <main className="radar-main">
          <section id="viewVisual" className="radar-view active">
            <div id="graphArea">
              <svg id="graphSvg" xmlns="http://www.w3.org/2000/svg"></svg>
              {/* Per-item visibility is toggled by JS based on what's
                  in the current snapshot — the radar shouldn't claim a
                  category in the legend that has no dots on screen.
                  See initRadar.js#updateLegend. */}
              <div className="radar-legend" aria-hidden="true">
                <span className="rl-item rl-item-actor"><i className="rl-dot rl-actor" />actor</span>
                <span className="rl-item rl-item-scanner"><i className="rl-dot rl-scanner" />scanner</span>
                <span className="rl-item rl-item-campaign"><i className="rl-dot rl-campaign" />campaign</span>
                <span className="rl-item rl-item-vendor"><i className="rl-dot rl-vendor" />vendor</span>
                <span className="rl-item rl-item-claude"><i className="rl-dot rl-claude" />Anthropic</span>
                <span className="rl-hint">node size = observation volume</span>
              </div>
              <div id="radarTicker" className="radar-ticker"></div>
            </div>
            {/* JS owns the contents of #inspector entirely — see
                initRadar.js#ensureInspectorShell. No JSX children here,
                because any React reconciliation pass would otherwise
                wipe the form + body div the inspector relies on. */}
            <aside id="inspector"></aside>
          </section>

          <section id="viewJson" className="radar-view">
            <p className="radar-view-intro">
              The exact payloads behind the graph — what an API client or an AI
              agent receives. Every field is documented at{' '}
              <a href="https://api.tunnelmind.ai">api.tunnelmind.ai</a>.
            </p>
            <div className="block">
              <h3>GET /v1/recent — last hour, top 50, hostile only</h3>
              <pre id="json-recent">loading…</pre>
            </div>
            <div className="block">
              <h3>GET /v1/campaigns — coordinated activity</h3>
              <pre id="json-campaigns">loading…</pre>
            </div>
            <div className="block">
              <h3>GET /v1/stats — corpus-wide counters</h3>
              <pre id="json-stats">loading…</pre>
            </div>
          </section>

          <section id="viewCurl" className="radar-view">
            <p className="radar-view-intro">
              Copy, paste, run. No key required for any of these — the free
              tier is a real tier, not a trial.
            </p>
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
          <span>tunnelmind.ai · live SSE feed · refreshes every 10s</span>
          <span>every observation Ed25519-signed at the sensor</span>
        </footer>
      </div>

      {/* ── Conversion frame below the radar ─────────────────────── */}
      <div className="tm-below">

        {/* What this is */}
        <section className="tm-block">
          <div className="tm-section-label">What you're looking at</div>
          <p className="tm-prose">
            Every dot is a real source IP a TunnelMind sensor watched attack
            something in the last hour — and no, none of them are here to make
            friends. Amber hubs are coordinated campaigns: a cluster of actors
            running the same tool across multiple networks. Nothing here is a
            guess — each observation is cryptographically signed at the sensor
            before it ever reaches the corpus. New arrivals slide in along the
            bottom; the panel on the right is the corpus reading itself back to
            you.
          </p>
        </section>

        {/* Four ways to read it */}
        <section className="tm-block">
          <div className="tm-section-label">Built to be read four ways</div>
          <div className="tm-audiences">
            {AUDIENCES.map((a) => (
              <div key={a.who} className="tm-audience">
                <span className="tm-audience-who">{a.who}</span>
                <span className="tm-audience-text">{a.text}</span>
              </div>
            ))}
          </div>
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
                fingerprints, and unmetered lookups. Same data, no velvet rope.
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

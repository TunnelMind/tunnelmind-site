import React, { useState, useEffect } from 'react'

// Live corpus counts come from the ecosystem scoreboard (data-api /v1/stats,
// served as a weekly KV snapshot), so the numbers on this page track the weekly
// Sunday supply-graph crawl instead of going stale. Fetched via a same-origin
// proxy Function so it satisfies the site's strict CSP (connect-src 'self');
// falls back to the baked-in figures below if the fetch fails, so the page never
// shows a blank or a zero.
const STATS_URL = '/api/ecosystem-stats'

function fmt(n) {
  if (n == null || !Number.isFinite(n)) return null
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return Math.round(n / 1e3) + 'K'
  return String(n)
}

// /compare — "what's your selling point vs ipinfo / GreyNoise?" The honest
// category answer, made canonical so it can be linked rather than re-argued.
// Style mirrors About.jsx (serif prose, mono eyebrows, doc-bg).

const eyebrow = (color) => ({
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  color,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  marginBottom: '12px',
})
const sectionLabel = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  color: 'var(--chrome-text-dim)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: '16px',
}
const prose = {
  fontFamily: 'var(--font-serif)',
  fontSize: '15px',
  lineHeight: '1.8',
  color: 'var(--doc-text-dim)',
  marginBottom: '14px',
}
const rule = { height: '1px', background: 'var(--chrome-border)', marginBottom: '48px' }
const bright = { color: 'var(--chrome-text-bright)' }

// ── Comparison matrix ────────────────────────────────────────────────
// yes / no / partial / star(best-in-class)
const Y = 'yes'
const N = 'no'
const P = 'partial'
const S = 'star'

const COLS = ['TunnelMind', 'ipinfo', 'GreyNoise']

const ROWS = [
  ['IP / ASN / geolocation enrichment',                    Y, S, P],
  ['Scanner / attacker observation',                       Y, N, S],
  ['Programmatic-ad supply-chain trust (Sigil)',           Y, N, N],
  ['Routing integrity & sovereignty (GhostRoute)',         Y, N, N],
  ['Signed, attributable observations (provenance)',       Y, N, N],
  ['Replayable verification receipts (witnessability)',    Y, N, N],
  ['Cross-lens join across all of the above',              Y, N, N],
  ['Agent-native rails (MCP · x402 · OAI · preflight)',    Y, N, N],
]

function Cell({ kind }) {
  const map = {
    yes:     { ch: '✓', color: 'var(--accent-green)',     title: 'Yes' },
    no:      { ch: '—', color: 'var(--chrome-text-dim)',  title: 'No' },
    partial: { ch: '◐', color: 'var(--accent-amber)',     title: 'Partial' },
    star:    { ch: '★', color: 'var(--accent-blue)',      title: 'Best-in-class' },
  }
  const { ch, color, title } = map[kind]
  return (
    <td title={title} style={{
      textAlign: 'center',
      padding: '11px 8px',
      borderBottom: '1px solid var(--chrome-border)',
      color,
      fontFamily: 'var(--font-mono)',
      fontSize: '15px',
    }}>{ch}</td>
  )
}

export default function Compare() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const ctl = new AbortController()
    fetch(STATS_URL, { signal: ctl.signal, headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const d = j && (j.data || j)
        if (!d || !d.lenses) return
        setStats({
          seats:     fmt(d.lenses.sigil?.exchange_seats),
          sellPaths: fmt(d.lenses.sigil?.sell_paths),
          entities:  fmt(d.lenses.tracker?.entities),
          asOf:      d.generated_at ? d.generated_at.slice(0, 10) : null,
        })
      })
      .catch(() => {}) // keep the baked-in fallback figures
    return () => ctl.abort()
  }, [])

  // Baked-in fallbacks — used until/unless the live fetch resolves.
  const seats     = stats?.seats     || '~911K'
  const sellPaths = stats?.sellPaths || '~1.7M'
  const entities  = stats?.entities  || '~59K'

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={eyebrow('var(--accent-green)')}>● Compare</div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 400,
          lineHeight: '1.25',
          color: 'var(--chrome-text-bright)',
          marginBottom: '20px',
        }}>
          What&apos;s the selling point versus ipinfo or GreyNoise?
        </h1>
        <p style={{ ...prose, fontSize: '16px', maxWidth: '620px', marginBottom: '24px' }}>
          Short answer: they answer <em>&ldquo;what is this IP?&rdquo;</em> TunnelMind
          answers <em>&ldquo;should my agent trust this actor right now, on whose
          authority, and can I prove the decision later?&rdquo;</em> Those are different
          categories. We don&apos;t try to out-scale ipinfo on raw geolocation — and
          we don&apos;t need to.
        </p>

        <div style={rule} />

        {/* ── Different question ───────────────────────────────────── */}
        <section style={{ marginBottom: '48px' }}>
          <div style={sectionLabel}>A different question</div>
          <p style={prose}>
            <strong style={bright}>ipinfo</strong> (and MaxMind, Spur) is an
            enrichment lookup: you hand it an address, it hands back attributes —
            geo, ASN, company, VPN/proxy flags. They win the raw-scale game
            decisively, and you should not try to beat them there.{' '}
            <strong style={bright}>GreyNoise</strong> tells you whether an IP is
            internet-background scanning noise. Both are single-axis data products
            built for a human analyst or a backend cron.
          </p>
          <p style={{ ...prose, marginBottom: 0 }}>
            TunnelMind is a <strong style={bright}>trust-attestation layer for
            agents</strong>. The atom is not a lookup row — it&apos;s a signed
            observation. Everything else is composition.
          </p>
        </section>

        <div style={rule} />

        {/* ── Matrix ───────────────────────────────────────────────── */}
        <section style={{ marginBottom: '48px' }}>
          <div style={sectionLabel}>Where the lines fall</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-serif)',
            }}>
              <thead>
                <tr>
                  <th style={{
                    textAlign: 'left', padding: '0 8px 12px 0',
                    borderBottom: '1px solid var(--chrome-border)',
                    fontFamily: 'var(--font-mono)', fontSize: '9px',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: 'var(--chrome-text-dim)', fontWeight: 400,
                  }}>Capability</th>
                  {COLS.map((c, i) => (
                    <th key={c} style={{
                      padding: '0 8px 12px', textAlign: 'center',
                      borderBottom: '1px solid var(--chrome-border)',
                      fontFamily: 'var(--font-mono)', fontSize: '10px',
                      letterSpacing: '0.04em',
                      color: i === 0 ? 'var(--accent-green)' : 'var(--chrome-text-dim)',
                      fontWeight: i === 0 ? 600 : 400, whiteSpace: 'nowrap',
                    }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, ...cells]) => (
                  <tr key={label}>
                    <td style={{
                      padding: '11px 8px 11px 0',
                      borderBottom: '1px solid var(--chrome-border)',
                      fontSize: '13.5px', lineHeight: '1.5',
                      color: 'var(--doc-text-dim)',
                    }}>{label}</td>
                    {cells.map((k, i) => <Cell key={i} kind={k} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            color: 'var(--chrome-text-dim)', marginTop: '14px', lineHeight: '1.7',
          }}>
            ✓ first-class&nbsp;&nbsp;·&nbsp;&nbsp;★ best-in-class&nbsp;&nbsp;·&nbsp;&nbsp;◐ partial&nbsp;&nbsp;·&nbsp;&nbsp;— not offered
          </p>
        </section>

        <div style={rule} />

        {/* ── Three pillars ────────────────────────────────────────── */}
        <section style={{ marginBottom: '48px' }}>
          <div style={sectionLabel}>The three things a lookup can&apos;t do</div>
          <p style={prose}>
            <strong style={bright}>Destination intelligence</strong> — the only
            axis the enrichment vendors touch, and only a thin geo/ASN slice of
            it.
          </p>
          <p style={prose}>
            <strong style={bright}>Provenance</strong> — every observation is
            signed at the source (Ed25519 at the sensor, ATAP-witnessed). A lookup
            gives you an answer; it can&apos;t give you a signed, attributable
            chain for <em>why</em>.
          </p>
          <p style={{ ...prose, marginBottom: 0 }}>
            <strong style={bright}>Witnessability</strong> — a replayable receipt
            an auditor, human or machine, can verify after the fact. ipinfo and
            GreyNoise have no concept of this.
          </p>
        </section>

        <div style={rule} />

        {/* ── Scale ────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '48px' }}>
          <div style={sectionLabel}>&ldquo;Don&apos;t you need vast scale of intelligence?&rdquo;</div>
          <p style={prose}>
            Honest answer: not ipinfo&apos;s kind, and that&apos;s deliberate — but
            yes, the kind that matters here. The insight is that the data is{' '}
            <strong style={bright}>public and self-replenishing</strong>, so the
            problem is aggregation and join, not building a planet-scale probe
            network:
          </p>
          <ul style={{ ...prose, marginBottom: '10px', paddingLeft: '22px' }}>
            <li><strong style={bright}>Sigil supply graph</strong> — {seats} exchange seats and {sellPaths} sell-path edges across {entities} entities, derived from sellers.json / ads.txt / OpenRTB and re-crawled weekly; more than half of seats resolve to a named owner.</li>
            <li><strong style={bright}>Augur</strong> — eight live threat feeds (URLhaus, ThreatFox, Tor, Spamhaus DROP, Feodo, certificate transparency, and more).</li>
            <li><strong style={bright}>GhostRoute</strong> — first-party RPKI (our own validator, not a resold feed) plus tamper-evident certificate-transparency witnessing.</li>
            <li><strong style={bright}>Scry fleet</strong> — Familiar sensors signing observations at the edge.</li>
          </ul>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            color: 'var(--chrome-text-dim)', margin: '0 0 14px', lineHeight: '1.7',
          }}>
            ↳ supply-graph counts pulled live from the public{' '}
            <a href="https://data.tunnelmind.ai/v1/stats" style={{ color: 'var(--accent-green)' }}>/v1/stats</a>{' '}
            scoreboard{stats?.asOf ? `, as of ${stats.asOf}` : ''} — they track the weekly crawl, not this page.
          </p>
          <p style={{ ...prose, marginBottom: 0 }}>
            That&apos;s data scale of a <em>different shape</em> than an IP-geo
            database — and it&apos;s the shape an agent needs before it transacts.
          </p>
        </section>

        <div style={rule} />

        {/* ── The join ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: '48px' }}>
          <div style={sectionLabel}>The thing nobody else can compute</div>
          <p style={prose}>
            The moat is the <strong style={bright}>cross-lens join</strong>: a
            scanning IP in Scry that is <em>also</em> the egress for an SSP
            carrying 100K publisher relationships in Sigil, whose claimed EU
            sovereignty <em>also</em> mismatches its real US routing in GhostRoute.
            One graph, four lenses, joinable.
          </p>
          <p style={{ ...prose, marginBottom: 0 }}>
            GreyNoise and Spur own one half. DV, IAS and HUMAN own another. The
            agent-behavior surface barely exists as a product anywhere. TunnelMind
            is the only place all four live in one graph — and the only one of
            them designed for an agent customer, not a human dashboard.
          </p>
        </section>

        {/* ── One-liner ────────────────────────────────────────────── */}
        <div style={{
          borderLeft: '2px solid var(--accent-green)',
          paddingLeft: '20px',
          marginTop: '8px',
        }}>
          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: '17px',
            lineHeight: '1.7', color: 'var(--chrome-text-bright)',
            fontStyle: 'italic', margin: 0,
          }}>
            ipinfo tells your agent where an IP is. TunnelMind tells your agent
            whether to trust an actor, on whose authority — and leaves a receipt
            it can prove later.
          </p>
        </div>

      </div>
    </div>
  )
}

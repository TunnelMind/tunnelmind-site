import React, { useEffect, useState } from 'react'
import VerifyWidget from '../components/VerifyWidget.jsx'

// Home — the root. As of 2026-07 the hero IS the live product: the interactive
// cross-lens Verify console (src/components/VerifyWidget.jsx), not a scripted
// auto-demo. A visitor types any host and gets a real, signed verdict on the
// spot — the free tier, right on the landing page. Below it: what the four
// lenses are, and the two doors to go deeper (humans → $20 block, agents →
// x402). ponytail: the old HeroInstrument scripted demo was retired — the real
// console does everything it faked, and better.

// ── Live counters ─────────────────────────────────────────────────────────
function Counters() {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let alive = true
    const get = (u) => fetch(u, { headers: { Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    Promise.all([get('/api/ecosystem-stats'), get('/api/stats')]).then(([eco, scry]) => {
      if (!alive) return
      const d = eco && (eco.data || eco)
      const sigil = d && d.lenses && d.lenses.sigil
      const scryObs = (scry && typeof scry.total_observations === 'number') ? scry.total_observations
        : (d && d.lenses && d.lenses.scry && d.lenses.scry.observations_total) || null
      setStats({
        scryObs,
        sigilLinks: sigil ? sigil.sell_paths : null,
      })
    })
    return () => { alive = false }
  }, [])

  const items = [
    { to: stats && stats.scryObs, lbl: 'Scry observations', fmt: (n) => (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(n)) },
    { to: stats && stats.sigilLinks, lbl: 'Sigil supply links', fmt: (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : (n / 1000).toFixed(0) + 'k') },
    { to: 91, lbl: 'MCP tools live', fmt: (n) => String(n) },
    { to: 4, lbl: 'correlated lenses', fmt: (n) => String(n) },
  ]

  return (
    <div className="hm-counters">
      {items.map((it) => (
        <div className="hm-counter hm-reveal is-in" key={it.lbl}>
          <div className="hm-num">{it.to != null ? it.fmt(it.to) : '—'}</div>
          <div className="hm-lbl">{it.lbl}</div>
        </div>
      ))}
    </div>
  )
}

export default function Home({ onNavigate }) {
  const go = (page) => (e) => { if (onNavigate) { e.preventDefault(); onNavigate(page) } }

  return (
    <div className="hm-page">
      <div className="hm-field" aria-hidden="true">
        <div className="hm-radar-sweep" />
        <svg className="hm-rings" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><circle cx="50" cy="50" r="18" /><circle cx="50" cy="50" r="30" /><circle cx="50" cy="50" r="42" /></svg>
        <div className="hm-grid-drift" />
      </div>

      <main className="hm-wrap">
        <section className="hm-hero">
          <p className="hm-eyebrow">Trust attestation · the agentic internet</p>
          <h1 className="hm-h1">Ask one question. Get a verdict <span className="hm-qt">no single feed can return.</span></h1>
          <p className="hm-lede">The web is filling with traffic no human ever typed. TunnelMind resolves any IP, ASN, domain, or ad-tech entity through four correlated lenses and returns <strong>one signed verdict</strong> — every observation Ed25519-signed at the source, so the data proves where it came from.</p>
          <VerifyWidget onNavigate={onNavigate} />
        </section>

        <section className="hm-block" id="join">
          <div className="hm-sechead"><h2>The moat is the join</h2><p>Any incumbent sells you one lens. None can compute the verdict where the lenses meet — that fused result is the product.</p></div>
          <Counters />
          <div className="hm-join">
            <div className="hm-joindiag" aria-hidden="true">
              <svg viewBox="0 0 400 400">
                {/* Four lenses at the points of a diamond — four sides, four lenses —
                    each one's evidence converging on the verdict at the centre. */}
                <g stroke="#1A2233" strokeWidth="1" fill="none">
                  <polygon points="200,56 344,200 200,344 56,200" />
                  <polygon points="200,114 286,200 200,286 114,200" />
                </g>
                <path className="hm-strand" d="M200,200 L200,56" />
                <path className="hm-strand" d="M200,200 L344,200" style={{ animationDelay: '.35s' }} />
                <path className="hm-strand" d="M200,200 L200,344" style={{ animationDelay: '.7s' }} />
                <path className="hm-strand" d="M200,200 L56,200" style={{ animationDelay: '1.05s' }} />
                <g fill="#0E1422" strokeWidth="1.6">
                  <circle className="hm-jnode" cx="200" cy="56" r="30" stroke="#E25A40" />
                  <circle className="hm-jnode" cx="344" cy="200" r="30" stroke="#C9A86A" style={{ animationDelay: '.6s' }} />
                  <circle className="hm-jnode" cx="200" cy="344" r="30" stroke="#D9A23A" style={{ animationDelay: '1.2s' }} />
                  <circle className="hm-jnode" cx="56" cy="200" r="30" stroke="#6A93D6" style={{ animationDelay: '1.8s' }} />
                </g>
                <circle cx="200" cy="200" r="42" fill="#0B0F18" stroke="#C9A86A" strokeWidth="1.6" />
                <text className="hm-jlabel" x="200" y="197" textAnchor="middle" fill="#E9E5D8" style={{ fontSize: '12px' }}>VERDICT</text>
                <text className="hm-jlabel" x="200" y="212" textAnchor="middle" fill="#79839A" style={{ fontSize: '9px' }}>+ receipt</text>
                <text className="hm-jlabel" x="200" y="60" textAnchor="middle" fill="#E25A40">SCRY</text>
                <text className="hm-jlabel" x="344" y="204" textAnchor="middle" fill="#C9A86A">SIGIL</text>
                <text className="hm-jlabel" x="200" y="348" textAnchor="middle" fill="#D9A23A">TRACK</text>
                <text className="hm-jlabel" x="56" y="204" textAnchor="middle" fill="#6A93D6">GHOST</text>
              </svg>
            </div>
            <div className="hm-joincopy">
              <h3>One graph, four questions</h3>
              <p>Who is attacking · who can be trusted to transact · who is watching · and where the traffic actually goes. One correlated graph, queried in a single call.</p>
              <div className="hm-moat">attack&nbsp;×&nbsp;trust&nbsp;×&nbsp;tracker&nbsp;×&nbsp;routing<br />= a verdict no siloed feed can produce.</div>
              <p style={{ marginTop: '21px' }}>A threat feed says the actor is hostile. An RPKI validator says the route is clean. <strong style={{ color: 'var(--hm-bone)', fontWeight: 500 }}>Only the join knows they're the same entity — and what to do about it.</strong></p>
            </div>
          </div>
        </section>

        <section className="hm-block" id="lenses">
          <div className="hm-sechead"><h2>Four lenses</h2><p>Status shown straight. Two are live and queryable today; two are still being built — we won't pretend otherwise.</p></div>
          <div className="hm-lensgrid">
            <div className="hm-lcard"><div className="hm-ltop"><span className="hm-lh hm-scry">Scry</span><span className="hm-status live">live</span></div><p>Signed observations of hostile network actors — IPs, ASNs, behaviors, threat-feed overlap, actor classification.</p><div className="hm-stat">Familiar honeypots + Augur crawler</div><div className="hm-stat" style={{ marginTop: 8 }}><a href="https://api.tunnelmind.ai">api.tunnelmind.ai →</a></div></div>
            <div className="hm-lcard"><div className="hm-ltop"><span className="hm-lh hm-sigil">Sigil</span><span className="hm-status live">live</span></div><p>Programmatic-advertising supply-graph trust. Publishers, SSPs, DSPs, OpenRTB SupplyChain, entity trust scoring.</p><div className="hm-stat">ads.txt / sellers.json supply graph</div><div className="hm-stat" style={{ marginTop: 8 }}><a href="https://data.tunnelmind.ai">data.tunnelmind.ai →</a></div></div>
            <div className="hm-lcard"><div className="hm-ltop"><span className="hm-lh hm-ghost">GhostRoute</span><span className="hm-status beta">beta</span></div><p>Routing integrity and sovereignty. Origin AS, RPKI validity, claimed vs. actual sovereign zone, first-party CT witnessing.</p><div className="hm-stat">BGP / RPKI / certificate transparency</div><div className="hm-stat" style={{ marginTop: 8 }}><a href="https://data.tunnelmind.ai/v1/ghostroute/check/api.anthropic.com">/v1/ghostroute/check →</a></div></div>
            <div className="hm-lcard"><div className="hm-ltop"><span className="hm-lh hm-tracker">Tracker</span><span className="hm-status soon">scaffolded</span></div><p>The demand-side graph: who is watching whom on the open web. Recurring SDK fingerprints, tracker-operator entities.</p><div className="hm-stat" style={{ color: 'var(--hm-faint)' }}>Schema live · ingestion in progress</div></div>
          </div>
        </section>

        <section className="hm-block" id="model">
          <div className="hm-sechead"><h2>Open the protocol, sell the node</h2><p>The format anyone can implement is free. The graph that's expensive to build is the business. Clean line, no bait.</p></div>
          <div className="hm-split">
            <div className="hm-col hm-open"><div className="hm-ch"><h3>Open protocol</h3><span className="hm-tag">free · open</span></div>
              <ul><li><span className="hm-m">▸</span><b>OAI</b> — free-to-resolve handle for every actor</li><li><span className="hm-m">▸</span><b>ATAP</b> — capability tokens, witness chains, receipts</li><li><span className="hm-m">▸</span><b>Receipt format</b> — the signed verdict envelope</li><li><span className="hm-m">▸</span><b>Reference verifier + SDK</b></li></ul>
              <p className="hm-foot">Value = ubiquity. The more who verify, the stronger the standard.</p></div>
            <div className="hm-col hm-paid"><div className="hm-ch"><h3>Monetized node</h3><span className="hm-tag">metered</span></div>
              <ul><li><span className="hm-m">▸</span><b>Hosted /v1/verify</b> — the live fused graph</li><li><span className="hm-m">▸</span><b>Graph data</b> — bulk, historical, deltas</li><li><span className="hm-m">▸</span><b>Verticals</b> — ad-tech, threat, sovereignty feeds</li><li><span className="hm-m">▸</span><b>SLA + private deployment</b></li></ul>
              <p className="hm-foot">Value = scarcity. The corpus is the moat; the format isn't.</p></div>
          </div>
        </section>

        <section className="hm-block" id="pricing">
          <div className="hm-sechead"><h2>Go deeper</h2><p>The verdict above is free — 50 checks a day, no account. When you need depth or scale, two doors. <a className="hm-inline" href="/pricing" onClick={go('pricing')}>Full pricing →</a></p></div>
          <div className="hm-price">
            <div className="hm-pcard" style={{ borderColor: 'var(--hm-gold-dim)' }}><div className="hm-who">Humans</div><div className="hm-amt">$20<small> · block</small></div><p className="hm-desc">Buy a prepaid block of checks and get an API key on the spot via Stripe. No subscription — top up when you run out.</p><div className="hm-rail"><a className="hm-inline" href="/pricing" onClick={go('pricing')}>Buy a block →</a></div></div>
            <div className="hm-pcard"><div className="hm-who">Agents</div><div className="hm-amt">x402<small> · USDC</small></div><p className="hm-desc">Machine-native pay-per-call. No account, settles inline over HTTP 402. Point your agent and go.</p><div className="hm-rail"><a className="hm-inline" href="/pricing" onClick={go('pricing')}>Agent rail →</a></div></div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--hm-mute)', marginTop: 16, textAlign: 'center' }}>Building? <a className="hm-inline" href="/api" onClick={go('api')}>Docs &amp; API</a> · <a className="hm-inline" href="/llms.txt">llms.txt</a> · MCP at <a className="hm-inline" href="/api" onClick={go('api')}>mcp.tunnelmind.ai</a></p>
        </section>

        <section className="hm-block" id="agents">
          <div className="hm-sechead"><h2>For autonomous agents</h2><p>Streamable HTTP, JSON-RPC 2.0, all three listed in the official MCP registry. Point your agent and go.</p></div>
          <div className="hm-mcp">
            <div className="hm-mcprow"><span className="hm-mu">mcp-data.tunnelmind.ai/mcp</span><span className="hm-md">ai.tunnelmind/data</span><span className="hm-mt">67 tools</span></div>
            <div className="hm-mcprow"><span className="hm-mu">mcp.tunnelmind.ai/mcp</span><span className="hm-md">ai.tunnelmind/scry</span><span className="hm-mt">12 tools</span></div>
            <div className="hm-mcprow"><span className="hm-mu">mcp.sigil.tunnelmind.ai/mcp</span><span className="hm-md">ai.tunnelmind/sigil</span><span className="hm-mt">12 tools</span></div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--hm-mute)', marginTop: 21 }}>Discovery · <a className="hm-inline" href="/.well-known/ai-services.json">ai-services.json</a> · <a className="hm-inline" href="/agent-onboarding.md">agent-onboarding.md</a> · <a className="hm-inline" href="/llms.txt">llms.txt</a></p>
        </section>

        <section className="hm-block" id="standards">
          <div className="hm-sechead"><h2>Standards we edit</h2><p>Attestation only works if it's open. We publish the specs the verdicts are built on — citation-grade, free.</p></div>
          <div className="hm-lensgrid">
            <div className="hm-lcard"><div className="hm-ltop"><span className="hm-lh" style={{ color: 'var(--hm-gold)' }}>OAI</span><span className="hm-status live">v1.0</span></div><p>Observed Actor Identifier — a permanent, free-to-resolve handle for every actor on the network. A resolver, never an identity issuer.</p><div className="hm-stat"><a href="https://tunnelmind.ai/oai/standard">Read the spec →</a></div></div>
            <div className="hm-lcard"><div className="hm-ltop"><span className="hm-lh" style={{ color: 'var(--hm-aether)' }}>ATAP</span><span className="hm-status beta">v0.1</span></div><p>Agent Trust Attestation Protocol — tiers a verdict's attestation: self-asserted → software → tee-tpm → silicon-root. Public comment through 2026-08-12.</p><div className="hm-stat"><a href="https://tunnelmind.ai/atap/standard">Read the spec →</a></div></div>
          </div>
        </section>
      </main>
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react'

// Home — the radar-terminal landing (P-SITE-SYNC GATE 2). Ported from the
// approved spec design/landing-reference.html into the real React stack, with
// the hero wired to a REAL /v1/verify verdict via the same-origin proxy.
//
// Honest-attacker hero (ruling 2026-06-27): the spec mocked a HOSTILE verdict on
// a Tor exit, but live that IP fuses to "pass" and GhostRoute is dark. So the
// hero resolves a genuinely-observed attacker (93.123.72.183 → fused "warn",
// 852 obs, human_hacker) and shows GhostRoute honestly as still warming. Every
// field below is captured live and re-verifiable; nothing is fabricated.

// ── Real captured verdict + signed receipt for the demo attacker ───────────
// Pulled live from data.tunnelmind.ai/v1/verify/93.123.72.183 (2026-06-27).
// Used as the instant seed + the fallback if the live call 504s on a cold node.
// The signature is genuine — "verify the receipt" really verifies.
const SEED = {
  node: { type: 'ip', value: '93.123.72.183', ip_version: 4 },
  scry: { available: true, category: 'actor', observed: true, observation_count: 852, actor_class: 'unknown', asn: '206264', country: 'SC' },
  sigil: { available: true, in_supply_graph: false, reason: 'sigil_does_not_index_by_ip_v1' },
  ghostroute: { available: false, reason: 'ghostroute_pending' },
  cross_lens: {
    verdict: 'warn',
    trust_score: 0.6154,
    confidence: 0.8,
    adversary_class: { classification: 'human_hacker' },
  },
  receipt: {
    receipt_id: '019f0b32-476e-7253-bbb6-5277292ac554',
    attestation_strength: 'software',
    timestamp: '2026-06-27T22:27:52Z',
    signature: { algorithm: 'Ed25519', key_id: 'tm-receipt-2026-05', value: 'SyruVZioT/m/vtNSUpC7Caxm7mwvEmgq/IrfWpvP6tsW+OhAUzYLGA/bzHfT8UZfYzuGfWTGPfqz0z71aV+0Bg==' },
    subject: '93.123.72.183',
  },
}

const DEMO_NODE = SEED.node.value

// verdict → display word + tone class (matches VerifyWidget's mapping)
const VERDICT_WORD = { pass: 'PASS', warn: 'CAUTION', fail: 'BLOCK', mismatch: 'MISMATCH', unknown: 'UNKNOWN' }
const VERDICT_TONE = { pass: 'clean', warn: 'warn', fail: 'hostile', mismatch: 'hostile', unknown: 'na' }
const verdictWord = (v) => VERDICT_WORD[v] || (v ? v.toUpperCase() : '·······')
const verdictTone = (v) => VERDICT_TONE[v] || 'na'

// Map a verify result to the four hero lens rows (honest about what's lit).
function lensRows(r) {
  const scry = r.scry || {}
  const sigil = r.sigil || {}
  const gr = r.ghostroute || {}
  const obs = scry.observation_count
  const scryRow = scry.observed
    ? { val: `${scry.category || 'actor'} · ${obs != null ? obs.toLocaleString() : '—'} obs · ${(r.cross_lens && r.cross_lens.adversary_class && r.cross_lens.adversary_class.classification) || scry.actor_class || 'unknown'}`, pill: 'observed', tone: 'hostile' }
    : scry.available
      ? { val: 'resolved, not in the attacker corpus', pill: 'clean', tone: 'clean' }
      : { val: 'no hostile signal', pill: 'n/a', tone: 'na' }

  const sigilRow = !sigil.available
    ? { val: 'no supply-graph data', pill: 'n/a', tone: 'na' }
    : sigil.in_supply_graph
      ? { val: 'present in the ad supply graph', pill: 'in graph', tone: 'clean' }
      : { val: 'not indexed by IP (domains/entities only)', pill: 'n/a', tone: 'na' }

  const trackerRow = { val: 'no tracker-operator entity resolved', pill: 'beta', tone: 'beta' }

  const grRow = (gr.reason === 'ghostroute_pending' || !gr.available)
    ? { val: 'RPKI / sovereignty still resolving', pill: 'warming', tone: 'beta' }
    : {
        val: `origin ${gr.origin_as || '—'} · RPKI ${gr.rpki_status || '—'}${gr.claimed_sovereign_zone ? ` · claim ${gr.claimed_sovereign_zone}` : ''}`,
        pill: gr.sanctions_match ? 'sanctioned' : gr.rpki_status === 'INVALID' ? 'invalid' : 'clean',
        tone: gr.sanctions_match || gr.rpki_status === 'INVALID' ? 'hostile' : 'clean',
      }

  return [
    { key: 'scry', name: 'Scry', ...scryRow },
    { key: 'sigil', name: 'Sigil', ...sigilRow },
    { key: 'tracker', name: 'Tracker', ...trackerRow },
    { key: 'ghost', name: 'GhostRoute', ...grRow },
  ]
}

// ── Hero instrument: types the node, resolves the live verdict ─────────────
function HeroInstrument() {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [result, setResult] = useState(SEED)
  const [typed, setTyped] = useState(reduce ? DEMO_NODE : '')
  const [word, setWord] = useState(reduce ? verdictWord(SEED.cross_lens.verdict) : '·······')
  const [reveal, setReveal] = useState(reduce ? 4 : 0)   // lens rows shown
  const [resolved, setResolved] = useState(reduce)        // verdict + receipt shown
  const ref = useRef(null)
  const timers = useRef([])
  const started = useRef(false)
  const push = (t) => timers.current.push(t)

  // Background live lookup — progressive enhancement over the captured seed.
  useEffect(() => {
    let alive = true
    fetch(`/api/verify/${encodeURIComponent(DEMO_NODE)}`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      // Keep the genuine captured receipt if the live response is a GhostRoute-
      // pending partial (those omit the receipt) — it's a real receipt for this
      // same IP+verdict, so the signed-receipt block never goes blank.
      .then((d) => { if (alive && d && d.cross_lens) setResult({ ...d, receipt: d.receipt || SEED.receipt }) })
      .catch(() => { /* keep the real captured seed */ })
    return () => { alive = false }
  }, [])

  // Typing → verdict-scramble → lens reveal, started when the hero enters view.
  useEffect(() => {
    if (reduce) return
    const node = ref.current
    if (!node) return
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true
          io.unobserve(e.target)
          runSequence()
        }
      })
    }, { threshold: 0.3 })
    io.observe(node)
    return () => { io.disconnect(); timers.current.forEach(clearTimeout); timers.current = [] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])

  function runSequence() {
    let i = 0
    const type = () => {
      if (i <= DEMO_NODE.length) { setTyped(DEMO_NODE.slice(0, i)); i++; push(setTimeout(type, 55)) }
      else {
        const chars = 'ABCDEF0123456789·#@%'
        const final = verdictWord(SEED.cross_lens.verdict)
        let f = 0
        const frames = 18
        const iv = setInterval(() => {
          let out = ''
          for (let j = 0; j < final.length; j++) out += (j < final.length * (f / frames)) ? final[j] : chars[Math.floor(Math.random() * chars.length)]
          setWord(out); f++
          if (f > frames) { clearInterval(iv); setWord(final); setResolved(true) }
        }, 45)
        timers.current.push({ clear: () => clearInterval(iv) })
        for (let k = 1; k <= 4; k++) push(setTimeout(() => setReveal(k), 250 + k * 180))
      }
    }
    type()
  }

  const rows = lensRows(result)
  const cl = result.cross_lens || {}
  const live = resolved ? verdictWord(cl.verdict) : word
  const tone = verdictTone(cl.verdict)
  const rcpt = result.receipt || {}
  const sig = rcpt.signature || {}
  const sigShort = sig.value ? `ed25519:${sig.value.slice(0, 4)}…${sig.value.slice(-4)}` : '—'

  return (
    <div className="hm-instrument hm-reveal is-in" ref={ref}>
      <div className="hm-inst-bar">
        <span className="hm-dot" /><span className="hm-dot" /><span className="hm-dot" />
        <span className="hm-q"><span className="hm-term">POST</span> /v1/verify/<span className="hm-ent">{typed}</span>{!resolved && !reduce && <span className="hm-caret">▍</span>}</span>
        <span className={`hm-tier ${resolved ? 'on' : ''}`}>attestation: {rcpt.attestation_strength || 'software'}</span>
      </div>
      <div className="hm-inst-body">
        <div className="hm-verdict">
          <div className="hm-vlabel">Fused verdict</div>
          <div className="hm-vmain">
            <span className={`hm-word hm-tone-${tone} ${!resolved ? 'scrambling' : ''}`}>{live}</span>
            <span className="hm-vent">{result.scry && result.scry.asn ? `AS${result.scry.asn}` : SEED.node.value} · {(result.scry && result.scry.country) || 'SC'}</span>
          </div>
          <p className={`hm-vsub ${resolved ? 'on' : ''}`}>
            A <b>live, signed verdict</b> on a genuinely-observed attacker — Scry has it in the corpus; routing analysis (GhostRoute) is still warming. One call returns the fused answer <b>and</b> a receipt you can verify offline.
          </p>
          <div className="hm-lenses">
            {rows.map((row, i) => (
              <div key={row.key} className={`hm-lensrow ${reveal > i ? 'on' : ''}`}>
                <span className={`hm-lname hm-${row.key}`}>{row.name}</span>
                <span className="hm-lval">{row.val}</span>
                <span className={`hm-pill hm-pill-${row.tone}`}>{row.pill}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hm-receipt">
          <div className="hm-rlabel">Signed receipt</div>
          <pre className="hm-code">
<span className="hm-k">"entity"</span>:      <span className="hm-s">"{result.node ? result.node.value : DEMO_NODE}"</span>,
<span className="hm-k">"verdict"</span>:     <span className={`hm-${tone === 'clean' ? 's' : 'sig'}`}>"{cl.verdict || 'warn'}"</span>,
<span className="hm-k">"tier"</span>:        <span className="hm-s">"{rcpt.attestation_strength || 'software'}"</span>,
<span className="hm-k">"scry"</span>:        {'{'} obs:<span className="hm-n">{result.scry && result.scry.observation_count != null ? result.scry.observation_count : 0}</span>, class:<span className="hm-s">"{(cl.adversary_class && cl.adversary_class.classification) || 'unknown'}"</span> {'}'},
<span className="hm-k">"sigil"</span>:       {'{'} indexed:<span className="hm-k">false</span> {'}'},
<span className="hm-k">"ghostroute"</span>:  {'{'} status:<span className="hm-s">"warming"</span> {'}'},
<span className="hm-k">"trust"</span>:       <span className="hm-n">{typeof cl.trust_score === 'number' ? cl.trust_score.toFixed(4) : '0.6154'}</span>,
<span className="hm-k">"sig"</span>:         <span className="hm-sig">"{sigShort}"</span>,
<span className="hm-k">"ts"</span>:          <span className="hm-s">"{rcpt.timestamp || SEED.receipt.timestamp}"</span>
          </pre>
          <div className="hm-curl"><span className="hm-p">$</span> curl -X POST <span className="hm-u">https://data.tunnelmind.ai/v1/verify/{DEMO_NODE}</span></div>
        </div>
      </div>
    </div>
  )
}

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
          <HeroInstrument />
        </section>

        <section className="hm-block" id="join">
          <div className="hm-sechead"><h2>The moat is the join</h2><p>Any incumbent sells you one lens. None can compute the verdict where the lenses meet — that fused result is the product.</p></div>
          <Counters />
          <div className="hm-join">
            <div className="hm-joindiag" aria-hidden="true">
              <svg viewBox="0 0 400 400">
                <path className="hm-strand" d="M200,200 L200,56" />
                <path className="hm-strand" d="M200,200 L324,272" style={{ animationDelay: '.35s' }} />
                <path className="hm-strand" d="M200,200 L76,272" style={{ animationDelay: '.7s' }} />
                <path className="hm-strand" d="M200,200 L200,344" style={{ animationDelay: '1.05s' }} />
                <g stroke="#1A2233" strokeWidth="1" fill="none"><polygon points="200,40 339,280 61,280" /><polygon points="200,360 61,120 339,120" /></g>
                <g fill="#0E1422" strokeWidth="1.6">
                  <circle className="hm-jnode" cx="200" cy="56" r="30" stroke="#E25A40" />
                  <circle className="hm-jnode" cx="324" cy="272" r="30" stroke="#C9A86A" style={{ animationDelay: '.6s' }} />
                  <circle className="hm-jnode" cx="76" cy="272" r="30" stroke="#6A93D6" style={{ animationDelay: '1.2s' }} />
                  <circle className="hm-jnode" cx="200" cy="344" r="30" stroke="#D9A23A" style={{ animationDelay: '1.8s' }} />
                </g>
                <circle cx="200" cy="200" r="42" fill="#0B0F18" stroke="#C9A86A" strokeWidth="1.6" />
                <text className="hm-jlabel" x="200" y="197" textAnchor="middle" fill="#E9E5D8" style={{ fontSize: '12px' }}>VERDICT</text>
                <text className="hm-jlabel" x="200" y="212" textAnchor="middle" fill="#79839A" style={{ fontSize: '9px' }}>+ receipt</text>
                <text className="hm-jlabel" x="200" y="60" textAnchor="middle" fill="#E25A40">SCRY</text>
                <text className="hm-jlabel" x="324" y="276" textAnchor="middle" fill="#C9A86A">SIGIL</text>
                <text className="hm-jlabel" x="76" y="276" textAnchor="middle" fill="#6A93D6">GHOST</text>
                <text className="hm-jlabel" x="200" y="348" textAnchor="middle" fill="#D9A23A">TRACK</text>
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
          <div className="hm-sechead"><h2>Pricing</h2><p>Identifiers resolve free, forever. 50 checks/day free. Beyond that: machines pay per call, humans buy keys. <a className="hm-inline" href="/pricing" onClick={go('pricing')}>Full pricing →</a></p></div>
          <div className="hm-price">
            <div className="hm-pcard"><div className="hm-who">Free tier</div><div className="hm-amt">50<small> / day</small></div><p className="hm-desc">Every OAI resolves free, forever. The radar sample is public. <b>50 Data-API checks a day</b>, no account.</p><div className="hm-rail">rail · open · no key</div></div>
            <div className="hm-pcard" style={{ borderColor: 'var(--hm-gold-dim)' }}><div className="hm-who">For agents</div><div className="hm-amt">x402<small> · USDC</small></div><p className="hm-desc">Pay-per-call <b>stablecoin micropayments</b>. No account, settles inline over HTTP 402. Per-endpoint pricing in the OpenAPI extension.</p><div className="hm-rail">rail · x402 · machine-native</div></div>
            <div className="hm-pcard"><div className="hm-who">For humans</div><div className="hm-amt">Stripe<small> · key</small></div><p className="hm-desc">API key via Stripe for depth and scale. No subscription trap — buy a prepaid block, top up when you run out.</p><div className="hm-rail">rail · Stripe · <a className="hm-inline" href="/pricing" onClick={go('pricing')}>details</a></div></div>
          </div>
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

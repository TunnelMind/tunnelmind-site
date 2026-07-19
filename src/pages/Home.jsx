import React, { useEffect, useRef } from 'react'
import VerifyWidget from '../components/VerifyWidget.jsx'

// P56: canned trace for the <verify-trace> marketing loop in the join
// section. Deliberately a HOSTILE example (the hero's live console defaults
// to a clean one) so both outcomes are on the page. This is illustrative
// and labeled as such below the component; the live path is the console.
const CANNED_TRACE = {
  node: '203.0.113.45',
  steps: [
    { lens: 'Scry',       finding: '3 hostile observations · last 4h · Familiar SFO-2', status: 'HOSTILE', bad: true },
    { lens: 'Sigil',      finding: '1,204 sells_through edges · 2 unauthorized paths',  status: 'SPOOFED', bad: true },
    { lens: 'Tracker',    finding: '5 demand beacons · matches surveillance vendor',    status: 'FLAGGED', bad: true },
    { lens: 'GhostRoute', finding: 'RPKI invalid · origin AS mismatch',                 status: 'INVALID', bad: true },
  ],
  verdict: {
    verdict: 'UNTRUSTED', score: 0.12, tier: 'software-attested',
    summary: 'attack + supply + routing corroborate', bad: true,
  },
}

function TraceDemo() {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.data = CANNED_TRACE }, [])
  return (
    <div className="hm-tracedemo">
      <verify-trace ref={ref} autoplay="" loop="" />
      <p className="hm-tracelabel">
        Illustrative example: a canned trace of a hostile node, played on a loop.
        The console above runs the real thing.
      </p>
    </div>
  )
}

// Home — the root. As of 2026-07 the hero IS the live product: an interactive
// cross-lens Verify console (src/components/VerifyWidget.jsx), not a scripted
// auto-demo. A visitor types any host and gets a real, signed verdict on the
// spot — free tier, right on the landing page.
//
// P55: the page is the document area of a wp-mac window (chrome lives in
// App.jsx). The old animated radar backdrop is gone — a 1991 Mac doesn't
// shimmer. Live counters moved to the window's status bar (App.jsx).
// The WP button bar below maps the ribbon to the four lenses + verify.

export default function Home({ onNavigate }) {
  const go = (page) => (e) => { if (onNavigate) { e.preventDefault(); onNavigate(page) } }

  return (
    <div className="hm-page">
      <div className="wpm-buttonbar" role="navigation" aria-label="Lenses">
        <a className="wpm-bb-btn" href="#top" aria-current="true">Verify</a>
        <a className="wpm-bb-btn" href="#lens-scry">Scry</a>
        <a className="wpm-bb-btn" href="#lens-sigil">Sigil</a>
        <a className="wpm-bb-btn" href="#lens-tracker">Tracker</a>
        <a className="wpm-bb-btn" href="#lens-ghostroute">GhostRoute</a>
      </div>

      <div className="hm-wrap" id="top">
        <section className="hm-hero">
          <p className="hm-eyebrow">Trust attestation &middot; the agentic internet</p>
          <h1 className="hm-h1">Ask one question. Get a verdict <span className="hm-qt">no single feed can return.</span></h1>
          <p className="hm-lede">The web is filling with traffic no human ever typed. TunnelMind resolves any IP, ASN, domain, or ad-tech entity through four correlated lenses and returns <strong>one signed verdict</strong>. Every observation is Ed25519-signed at the source, so the data proves where it came from.</p>
          <VerifyWidget onNavigate={onNavigate} />
        </section>

        <section className="hm-block" id="join">
          <div className="hm-sechead"><h2>The moat is the join</h2><p>Any incumbent sells you one lens. None can compute the verdict where the lenses meet. That fused result is the product.</p></div>
          <div className="hm-join">
            <div className="hm-joindiag" aria-hidden="true">
              <svg viewBox="0 0 400 400">
                {/* Four lenses at the points of a diamond — four sides, four lenses —
                    each one's evidence converging on the verdict at the centre. */}
                <g stroke="#000" strokeWidth="1" fill="none">
                  <polygon points="200,56 344,200 200,344 56,200" />
                  <polygon points="200,114 286,200 200,286 114,200" />
                </g>
                <path className="hm-strand" d="M200,200 L200,56" />
                <path className="hm-strand" d="M200,200 L344,200" />
                <path className="hm-strand" d="M200,200 L200,344" />
                <path className="hm-strand" d="M200,200 L56,200" />
                <g fill="#fff" stroke="#000" strokeWidth="2">
                  <circle className="hm-jnode" cx="200" cy="56" r="30" />
                  <circle className="hm-jnode" cx="344" cy="200" r="30" />
                  <circle className="hm-jnode" cx="200" cy="344" r="30" />
                  <circle className="hm-jnode" cx="56" cy="200" r="30" />
                </g>
                <circle cx="200" cy="200" r="42" fill="#000" stroke="#000" strokeWidth="2" />
                <text className="hm-jlabel" x="200" y="197" textAnchor="middle" fill="#fff" style={{ fontSize: '12px' }}>VERDICT</text>
                <text className="hm-jlabel" x="200" y="212" textAnchor="middle" fill="#fff" style={{ fontSize: '9px' }}>+ receipt</text>
                <text className="hm-jlabel" x="200" y="60" textAnchor="middle" fill="#000">SCRY</text>
                <text className="hm-jlabel" x="344" y="204" textAnchor="middle" fill="#000">SIGIL</text>
                <text className="hm-jlabel" x="200" y="348" textAnchor="middle" fill="#000">TRACK</text>
                <text className="hm-jlabel" x="56" y="204" textAnchor="middle" fill="#000">GHOST</text>
              </svg>
            </div>
            <div className="hm-joincopy">
              <h3>One graph, four questions</h3>
              <p>Who is attacking &middot; who can be trusted to transact &middot; who is watching &middot; and where the traffic actually goes. One correlated graph, queried in a single call.</p>
              <div className="hm-moat">attack&nbsp;&times;&nbsp;trust&nbsp;&times;&nbsp;tracker&nbsp;&times;&nbsp;routing<br />= a verdict no siloed feed can produce.</div>
              <p style={{ marginTop: '21px' }}>A threat feed says the actor is hostile. An RPKI validator says the route is clean. <strong>Only the join knows they're the same entity, and what to do about it.</strong></p>
            </div>
          </div>
          <TraceDemo />
        </section>

        <section className="hm-block" id="lenses">
          <div className="hm-sechead"><h2>Four lenses</h2><p>Status shown straight, and today that status is: all four live. Each lens also answers on its own, so you can query the join's inputs yourself.</p></div>
          <div className="hm-lensgrid">
            <div className="hm-lcard" id="lens-scry"><div className="hm-ltop"><span className="hm-lh hm-scry">Scry</span><span className="hm-status live">live</span></div><p>Signed observations of hostile network actors: IPs, ASNs, behaviors, threat-feed overlap, actor classification.</p><div className="hm-stat">Familiar honeypots + Augur crawler</div><div className="hm-stat" style={{ marginTop: 8 }}><a href="https://api.tunnelmind.ai">api.tunnelmind.ai &rarr;</a></div></div>
            <div className="hm-lcard" id="lens-sigil"><div className="hm-ltop"><span className="hm-lh hm-sigil">Sigil</span><span className="hm-status live">live</span></div><p>Programmatic-advertising supply-graph trust. Publishers, SSPs, DSPs, OpenRTB SupplyChain, entity trust scoring.</p><div className="hm-stat">ads.txt / sellers.json supply graph</div><div className="hm-stat" style={{ marginTop: 8 }}><a href="https://data.tunnelmind.ai">data.tunnelmind.ai &rarr;</a></div></div>
            <div className="hm-lcard" id="lens-ghostroute"><div className="hm-ltop"><span className="hm-lh hm-ghost">GhostRoute</span><span className="hm-status live">live</span></div><p>Routing integrity and sovereignty. Origin AS, RPKI validity, claimed vs. actual sovereign zone, first-party CT witnessing.</p><div className="hm-stat">BGP / RPKI / certificate transparency</div><div className="hm-stat" style={{ marginTop: 8 }}><a href="https://data.tunnelmind.ai/v1/ghostroute/check/api.anthropic.com">/v1/ghostroute/check &rarr;</a></div></div>
            <div className="hm-lcard" id="lens-tracker"><div className="hm-ltop"><span className="hm-lh hm-tracker">Tracker</span><span className="hm-status live">live</span></div><p>The demand-side graph: who is watching whom on the open web. DDG / IAB / Disconnect normalized into one surveillance graph with a lens-owned verdict.</p><div className="hm-stat">80k domains &middot; 3k entities</div><div className="hm-stat" style={{ marginTop: 8 }}><a href="https://data.tunnelmind.ai/v1/tracker/verify/doubleclick.net">/v1/tracker/verify &rarr;</a></div></div>
          </div>
        </section>

        <section className="hm-block" id="model">
          <div className="hm-sechead"><h2>Open the protocol, sell the node</h2><p>The format anyone can implement is free. The graph that's expensive to build is the business. Clean line, no bait.</p></div>
          <div className="hm-split">
            <div className="hm-col hm-open"><div className="hm-ch"><h3>Open protocol</h3><span className="hm-tag">free &middot; open</span></div>
              <ul><li><span className="hm-m">&#9656;</span><b>OAI</b>: free-to-resolve handle for every actor</li><li><span className="hm-m">&#9656;</span><b>ATAP</b>: capability tokens, witness chains, receipts</li><li><span className="hm-m">&#9656;</span><b>Receipt format</b>: the signed verdict envelope</li><li><span className="hm-m">&#9656;</span><b>Reference verifier + SDK</b></li></ul>
              <p className="hm-foot">Value = ubiquity. The more who verify, the stronger the standard.</p></div>
            <div className="hm-col hm-paid"><div className="hm-ch"><h3>Monetized node</h3><span className="hm-tag">metered</span></div>
              <ul><li><span className="hm-m">&#9656;</span><b>Hosted /v1/verify</b>: the live fused graph</li><li><span className="hm-m">&#9656;</span><b>Graph data</b>: bulk, historical, deltas</li><li><span className="hm-m">&#9656;</span><b>Verticals</b>: ad-tech, threat, sovereignty feeds</li><li><span className="hm-m">&#9656;</span><b>SLA + private deployment</b></li></ul>
              <p className="hm-foot">Value = scarcity. The corpus is the moat; the format isn't.</p></div>
          </div>
        </section>

        <section className="hm-block" id="pricing">
          <div className="hm-sechead"><h2>Go deeper</h2><p>The verdict above is free: 50 checks a day, no account. When you need depth or scale, two doors. <a className="hm-inline" href="/pricing" onClick={go('pricing')}>Full pricing &rarr;</a></p></div>
          <div className="hm-price">
            <div className="hm-pcard"><div className="hm-who">Humans</div><div className="hm-amt">$20<small> &middot; block</small></div><p className="hm-desc">Buy a prepaid block of checks and get an API key on the spot via Stripe. No subscription. Top up when you run out.</p><div className="hm-rail"><a className="hm-inline" href="/pricing" onClick={go('pricing')}>Buy a block &rarr;</a></div></div>
            <div className="hm-pcard"><div className="hm-who">Agents</div><div className="hm-amt">x402<small> &middot; USDC</small></div><p className="hm-desc">Machine-native pay-per-call. No account, settles inline over HTTP 402. Point your agent and go.</p><div className="hm-rail"><a className="hm-inline" href="/pricing" onClick={go('pricing')}>Agent rail &rarr;</a></div></div>
          </div>
          <p className="hm-buildnote">Building? <a className="hm-inline" href="/api" onClick={go('api')}>Docs &amp; API</a> &middot; <a className="hm-inline" href="/llms.txt">llms.txt</a> &middot; MCP at <a className="hm-inline" href="/api" onClick={go('api')}>mcp.tunnelmind.ai</a></p>
        </section>

        <section className="hm-block" id="agents">
          <div className="hm-sechead"><h2>For autonomous agents</h2><p>Streamable HTTP, JSON-RPC 2.0, all three listed in the official MCP registry. Point your agent and go. Beyond the verdict: verify a claimed crawler's IP, safety-scan an MCP server before wiring it in, preflight any action. <a className="hm-inline" href="/api" onClick={go('api')}>All in the docs</a>.</p></div>
          <div className="hm-mcp">
            <div className="hm-mcprow"><span className="hm-mu">mcp-data.tunnelmind.ai/mcp</span><span className="hm-md">ai.tunnelmind/data</span><span className="hm-mt">78 tools</span></div>
            <div className="hm-mcprow"><span className="hm-mu">mcp.tunnelmind.ai/mcp</span><span className="hm-md">ai.tunnelmind/scry</span><span className="hm-mt">12 tools</span></div>
            <div className="hm-mcprow"><span className="hm-mu">mcp.sigil.tunnelmind.ai/mcp</span><span className="hm-md">ai.tunnelmind/sigil</span><span className="hm-mt">12 tools</span></div>
          </div>
          <p className="hm-buildnote" style={{ textAlign: 'left' }}>Discovery &middot; <a className="hm-inline" href="/.well-known/ai-services.json">ai-services.json</a> &middot; <a className="hm-inline" href="/agent-onboarding.md">agent-onboarding.md</a> &middot; <a className="hm-inline" href="/llms.txt">llms.txt</a> &middot; No MCP? The same surface is <a className="hm-inline" href="https://data.tunnelmind.ai/openapi.yaml">OpenAPI 3.1</a>: Gemini and Google ADK function-calling consume it directly.</p>
        </section>

        <section className="hm-block" id="standards">
          <div className="hm-sechead"><h2>Standards we edit</h2><p>Attestation only works if it's open. We publish the specs the verdicts are built on. Citation-grade, free.</p></div>
          <div className="hm-lensgrid">
            <div className="hm-lcard"><div className="hm-ltop"><span className="hm-lh">OAI</span><span className="hm-status live">v1.0</span></div><p>Observed Actor Identifier: a permanent, free-to-resolve handle for every actor on the network. A resolver, never an identity issuer.</p><div className="hm-stat"><a href="https://tunnelmind.ai/oai/standard">Read the spec &rarr;</a></div></div>
            <div className="hm-lcard"><div className="hm-ltop"><span className="hm-lh">ATAP</span><span className="hm-status beta">v0.1</span></div><p>Agent Trust Attestation Protocol: tiers a verdict's attestation from self-asserted through software and tee-tpm to silicon-root. Public comment through 2026-08-12.</p><div className="hm-stat"><a href="https://tunnelmind.ai/atap/standard">Read the spec &rarr;</a></div></div>
          </div>
        </section>
      </div>
    </div>
  )
}

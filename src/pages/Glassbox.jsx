import React, { useEffect, useState } from 'react'
import LensAnatomy from '../components/LensAnatomy.jsx'
import GhostRouteLive from '../components/GhostRouteLive.jsx'
import { LENSES, RECEIPT_FORMAT, STATS_ENDPOINT, SCRY_STATS_ENDPOINT, ATTESTATION_TIERS } from '../config/glassbox.js'

// /glassbox — The Transparent Lens Exhibit (P-GLASSBOX).
// Each lens is a glass box: the real pipeline, real code, real schema, real
// receipts. The deliberate opposite of an AI black box — every claim traces to
// a file, every metric is fetched live, GhostRoute streams so the page breathes.

export default function Glassbox() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let alive = true
    // Live headline numbers. No hardcoded metric (§0.1) — on failure the panels
    // each render an honest "momentarily unavailable", not a fabricated count.
    const get = (u) =>
      fetch(u, { headers: { Accept: 'application/json' } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    Promise.all([get(STATS_ENDPOINT), get(SCRY_STATS_ENDPOINT)]).then(([eco, scry]) => {
      if (!alive || !eco) return
      // /api/ecosystem-stats carries the data-api envelope {ok,data}; unwrap.
      const data = eco && eco.data ? eco.data : eco
      // Backfill Scry's headline from scry-server when the four-lens feed is null,
      // so the live number is real rather than a needless "unavailable".
      if (data && data.lenses && data.lenses.scry &&
          data.lenses.scry.observations_total == null &&
          scry && typeof scry.total_observations === 'number') {
        data.lenses.scry.observations_total = scry.total_observations
      }
      setStats(data)
    })
    return () => { alive = false }
  }, [])

  return (
    <main className="gb-page">
      {/* Hero — the thesis, plainly. No mystique. */}
      <section className="gb-hero">
        <p className="gb-hero-kicker mono">the transparent lens exhibit</p>
        <h1 className="gb-hero-title">A trust layer whose own workings are public.</h1>
        <p className="gb-hero-lede">
          Four lenses watch one corpus. This page shows each one as a glass box — the real
          pipeline, the real code from this repository, the real schema, the real signed
          receipts. Every claim below links to a file. Every number is fetched live. We do
          not decorate over the machine; the machine <em>is</em> the exhibit.
        </p>
        <div className="gb-hero-affords mono">
          <a href="/GLASSBOX-MANIFEST.md" className="gb-afford">▸ the manifest — every claim → a file</a>
          <a href="#gb-lenses" className="gb-afford">▸ the four glass boxes</a>
          <a href="/standards" className="gb-afford">▸ the open verification layer</a>
        </div>
      </section>

      {/* The page that breathes */}
      <GhostRouteLive />

      {/* Four glass boxes */}
      <section className="gb-lenses" id="gb-lenses">
        {LENSES.map((lens) => (
          <LensAnatomy key={lens.key} lens={lens} stats={stats} />
        ))}
      </section>

      {/* The receipt — JCS + Ed25519, the open verification layer */}
      <section className="gb-receipt">
        <div className="gb-section-h mono">the receipt — reproducible trust</div>
        <h2 className="gb-receipt-title">{RECEIPT_FORMAT.title}</h2>
        <p className="gb-receipt-note">{RECEIPT_FORMAT.note}</p>
        <figure className="gb-specimen">
          <figcaption className="gb-specimen-cap mono">
            <span className="gb-specimen-path">{RECEIPT_FORMAT.specimen.path}</span>
            <span className="gb-specimen-lang">{RECEIPT_FORMAT.specimen.lang} · L{RECEIPT_FORMAT.specimen.lines}</span>
          </figcaption>
          <pre className="gb-code mono"><code>{RECEIPT_FORMAT.specimen.code}</code></pre>
        </figure>
        <p className="gb-receipt-verify mono">{RECEIPT_FORMAT.verify}</p>
        <div className="gb-tiers">
          <span className="gb-tiers-h mono">attestation strength, low → high:</span>
          {ATTESTATION_TIERS.map((t, i) => (
            <span key={t} className={`gb-tier gb-tier-${i} mono`}>{t}</span>
          ))}
        </div>
      </section>

      {/* Footer — the open-protocol invitation + the one-line redaction rationale */}
      <footer className="gb-foot">
        <p className="gb-foot-line">
          <strong>Open in full:</strong> the receipt format, the verification logic, the
          normalization code, every schema, the architecture. <strong>Gated:</strong> the
          honeypot/crawler identifiers that let an adversary evade the sensors, and the bulk
          graph rows that are the product. Schema is open; rows are gated.
        </p>
        <p className="gb-foot-sub mono">
          the boundary above is enforced, not aspirational — each pipeline's collection
          stage shows shape only; every schema is open; no bulk row is fetched by this page.
          discovery map: <a href="/GLASSBOX-MANIFEST.md">manifest</a> · redaction boundary:{' '}
          <a href="/REDACTION-LIST.md">what's gated &amp; why</a> · open verifier:{' '}
          <a href="/standards">standards</a> · the endpoints: <a href="/api">API</a>
        </p>
      </footer>
    </main>
  )
}

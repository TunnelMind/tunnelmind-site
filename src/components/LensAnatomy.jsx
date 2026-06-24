import React from 'react'

// LensAnatomy — one illuminated schematic of one lens (P-GLASSBOX §2).
// Instantiated four times. Top-to-bottom: identity → pipeline → specimen →
// schema → receipt/curl → live metric. Scaffolded/blueprint parts render
// visibly distinct from live ones — never dressed up as working (§0.2).

const ACCENT = { cyan: 'var(--accent-cyan)', green: 'var(--accent-green)', purple: 'var(--accent-purple)', amber: 'var(--accent-amber)' }
const BADGE = {
  LIVE:       { cls: 'gb-badge-live',  text: 'LIVE' },
  PARTIAL:    { cls: 'gb-badge-part',  text: 'PARTIAL' },
  SCAFFOLDED: { cls: 'gb-badge-scaf',  text: 'SCAFFOLDED' },
}

function fmtInt(n) {
  if (n == null || Number.isNaN(n)) return null
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

export default function LensAnatomy({ lens, stats }) {
  const badge = BADGE[lens.buildState] || BADGE.SCAFFOLDED
  const accent = ACCENT[lens.accent] || 'var(--accent-green)'

  // Live metric: index lens.metric.path into the stats payload. null is honest
  // ("momentarily unavailable — never a silent zero"), not rendered as 0.
  const lensStats = stats && stats.lenses ? stats.lenses[lens.metric.path[0]] : null
  const raw = lensStats ? lensStats[lens.metric.path[1]] : undefined
  const metricVal = raw == null ? null : fmtInt(raw)

  return (
    <article className="gb-lens" style={{ '--lens': accent }}>
      {/* 1. Identity */}
      <header className="gb-lens-id">
        <div className="gb-lens-idrow">
          <span className="gb-lens-dot" aria-hidden="true" />
          <h3 className="gb-lens-name">{lens.name}</h3>
          <span className={`gb-badge ${badge.cls} mono`}>{badge.text}</span>
        </div>
        <p className="gb-lens-watches">{lens.watches}</p>
      </header>

      {/* 2. Pipeline schematic */}
      <div className="gb-section">
        <div className="gb-section-h mono">pipeline</div>
        <ol className="gb-pipe">
          {lens.pipeline.map((n, i) => (
            <li key={n.stage} className={`gb-node${n.blueprint ? ' gb-node-bp' : ''}${n.sensitive ? ' gb-node-sens' : ''}`}>
              <span className="gb-node-stage mono">{n.stage}</span>
              <span className="gb-node-label">
                {n.label}
                {n.sensitive && <span className="gb-node-lock" title="shape only — identifier abstracted (REDACTION-LIST)"> shape only</span>}
              </span>
              {n.lang && <span className="gb-node-lang mono">{n.lang}</span>}
              {i < lens.pipeline.length - 1 && <span className="gb-node-arrow" aria-hidden="true">→</span>}
            </li>
          ))}
        </ol>
      </div>

      {/* 3. Specimen — verbatim code, captioned with real file path */}
      <div className="gb-section">
        <div className="gb-section-h mono">specimen — real code, this repo</div>
        {lens.specimens.map((s) => (
          <figure key={s.path} className="gb-specimen">
            <figcaption className="gb-specimen-cap mono">
              <span className="gb-specimen-path">{s.path}</span>
              <span className="gb-specimen-lang">{s.lang} · L{s.lines}</span>
            </figcaption>
            <pre className="gb-code mono"><code>{s.code}</code></pre>
          </figure>
        ))}
      </div>

      {/* 4. Schema — real columns, marked open */}
      <div className="gb-section">
        <div className="gb-section-h mono">schema <span className="gb-open-tag">open</span></div>
        <div className="gb-schema">
          <div className="gb-schema-title mono">{lens.schema.title}</div>
          <table className="gb-schema-tbl mono">
            <tbody>
              {lens.schema.fields.map(([name, type]) => (
                <tr key={name}><td className="gb-col-name">{name}</td><td className="gb-col-type">{type}</td></tr>
              ))}
            </tbody>
          </table>
          {lens.schema.note && <p className="gb-schema-note">{lens.schema.note}</p>}
        </div>
      </div>

      {/* 5. Reproduce it — the curl that regenerates this lens's output */}
      <div className="gb-section">
        <div className="gb-section-h mono">reproduce — run it yourself</div>
        <pre className="gb-curl mono"><code>{lens.curl}</code></pre>
      </div>

      {/* 6. Live metric — fetched, never hardcoded */}
      <div className="gb-metric">
        {metricVal == null ? (
          <span className="gb-metric-na mono" title="upstream reported null — momentarily unavailable, never a silent zero">
            metric momentarily unavailable
          </span>
        ) : (
          <>
            <span className="gb-metric-num">{metricVal}</span>
            <span className="gb-metric-lbl">{lens.metric.label}</span>
          </>
        )}
        <span className="gb-metric-src mono">
          live · /v1/stats{stats && stats.snapshot_at ? ` · as of ${new Date(stats.snapshot_at).toLocaleDateString()}` : ''}
        </span>
      </div>
    </article>
  )
}

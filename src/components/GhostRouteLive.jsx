import React, { useEffect, useRef, useState } from 'react'
import { GHOSTROUTE_LIVE_ENDPOINT, GHOSTROUTE_POLL_MS } from '../config/glassbox.js'

// GhostRouteLive — the page that breathes (P-GLASSBOX §3).
//
// Polls a read-only same-origin proxy that COMPOSES three already-collected
// GhostRoute reads (proofs / witness / alerts). It triggers no collection. The
// connection state is honest: 'idle' before the first read, 'live' while reads
// land, 'reconnecting' when one fails. We never animate a pulse the stream can't
// back — a dead stream that says it's dead is on-brand; a fake one is the exact
// thing this exhibit opposes.

const SHORT = (h) => (typeof h === 'string' && h.length > 12 ? h.slice(0, 12) + '…' : h || '—')

export default function GhostRouteLive() {
  const [conn, setConn] = useState('idle')          // 'idle' | 'live' | 'reconnecting'
  const [proofs, setProofs] = useState([])
  const [witness, setWitness] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [asOf, setAsOf] = useState(null)
  const seen = useRef(new Set())                      // cert_sha256 → mark fresh glyphs
  const timer = useRef(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    const poll = async () => {
      try {
        const r = await fetch(GHOSTROUTE_LIVE_ENDPOINT, { headers: { Accept: 'application/json' } })
        if (!r.ok) throw new Error(`status ${r.status}`)
        const body = await r.json()
        if (!alive.current) return
        const recent = (body.proofs && body.proofs.recent) || []
        // Tag glyphs we haven't drawn before so the lattice "receives" them.
        for (const p of recent) if (p.cert_sha256) p.__fresh = !seen.current.has(p.cert_sha256)
        for (const p of recent) if (p.cert_sha256) seen.current.add(p.cert_sha256)
        setProofs(recent)
        setWitness(body.witness || null)
        setAlerts(body.alerts || null)
        setAsOf(body.as_of || null)
        setConn('live')
      } catch {
        // Keep last good data on screen, but tell the truth about the link.
        if (alive.current) setConn((c) => (c === 'idle' ? 'idle' : 'reconnecting'))
      } finally {
        if (alive.current) timer.current = setTimeout(poll, GHOSTROUTE_POLL_MS)
      }
    }
    poll()
    return () => { alive.current = false; if (timer.current) clearTimeout(timer.current) }
  }, [])

  const logCount = witness && Array.isArray(witness.logs) ? witness.logs.length : null
  const allVerified = witness && Array.isArray(witness.logs)
    ? witness.logs.every((l) => l.signature_verified) : null
  const alertTotal = alerts && alerts.summary ? alerts.summary.total : null

  return (
    <section className="gb-live" aria-label="GhostRoute live routing pulse">
      <div className="gb-live-head">
        <div>
          <h3 className="gb-live-title">GhostRoute — live routing pulse</h3>
          <p className="gb-live-sub">
            Already-collected CT inclusion proofs, streamed read-only. The public page triggers no collection.
          </p>
        </div>
        <ConnPill conn={conn} />
      </div>

      {/* Witness health — the trust context that makes one proof mean something */}
      <div className="gb-live-context mono">
        <span>
          {logCount == null ? 'witness: —'
            : `${logCount} CT logs independently witnessed`}
        </span>
        <span className={allVerified === false ? 'text-red' : 'text-green'}>
          {allVerified == null ? '' : allVerified ? '· all STH signatures verified' : '· SIGNATURE REGRESSION'}
        </span>
        <span className={alertTotal ? 'text-red' : 'text-green'}>
          {alertTotal == null ? '' : alertTotal === 0
            ? '· 0 equivocation events — append-only integrity holding'
            : `· ${alertTotal} EQUIVOCATION EVENTS`}
        </span>
      </div>

      {/* The lattice — each proof a verified glyph */}
      <ul className="gb-lattice">
        {proofs.length === 0 && (
          <li className="gb-glyph gb-glyph-empty mono">
            {conn === 'idle' ? 'connecting to the lattice…' : 'no proofs in window'}
          </li>
        )}
        {proofs.map((p, i) => (
          <li key={p.cert_sha256 || i} className={`gb-glyph${p.__fresh ? ' gb-glyph-fresh' : ''}`}>
            <span className="gb-glyph-mark" aria-hidden="true">◇</span>
            <span className="gb-glyph-domain mono">{p.domain}</span>
            {p.ai_owner && <span className="gb-glyph-owner">{p.ai_owner}</span>}
            <span className="gb-glyph-meta mono">
              {p.log_operator} · {p.inclusion_proven ? 'proven' : (p.reason || 'pending')} · {SHORT(p.cert_sha256)}
            </span>
          </li>
        ))}
      </ul>

      <div className="gb-live-foot mono">
        <span>source: /api/ghostroute/live → /v1/ghostroute/{'{proofs,witness,alerts}'}</span>
        {asOf && <span>as of {new Date(asOf).toLocaleTimeString()}</span>}
      </div>
    </section>
  )
}

function ConnPill({ conn }) {
  const map = {
    live:         { label: 'LIVE',         cls: 'gb-pill-live' },
    reconnecting: { label: 'reconnecting', cls: 'gb-pill-warn' },
    idle:         { label: 'idle',         cls: 'gb-pill-idle' },
  }
  const s = map[conn] || map.idle
  return (
    <span className={`gb-pill ${s.cls} mono`}>
      <span className="gb-pill-dot" aria-hidden="true" />
      {s.label}
    </span>
  )
}

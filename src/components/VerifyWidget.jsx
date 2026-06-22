import React, { useEffect, useRef, useState } from 'react'
import { ATTESTATION_TIERS } from '../config/facts.js'

// VerifyWidget — the hero's interactive proof. It answers the two questions
// HN keeps asking ("what's your selling point vs ipinfo?" and "do you have
// the scale?") in one motion: four siloed lenses light up in sequence and
// CONVERGE into one fused, Ed25519-signed verdict a single-source data
// vendor cannot produce.
//
// Why a baked-in default instead of a live call on first paint: the upstream
// /v1/verify is edge-cached and fast warm (~1s) but slow cold (seen up to
// ~18s, occasionally >30s). A flaky 30s call on the hero hot path is worse
// than no widget, so we ship a REAL captured receipt for api.anthropic.com
// as the instant initial state (genuine signature, re-verifiable) and treat
// live lookups as progressive enhancement through the same-origin proxy.

// ── A real, captured /v1/verify result for api.anthropic.com ──────────────
// Pulled live from data.tunnelmind.ai/v1/verify; trimmed to what the widget
// draws. The signature is genuine — "verify the receipt" really verifies.
const SEED = {
  node: { type: 'domain', value: 'api.anthropic.com' },
  scry: { available: false, reason: 'scry_domain_resolution_v2' },
  sigil: { available: true, in_supply_graph: false },
  ghostroute: {
    available: true,
    origin_as: 'AS399358',
    origin_asn_name: 'ANTHROPIC - Anthropic, PBC, US',
    rpki_status: 'VALID',
    claimed_sovereign_zone: 'US',
    sovereign_tier: 'VERIFIED',
    ai_owner: 'Anthropic',
    sanctions_match: false,
    finding: 'Infrastructure is consistent with the claimed US sovereignty.',
  },
  cross_lens: {
    verdict: 'pass',
    trust_score: 0.75,
    confidence: 0.8,
    adversary_class: { classification: 'unknown' },
    issued_by: 'OAI-2026-0000201',
  },
  receipt: {
    receipt_id: '019ebe80-b772-71d6-9f0c-10fed479dc6c',
    attestation_strength: 'software',
    signature: {
      algorithm: 'Ed25519',
      key_id: 'tm-receipt-2026-05',
      public_key: 'U18ONQCXr/Ox3Ac1ShKB1zYRcPIM9Sp9yZrka1jzoCY=',
      value: 'lVUc2StY0L2XQl1PAi+IWJ34RIgQiVMZcyCZrE/TqxSA3oyxkcve+q6H1W3V1QZYB1yUWZc/VYBqtLvzqeTpDQ==',
    },
    subject: 'api.anthropic.com',
  },
}

// A couple of warm, curated examples so a curious visitor gets an instant
// second data point without typing — and so the convergence reads as "this
// works on anything," not one cherry-picked host.
const EXAMPLES = ['api.anthropic.com', '8.8.8.8', 'openai.com']

// ── Map a verify result into four lens rows ───────────────────────────────
// Verify returns scry / sigil / ghostroute blocks plus a cross_lens verdict
// whose adversary_class carries the Tracker (surveillance) signal, so we
// derive the Tracker row from there. tone drives the dot color.
function lensRows(r) {
  const cl = r.cross_lens || {}
  const adv = cl.adversary_class || {}
  const gr = r.ghostroute || {}

  // Scry — hostile network observation
  const scry = r.scry || {}
  const scryRow = scry.available
    ? { status: 'hostile signal present', detail: 'seen in the attacker corpus', tone: 'bad' }
    : { status: 'no hostile signal', detail: 'not seen in the attacker corpus', tone: 'clean' }

  // Sigil — ad supply-graph trust
  const sigil = r.sigil || {}
  const sigilRow = !sigil.available
    ? { status: 'no data', detail: '—', tone: 'na' }
    : sigil.in_supply_graph
      ? { status: 'in supply graph', detail: 'has SSP / publisher relationships', tone: 'info' }
      : { status: 'not in ad supply graph', detail: 'no SSP / publisher relationships', tone: 'clean' }

  // Tracker — surveillance association, read off the adversary classification
  const trackerRow = adv.classification === 'surveillance_bigtech'
    ? { status: 'tracker / surveillance entity', detail: 'curated cartel association', tone: 'warn' }
    : { status: 'no tracker association', detail: '—', tone: 'clean' }

  // GhostRoute — routing integrity & sovereignty (the richest block here).
  // A cold node returns reason 'ghostroute_pending' (the 4th lens is still
  // racing its 5s deadline upstream): show it as actively resolving, not as a
  // bare "no data" — otherwise a legit host reads as a gap rather than a wait.
  const grRow = gr.reason === 'ghostroute_pending'
    ? { status: 'verifying routing…', detail: 'RPKI / sovereignty still resolving', tone: 'pending' }
    : !gr.available
    ? { status: 'no route data', detail: '—', tone: 'na' }
    : {
        status: gr.sanctions_match
          ? 'sanctioned route'
          : `RPKI ${gr.rpki_status || '—'} · sovereignty ${gr.sovereign_tier || '—'}`,
        detail: [gr.origin_as, gr.ai_owner ? `${gr.ai_owner}` : gr.origin_asn_name]
          .filter(Boolean).join(' · '),
        tone: gr.sanctions_match ? 'bad'
          : gr.rpki_status === 'INVALID' ? 'bad'
          : gr.sovereign_tier === 'VERIFIED' ? 'clean' : 'info',
      }

  return [
    { key: 'scry', name: 'Scry', sub: 'attack', ...scryRow },
    { key: 'sigil', name: 'Sigil', sub: 'ad-trust', ...sigilRow },
    { key: 'tracker', name: 'Tracker', sub: 'surveillance', ...trackerRow },
    { key: 'ghostroute', name: 'GhostRoute', sub: 'routing', ...grRow },
  ]
}

const verdictLabel = (v) => ({
  pass: 'Trustworthy',
  fail: 'Do not trust',
  warn: 'Caution',
  mismatch: 'Mismatch',
  unknown: 'Insufficient data',
}[v] || (v ? v[0].toUpperCase() + v.slice(1) : 'No verdict'))

const verdictTone = (v) =>
  v === 'pass' ? 'clean'
    : (v === 'fail' || v === 'mismatch') ? 'bad'
    : v === 'unknown' ? 'neutral'   // no data ≠ caution — render it as neutral, not amber
    : 'warn'

// Lens accent per the design system (Scry cyan, Sigil green, Tracker purple,
// GhostRoute amber). Kept here so the convergence graphic and the lens rows
// stay in lockstep.
const LENS_COLOR = {
  scry: 'var(--scry)',
  sigil: 'var(--sigil)',
  tracker: 'var(--tracker)',
  ghostroute: 'var(--accent-amber)',
}
const TONE_COLOR = {
  clean: 'var(--accent-green)',
  warn: 'var(--accent-amber)',
  bad: 'var(--accent-red)',
  neutral: 'var(--accent-blue)',
}

// The signature moment: four lens nodes draw edges into one fused verdict node
// — the cross-lens JOIN as geometry, sitting right beside the hard data below
// it. Each edge draws in as its lens reveals; the verdict node lights when all
// four have landed. Pure SVG, no deps; motion is CSS and honours
// prefers-reduced-motion (the edges simply appear).
function ConvergeGraphic({ reveal, done, tone }) {
  const keys = ['scry', 'sigil', 'tracker', 'ghostroute']
  const ys = [16, 37, 59, 80]
  const VX = 286, VY = 48
  const destColor = TONE_COLOR[tone] || 'var(--accent-blue)'
  return (
    <svg className="tm-vv-graph" viewBox="0 0 320 96" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {keys.map((k, i) => (
        <path
          key={k}
          className={`tm-vv-edge ${reveal > i ? 'is-drawn' : ''}`}
          d={`M24 ${ys[i]} C 150 ${ys[i]} 200 ${VY} ${VX} ${VY}`}
          pathLength="1"
          style={{ stroke: LENS_COLOR[k], strokeDashoffset: reveal > i ? 0 : 1 }}
        />
      ))}
      {keys.map((k, i) => (
        <circle
          key={k}
          className={`tm-vv-src ${reveal > i ? 'is-on' : ''}`}
          cx="24" cy={ys[i]} r="4.5"
          style={{ fill: LENS_COLOR[k] }}
        />
      ))}
      <circle className={`tm-vv-dest ${done ? 'is-on' : ''}`} cx={VX} cy={VY} r="9" style={{ stroke: destColor }} />
      <circle className={`tm-vv-dest-core ${done ? 'is-on' : ''}`} cx={VX} cy={VY} r="3.5" style={{ fill: destColor }} />
    </svg>
  )
}

// The attestation-tier ladder: self-asserted → software → tee-tpm →
// silicon-root, with the receipt's signing-root tier lit. This is the rung a
// lookup can never show — it says how much the signature is worth, not just
// that one exists.
function TierLadder({ tier }) {
  const idx = ATTESTATION_TIERS.indexOf(tier)
  return (
    <div className="tm-vv-tier" title="Attestation strength of the signing root">
      <span className="tm-vv-tier-label">attestation</span>
      {ATTESTATION_TIERS.map((t, i) => (
        <span
          key={t}
          className={`tm-vv-tier-step ${i === idx ? 'is-on' : ''} ${idx >= 0 && i < idx ? 'is-below' : ''}`}
        >
          {t}
        </span>
      ))}
    </div>
  )
}

export default function VerifyWidget({ onNavigate }) {
  const [host, setHost] = useState(SEED.node.value)
  const [result, setResult] = useState(SEED)
  const [phase, setPhase] = useState('revealing') // revealing | done | evaluating | error
  const [reveal, setReveal] = useState(0)          // 0..4 lens rows shown
  const [pendingLens, setPendingLens] = useState(false) // GhostRoute still warming → verdict may sharpen
  const timers = useRef([])
  const activeNode = useRef(SEED.node.value)        // guards stale background re-fetches

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  // Sequenced reveal: lenses light up one by one, then the verdict, then the
  // receipt. This is the "evaluating…" theater everyone fakes — except ours
  // resolves to a real signature.
  function runReveal() {
    clearTimers()
    setReveal(0)
    setPhase('revealing')
    for (let i = 1; i <= 4; i++) {
      timers.current.push(setTimeout(() => setReveal(i), i * 420))
    }
    timers.current.push(setTimeout(() => setPhase('done'), 4 * 420 + 360))
  }

  useEffect(() => {
    // Deep-link: /?verify=<host> runs the lookup on load so an outreach link can
    // land a prospect straight on their own domain's verdict. App.jsx folds any
    // hash-route query into window.location.search before this mounts.
    let target = ''
    if (typeof window !== 'undefined') {
      try { target = new URLSearchParams(window.location.search).get('verify') || '' } catch { /* noop */ }
    }
    if (target.trim()) verify(target)
    else runReveal()
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Is this verdict a fast 3-lens partial with GhostRoute still racing its 5s
  // deadline upstream? (reason 'ghostroute_pending' — see the proxy.)
  function isPending(data) {
    const gr = data && data.ghostroute
    return !!(gr && gr.available === false && gr.reason === 'ghostroute_pending')
  }

  async function verify(target, attempt = 0) {
    const node = (target || '').trim().toLowerCase()
    if (!node) return
    clearTimers()
    activeNode.current = node
    setHost(node)
    setPhase('evaluating')
    setReveal(0)
    setPendingLens(false)
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(node)}`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      if (!data || !data.cross_lens) throw new Error('empty')
      setResult(data)
      runReveal()
      // Cold node → show the partial now, then quietly re-fetch: the upstream is
      // warming, so within a few seconds the 4th lens lands and the verdict can
      // sharpen (often warn→pass). No theatre — the visitor keeps the verdict.
      if (isPending(data)) {
        setPendingLens(true)
        timers.current.push(setTimeout(() => refetchQuiet(node, 1), 6500))
      }
    } catch {
      // The upstream verdict is fast warm but slow cold (it 504s past our 9s
      // proxy cap). That first cold call warms it, so one auto-retry usually
      // lands — only surface the fallback after the retry also fails.
      if (attempt < 1) {
        timers.current.push(setTimeout(() => verify(node, attempt + 1), 1200))
      } else {
        setPhase('error')
      }
    }
  }

  // Background, no-theatre re-fetch used only while GhostRoute is warming. It
  // never resets the UI to "evaluating…"; it just swaps in the sharper verdict
  // when the 4th lens lands. Bails if the visitor has since looked up another host.
  async function refetchQuiet(node, warmTries) {
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(node)}`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok || activeNode.current !== node) return
      const data = await res.json()
      if (!data || !data.cross_lens || activeNode.current !== node) return
      const stillPending = isPending(data)
      setResult(data)
      setPendingLens(stillPending)
      setReveal(4)
      setPhase('done')
      if (stillPending && warmTries < 3) {
        timers.current.push(setTimeout(() => refetchQuiet(node, warmTries + 1), 6500))
      }
    } catch { /* keep the partial verdict already shown */ }
  }

  const rows = lensRows(result)
  const cl = result.cross_lens || {}
  const sig = result.receipt && result.receipt.signature
  const evaluating = phase === 'evaluating'

  return (
    <div className="tm-verify" aria-label="Live cross-lens verify">
      <div className="tm-verify-eyebrow">
        <span className="tm-live-dot" aria-hidden="true" />
        Verify · one node, four lenses, one signed verdict
      </div>

      <form
        className="tm-verify-input"
        onSubmit={(e) => { e.preventDefault(); verify(host) }}
      >
        <span className="tm-verify-method">POST</span>
        <input
          aria-label="Host or IP to verify"
          value={host}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          onChange={(e) => setHost(e.target.value)}
          placeholder="api.anthropic.com"
        />
        <button type="submit" disabled={evaluating}>
          {evaluating ? 'verifying…' : 'verify'}
        </button>
      </form>

      <div className="tm-verify-examples">
        try{' '}
        {EXAMPLES.map((ex, i) => (
          <React.Fragment key={ex}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            <button type="button" onClick={() => verify(ex)} disabled={evaluating}>{ex}</button>
          </React.Fragment>
        ))}
      </div>

      {/* ── Lens rows ─────────────────────────────────────────────────── */}
      <div className="tm-verify-lenses">
        {rows.map((row, i) => {
          const shown = !evaluating && reveal > i
          return (
            <div
              key={row.key}
              className={`tm-vl tm-vl-${row.key} ${shown ? 'is-shown' : ''} ${evaluating ? 'is-eval' : ''} ${shown && row.tone === 'pending' ? 'is-pending' : ''}`}
            >
              <span className="tm-vl-dot" aria-hidden="true" />
              <span className="tm-vl-name">{row.name}</span>
              <span className="tm-vl-status" data-tone={shown ? row.tone : undefined}>
                {evaluating ? 'evaluating…' : shown ? row.status : ''}
              </span>
              <span className="tm-vl-detail">{shown ? row.detail : ''}</span>
            </div>
          )
        })}
      </div>

      {/* ── Verdict + receipt ─────────────────────────────────────────── */}
      {phase === 'error' ? (
        <div className="tm-verify-verdict is-error">
          <div className="tm-vv-head">Warming up.</div>
          <p className="tm-vv-note">
            First lookup of <code>{host}</code> is computing in the background — give
            it a few seconds, then{' '}
            <button type="button" className="tm-link" onClick={() => verify(host)}>retry</button>
            {' '}or{' '}
            <button
              type="button"
              className="tm-link"
              onClick={() => onNavigate && onNavigate('compare')}
            >see how this compares to ipinfo →</button>
          </p>
        </div>
      ) : (
        <div className={`tm-verify-verdict ${phase === 'done' ? 'is-shown' : ''}`} data-tone={verdictTone(cl.verdict)}>
          {/* convergence bar — the four lens colors fusing into one verdict */}
          <div className="tm-vv-converge" aria-hidden="true" />
          {/* the join, drawn: four lens nodes converging into one verdict node */}
          <ConvergeGraphic reveal={reveal} done={phase === 'done'} tone={verdictTone(cl.verdict)} />
          <div className="tm-vv-row">
            <div className="tm-vv-label">Fused verdict</div>
            <div className="tm-vv-value">{verdictLabel(cl.verdict)}</div>
            {typeof cl.trust_score === 'number' && (
              <div className="tm-vv-score">
                trust {cl.trust_score.toFixed(2)}
                {typeof cl.confidence === 'number' && <> · conf {cl.confidence.toFixed(2)}</>}
              </div>
            )}
          </div>
          {pendingLens && (
            <div className="tm-vv-pending">
              <span className="tm-vv-pending-dot" aria-hidden="true" />
              routing still verifying — the 4th lens lands in a moment and the verdict may sharpen
            </div>
          )}
          {sig ? (
            <div className="tm-vv-receipt" title={sig.value}>
              <span className="tm-vv-receipt-icon" aria-hidden="true">⧉</span>
              <span className="tm-vv-receipt-text">
                signed receipt · {sig.algorithm} · <code>{sig.key_id}</code>
              </span>
              <span className="tm-vv-receipt-id">{result.receipt.receipt_id.slice(0, 8)}…</span>
            </div>
          ) : (
            <div className="tm-vv-receipt is-empty">no receipt returned</div>
          )}
          {result.receipt && result.receipt.attestation_strength && (
            <TierLadder tier={result.receipt.attestation_strength} />
          )}
          <div className="tm-vv-curl" aria-label="Replay this verdict yourself">
            <code>curl https://data.tunnelmind.ai/v1/verify/{(result.node && result.node.value) || host}</code>
          </div>
          <p className="tm-vv-foot">
            A lookup hands back an answer. TunnelMind hands back a{' '}
            <strong>verifiable receipt</strong> — the difference between a score and proof.
          </p>
        </div>
      )}
    </div>
  )
}

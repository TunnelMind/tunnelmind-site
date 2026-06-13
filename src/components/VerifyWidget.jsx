import React, { useEffect, useRef, useState } from 'react'

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

  // GhostRoute — routing integrity & sovereignty (the richest block here)
  const grRow = !gr.available
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
}[v] || (v ? v[0].toUpperCase() + v.slice(1) : 'No verdict'))

const verdictTone = (v) =>
  v === 'pass' ? 'clean' : (v === 'fail' || v === 'mismatch') ? 'bad' : 'warn'

export default function VerifyWidget({ onNavigate }) {
  const [host, setHost] = useState(SEED.node.value)
  const [result, setResult] = useState(SEED)
  const [phase, setPhase] = useState('revealing') // revealing | done | evaluating | error
  const [reveal, setReveal] = useState(0)          // 0..4 lens rows shown
  const timers = useRef([])

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
    runReveal()
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verify(target, attempt = 0) {
    const node = (target || '').trim().toLowerCase()
    if (!node) return
    clearTimers()
    setHost(node)
    setPhase('evaluating')
    setReveal(0)
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(node)}`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      if (!data || !data.cross_lens) throw new Error('empty')
      setResult(data)
      runReveal()
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
              className={`tm-vl tm-vl-${row.key} ${shown ? 'is-shown' : ''} ${evaluating ? 'is-eval' : ''}`}
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
          <div className="tm-vv-head">Taking longer than usual.</div>
          <p className="tm-vv-note">
            The live verdict for <code>{host}</code> is slow to warm.{' '}
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
          <p className="tm-vv-foot">
            A lookup hands back an answer. TunnelMind hands back a{' '}
            <strong>verifiable receipt</strong> — the difference between a score and proof.
          </p>
        </div>
      )}
    </div>
  )
}

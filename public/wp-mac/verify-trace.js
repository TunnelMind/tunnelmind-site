/* wp-mac VerifyTrace v0.1.0 — <verify-trace> Web Component.
 *
 * Renders a cross-lens verify as a 1-bit WordPerfect-Mac progress trace:
 * one row per lens (icon · name · finding · status chip), a segmented
 * progress bar, and the fused verdict strip.
 *
 * Two modes:
 *   static — host sets `el.data = { node, steps[], verdict }`; steps reveal
 *            on a fixed cadence. `autoplay` / `loop` attributes supported.
 *            This mode is for marketing loops and MUST be labeled
 *            illustrative by the host.
 *   live   — `mode="live" src="/v1/verify"`; host sets `el.node` and calls
 *            `el.play()`. POSTs with `accept: application/x-ndjson` and
 *            renders each event AS IT ARRIVES. Honesty principle: no
 *            reordering, no pacing, no padding — the trace IS the timing.
 *
 * Wire contract (one JSON object per \n-delimited line):
 *   {"t":"lens","lens":"Scry","state":"start"}
 *   {"t":"lens","lens":"Scry","state":"result","finding":"…","status":"HOSTILE","bad":true,"sig":"…"}
 *   {"t":"verdict","verdict":"UNTRUSTED","score":0.12,"tier":"software-attested","summary":"…","bad":true}
 *
 * Events: `verify:done` (detail = verdict object), `verify:error` (detail = Error).
 * Reduced motion: static mode renders every step at once; live mode appends
 * in real time (real timing is information, not decoration) with animation off.
 *
 * ChicagoFLF must be @font-face'd at DOCUMENT level (wp-mac.css does this);
 * shadow DOM does not scope @font-face but does resolve document-level faces.
 */

const ICONS = {
  // 12x12 1-bit glyphs, currentColor
  Scry:       '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M6 2C3 2 1 6 1 6s2 4 5 4 5-4 5-4-2-4-5-4zm0 6.5A2.5 2.5 0 1 1 6 3.5a2.5 2.5 0 0 1 0 5zM6 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>',
  Sigil:      '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M6 1 2 3v3c0 2.5 1.7 4.3 4 5 2.3-.7 4-2.5 4-5V3L6 1zm0 1.6 2.8 1.4v2c0 1.8-1.1 3.1-2.8 3.7C4.3 9.1 3.2 7.8 3.2 6V4L6 2.6z"/></svg>',
  Tracker:    '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1zm0 1.5A3.5 3.5 0 1 1 6 9.5 3.5 3.5 0 0 1 6 2.5zM5.5 3v3.2l2.4 1.4.6-1L6.5 5.4V3h-1z"/></svg>',
  GhostRoute: '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M2 9a1.5 1.5 0 1 0 .01 0H2zm8-6a1.5 1.5 0 1 0-.01 0H10zM2.7 8.3 9.3 1.7l.9.9-6.6 6.6-.9-.9z"/><path fill="currentColor" d="M1.5 4h2v1h-2zM8.5 7h2v1h-2z"/></svg>',
  watch:      '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M6 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-.5 1v2.5H8v-1H6.5V4h-1zM4.5 0h3v1h-3zM4.5 11h3v1h-3z"/></svg>',
  key:        '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M8.5 1A2.5 2.5 0 0 0 6 3.5c0 .3.05.57.14.83L1 9.5V11h2v-1h1V9h1l.7-.7.16.05A2.5 2.5 0 1 0 8.5 1zm.5 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
}

const LENSES = ['Scry', 'Sigil', 'Tracker', 'GhostRoute']

const CSS = `
:host {
  display: block;
  --vt-ink: var(--wpm-ink, #000);
  --vt-paper: var(--wpm-paper, #fff);
  font-family: 'ChicagoFLF', 'Geneva', sans-serif;
  color: var(--vt-ink);
  background: var(--vt-paper);
}
* { box-sizing: border-box; }
.frame { border: 2px solid var(--vt-ink); background: var(--vt-paper); }
.head {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 10px; border-bottom: 2px solid var(--vt-ink);
  font-size: 13px;
}
.head .node { font-family: 'JetBrains Mono', ui-monospace, monospace; }
.head .watch { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 12px; }
.bar {
  display: flex; height: 12px; border-bottom: 2px solid var(--vt-ink);
}
.seg { flex: 1; border-right: 1px solid var(--vt-ink); background: var(--vt-paper); }
.seg:last-child { border-right: none; }
.seg.on {
  background: repeating-conic-gradient(var(--vt-ink) 0% 25%, var(--vt-paper) 0% 50%);
  background-size: 2px 2px;
}
.seg.bad.on { background: var(--vt-ink); }
.rows { padding: 2px 0; min-height: 30px; }
.row {
  display: grid;
  grid-template-columns: 18px 92px 1fr auto;
  align-items: center; gap: 8px;
  padding: 5px 10px;
  font-size: 13px;
  border-bottom: 1px dotted var(--vt-ink);
}
.row:last-child { border-bottom: none; }
.row .icon { display: inline-flex; }
.row .lens { font-size: 13px; }
.row .finding {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.row .finding.pending { font-style: italic; }
.chip {
  font-size: 11px; letter-spacing: .08em;
  border: 1px solid var(--vt-ink);
  padding: 1px 7px;
  display: inline-flex; align-items: center; gap: 4px;
  white-space: nowrap;
}
.chip.bad { background: var(--vt-ink); color: var(--vt-paper); }
.chip .icon svg { display: block; }
.verdict {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  border-top: 2px solid var(--vt-ink);
  padding: 8px 10px;
  font-size: 14px;
}
.verdict .v {
  border: 2px solid var(--vt-ink);
  padding: 2px 10px;
  font-size: 14px;
}
.verdict .v.bad { background: var(--vt-ink); color: var(--vt-paper); }
.verdict .meta { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; }
.verdict .summary { flex-basis: 100%; font-size: 12px; font-family: 'JetBrains Mono', ui-monospace, monospace; }
.error {
  padding: 8px 10px; border-top: 2px solid var(--vt-ink);
  font-size: 13px;
  display: flex; align-items: center; gap: 8px;
}
.error::before { content: '\\26A0'; font-size: 16px; }
@media (prefers-reduced-motion: no-preference) {
  .row { animation: vt-appear 120ms steps(2, end); }
  @keyframes vt-appear { from { opacity: 0; } to { opacity: 1; } }
}
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
`

const reduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export class VerifyTrace extends HTMLElement {
  static get observedAttributes() { return ['mode', 'src', 'node'] }

  constructor() {
    super()
    this._data = null
    this._timers = []
    this._abort = null
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${CSS}</style>
      <div class="frame" role="group" aria-label="Cross-lens verify trace">
        <div class="head">
          <span class="icon">${ICONS.key}</span>
          <span>verify</span><span class="node"></span>
          <span class="watch">${ICONS.watch}<span class="elapsed"></span></span>
        </div>
        <div class="bar" aria-hidden="true">
          ${LENSES.map(() => '<div class="seg"></div>').join('')}<div class="seg vseg"></div>
        </div>
        <div class="rows" role="log" aria-live="polite" aria-relevant="additions"></div>
      </div>`
    this._el = {
      frame: root.querySelector('.frame'),
      node: root.querySelector('.node'),
      elapsed: root.querySelector('.elapsed'),
      segs: [...root.querySelectorAll('.seg')],
      rows: root.querySelector('.rows'),
    }
  }

  get data() { return this._data }
  set data(d) {
    this._data = d
    if (this.hasAttribute('autoplay')) this.play()
  }

  get node() { return this.getAttribute('node') }
  set node(v) { this.setAttribute('node', v) }

  connectedCallback() {
    if (this.hasAttribute('autoplay') && this._data) this.play()
  }

  disconnectedCallback() { this._stop() }

  _stop() {
    this._timers.forEach(clearTimeout)
    this._timers = []
    if (this._abort) { this._abort.abort(); this._abort = null }
  }

  _reset() {
    this._stop()
    this._el.rows.innerHTML = ''
    this._el.segs.forEach(s => s.classList.remove('on', 'bad'))
    this._el.frame.querySelector('.verdict')?.remove()
    this._el.frame.querySelector('.error')?.remove()
    this._t0 = Date.now()
    this._el.elapsed.textContent = ''
  }

  play() {
    this._reset()
    if (this.getAttribute('mode') === 'live') this._playLive()
    else this._playStatic()
  }

  /* ── static (canned, host must label illustrative) ─────────────────── */
  _playStatic() {
    const d = this._data
    if (!d) return
    this._el.node.textContent = d.node || ''
    const steps = d.steps || []
    if (reduced()) {
      steps.forEach((s, i) => { this._lensStart(s.lens); this._lensResult(s, i) })
      this._verdict(d.verdict)
      return
    }
    let t = 300
    steps.forEach((s, i) => {
      this._timers.push(setTimeout(() => this._lensStart(s.lens), t))
      t += 550
      this._timers.push(setTimeout(() => this._lensResult(s, i), t))
      t += 250
    })
    this._timers.push(setTimeout(() => {
      this._verdict(d.verdict)
      if (this.hasAttribute('loop')) {
        this._timers.push(setTimeout(() => this.play(), 3600))
      }
    }, t + 400))
  }

  /* ── live (real NDJSON stream — never reorder, never pace) ─────────── */
  async _playLive() {
    const src = this.getAttribute('src') || '/v1/verify'
    const node = this.getAttribute('node')
    if (!node) return
    this._el.node.textContent = node
    this._abort = new AbortController()
    let sawVerdict = false
    let i = 0
    const seen = {}
    try {
      const res = await fetch(`${src}/${encodeURIComponent(node)}`, {
        method: 'POST',
        headers: { accept: 'application/x-ndjson' },
        signal: this._abort.signal,
      })
      if (!res.ok || !res.body) throw new Error(`verify stream: HTTP ${res.status}`)
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let nl
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim()
          buf = buf.slice(nl + 1)
          if (!line) continue
          const ev = JSON.parse(line)
          if (ev.t === 'lens' && ev.state === 'start') {
            this._lensStart(ev.lens)
          } else if (ev.t === 'lens' && ev.state === 'result') {
            seen[ev.lens] = true
            this._lensResult(ev, i++)
          } else if (ev.t === 'verdict') {
            sawVerdict = true
            this._verdict(ev)
          }
          this._el.elapsed.textContent = `${((Date.now() - this._t0) / 1000).toFixed(1)}s`
        }
      }
      if (!sawVerdict) throw new Error('stream ended before verdict')
    } catch (err) {
      if (err.name === 'AbortError') return
      this._error(err)
    }
  }

  /* ── render helpers ────────────────────────────────────────────────── */
  _row(lens) {
    let row = this._el.rows.querySelector(`[data-lens="${lens}"]`)
    if (!row) {
      row = document.createElement('div')
      row.className = 'row'
      row.dataset.lens = lens
      row.innerHTML = `
        <span class="icon">${ICONS[lens] || ''}</span>
        <span class="lens">${lens}</span>
        <span class="finding pending">querying…</span>
        <span class="chip"><span class="icon">${ICONS.watch}</span> running</span>`
      this._el.rows.appendChild(row)
    }
    return row
  }

  _lensStart(lens) { this._row(lens) }

  _lensResult(step, i) {
    const row = this._row(step.lens)
    const finding = row.querySelector('.finding')
    finding.textContent = step.finding || ''
    finding.classList.remove('pending')
    finding.title = step.finding || ''
    const chip = row.querySelector('.chip')
    chip.classList.toggle('bad', !!step.bad)
    chip.innerHTML = `${step.sig ? `<span class="icon">${ICONS.key}</span>` : ''}${step.status || 'OK'}`
    if (step.sig) chip.title = `signed: ${step.sig}`
    const seg = this._el.segs[LENSES.indexOf(step.lens)] ?? this._el.segs[i]
    if (seg) { seg.classList.add('on'); if (step.bad) seg.classList.add('bad') }
  }

  _verdict(v) {
    if (!v) return
    const el = document.createElement('div')
    el.className = 'verdict'
    el.innerHTML = `
      <span class="v${v.bad ? ' bad' : ''}">${v.verdict || ''}</span>
      <span class="meta">score ${v.score != null ? v.score : '?'} · ${v.tier || ''}</span>
      ${v.summary ? `<span class="summary">${v.summary}</span>` : ''}
      <span class="sr">verify complete: ${v.verdict}</span>`
    this._el.frame.appendChild(el)
    const vseg = this._el.segs[this._el.segs.length - 1]
    vseg.classList.add('on')
    if (v.bad) vseg.classList.add('bad')
    this._el.elapsed.textContent = `${((Date.now() - this._t0) / 1000).toFixed(1)}s`
    this.dispatchEvent(new CustomEvent('verify:done', { detail: v, bubbles: true }))
  }

  _error(err) {
    const el = document.createElement('div')
    el.className = 'error'
    el.setAttribute('role', 'alert')
    el.textContent = 'query failed · ' + (err && err.message ? err.message : 'stream error')
    this._el.frame.appendChild(el)
    this.dispatchEvent(new CustomEvent('verify:error', { detail: err, bubbles: true }))
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('verify-trace')) {
  customElements.define('verify-trace', VerifyTrace)
}

export default VerifyTrace

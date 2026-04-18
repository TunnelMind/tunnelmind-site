import React, { useState, useEffect, useRef, useCallback } from 'react'

// ── CPM benchmarks and category multipliers ──────────────────────────────────
const CPM = {
  health: 12, financial: 9, automotive: 7.5, travel: 6, retail: 5,
  technology: 4.5, social: 4, advertising: 3.5, education: 3.5,
  entertainment: 3, news: 2.5, analytics: 2, unknown: 1.5,
}
const MULT = {
  health: 4, medical: 4, financial: 3, purchase: 3, location: 2.5,
  identity: 2, email: 1.8, demographic: 1.5, behavioral: 1.5,
  browsing: 1.3, social: 1.2, interests: 1.2, general: 1,
}
const SUB_COST = Math.round((7 / 120) * 10000) / 10000

function calcValue(info, count) {
  const cpm = (info && info.cpm) ? info.cpm : (CPM[(info && info.i)] || 1.5)
  const cat = (info && info.cat) ? info.cat : 'behavioral'
  const m = MULT[cat] || 1.0
  return Math.floor((count * cpm * m) / 1000 * 10000) / 10000
}

function fmt(n) {
  return '$' + Math.abs(n).toFixed(4)
}

function extractDomain(raw) {
  try {
    const s = raw.trim()
    if (!s) return null
    const url = s.includes('://') ? new URL(s) : new URL('https://' + s)
    let h = url.hostname.toLowerCase().replace(/^www\./, '')
    if (!h || h.indexOf('.') === -1) return null
    if (/\.(local|internal|example|test|invalid)$/.test(h)) return null
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return null
    return h
  } catch {
    // bare domain without protocol
    const s = raw.trim().toLowerCase().replace(/^www\./, '').split('/')[0]
    if (s && s.indexOf('.') !== -1) return s
    return null
  }
}

function lookupTracker(trackers, domain) {
  if (!trackers) return null
  if (trackers[domain]) return trackers[domain]
  const parts = domain.split('.')
  for (let i = 1; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join('.')
    if (trackers[candidate]) return trackers[candidate]
  }
  return null
}

function buildReceipt(trackers, lines) {
  const domainCounts = {}
  for (const line of lines) {
    const d = extractDomain(line)
    if (d) domainCounts[d] = (domainCounts[d] || 0) + 1
  }

  const byCompany = {}
  for (const [domain, count] of Object.entries(domainCounts)) {
    const info = lookupTracker(trackers, domain)
    const company = info ? info.c : domain
    const val = calcValue(info, count)
    if (byCompany[company]) {
      const ex = byCompany[company]
      const newCount = ex.count + count
      const newVal = calcValue(info || ex._info, newCount)
      ex.count = newCount
      ex.value = newVal
      ex.domains.push(domain)
    } else {
      byCompany[company] = {
        company,
        industry: info ? info.i : 'unknown',
        category: info ? (info.cat || 'behavioral') : 'unknown',
        count,
        value: val,
        is_known: !!info,
        domains: [domain],
        _info: info,
      }
    }
  }

  const items = Object.values(byCompany)
    .sort((a, b) => b.value !== a.value ? b.value - a.value : b.count - a.count)

  const totalValue = Math.floor(
    items.reduce((s, x) => s + x.value, 0) * 10000
  ) / 10000
  const netProfit = Math.floor((totalValue - SUB_COST) * 10000) / 10000

  return {
    domainCount: Object.keys(domainCounts).length,
    items,
    totalValue,
    netProfit,
    generatedAt: new Date().toLocaleString(),
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    background: 'var(--doc-bg)',
  },
  wrap: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '32px 24px 80px',
    width: '100%',
  },
  ruler: {
    height: '22px',
    background: 'var(--chrome-bg)',
    borderBottom: '1px solid var(--chrome-border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: '8px',
    fontSize: '11px',
    color: 'var(--chrome-text-dim)',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  },
  heading: {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    letterSpacing: '0.2em',
    color: 'var(--chrome-text-dim)',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  subheading: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    color: 'var(--doc-text-dim)',
    lineHeight: 1.7,
    marginBottom: '24px',
  },
  textarea: {
    width: '100%',
    minHeight: '160px',
    background: 'var(--chrome-bg)',
    border: '1px solid var(--chrome-border)',
    borderRadius: '3px',
    color: 'var(--doc-text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    padding: '12px',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.6,
    marginBottom: '12px',
  },
  btnRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: 'var(--accent-green-dim)',
    border: '1px solid var(--accent-green)',
    color: 'var(--accent-green)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    letterSpacing: '0.1em',
    padding: '7px 18px',
    cursor: 'pointer',
    borderRadius: '2px',
    textTransform: 'uppercase',
  },
  btnSecondary: {
    background: 'transparent',
    border: '1px solid var(--chrome-border)',
    color: 'var(--chrome-text-dim)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    letterSpacing: '0.08em',
    padding: '7px 18px',
    cursor: 'pointer',
    borderRadius: '2px',
    textTransform: 'uppercase',
  },
  sep: {
    border: 'none',
    borderTop: '1px dashed var(--chrome-border)',
    margin: '12px 0',
  },
  receipt: {
    background: 'var(--chrome-bg)',
    border: '1px solid var(--chrome-border)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  receiptHeader: {
    textAlign: 'center',
    padding: '14px 16px 12px',
    borderBottom: '1px dashed var(--chrome-border)',
  },
  receiptTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    letterSpacing: '0.22em',
    color: 'var(--chrome-text-dim)',
    marginBottom: '4px',
    textTransform: 'uppercase',
  },
  receiptStats: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    color: 'var(--doc-text-dim)',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    cursor: 'pointer',
  },
  totalsSection: {
    padding: '10px 14px 12px',
    borderTop: '1px dashed var(--chrome-border)',
  },
  totRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    lineHeight: 2.0,
    color: 'var(--doc-text-dim)',
  },
  methodSection: {
    marginTop: '24px',
    padding: '16px',
    background: 'var(--chrome-bg)',
    border: '1px solid var(--chrome-border)',
    borderRadius: '3px',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--doc-text-dim)',
    lineHeight: 1.9,
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Receipt() {
  const [trackers, setTrackers] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [input, setInput] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [showMethod, setShowMethod] = useState(false)
  const [copied, setCopied] = useState(false)
  const [extDomains, setExtDomains] = useState(null)   // domains from extension bridge
  const [extChecked, setExtChecked] = useState(false)  // have we probed for the extension?
  const receiptRef = useRef(null)

  // Load tracker DB on mount
  useEffect(() => {
    fetch('/trackers.json')
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
      .then(data => setTrackers(data))
      .catch(e => setLoadError(e.message))
  }, [])

  // Probe for TunnelMind extension via content_bridge postMessage
  useEffect(() => {
    const timeout = setTimeout(() => setExtChecked(true), 800)

    function onMessage(e) {
      if (!e.data || e.data.type !== 'TM_DOMAINS_RESULT') return
      clearTimeout(timeout)
      setExtChecked(true)
      const domains = e.data.domains || {}
      if (Object.keys(domains).length > 0) {
        setExtDomains(domains)
      }
    }

    window.addEventListener('message', onMessage)
    window.postMessage({ type: 'TM_GET_DOMAINS' }, '*')

    return () => {
      window.removeEventListener('message', onMessage)
      clearTimeout(timeout)
    }
  }, [])

  const generate = useCallback(() => {
    if (!trackers) return
    const lines = input.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    if (lines.length === 0) return
    setReceipt(buildReceipt(trackers, lines))
    setExpanded({})
  }, [trackers, input])

  const loadFromExtension = useCallback(() => {
    if (!trackers || !extDomains) return
    const lines = Object.keys(extDomains)
    setReceipt(buildReceipt(trackers, lines))
    setExtDomains(null)
    setExpanded({})
  }, [trackers, extDomains])

  const reset = useCallback(() => {
    setInput('')
    setReceipt(null)
    setExpanded({})
    setShowMethod(false)
  }, [])

  const toggleExpand = useCallback((company) => {
    setExpanded(e => ({ ...e, [company]: !e[company] }))
  }, [])

  const copyText = useCallback(() => {
    if (!receipt) return
    const lines = [
      'TUNNELMIND SURVEILLANCE RECEIPT',
      'Generated: ' + receipt.generatedAt,
      receipt.domainCount + ' domains  ·  ' + receipt.items.length + ' trackers',
      '',
    ]
    receipt.items.slice(0, 20).forEach((item, i) => {
      const pad = item.company.length < 32
        ? item.company + ' '.repeat(Math.max(0, 32 - item.company.length))
        : item.company.slice(0, 31)
      lines.push((i + 1) + '. ' + pad + ' ' + fmt(item.value))
    })
    lines.push('')
    lines.push('Data value extracted:    ' + fmt(receipt.totalValue))
    lines.push('TunnelMind subscription: (' + fmt(SUB_COST) + ')')
    lines.push('Net surveillance profit: ' + fmt(receipt.netProfit))
    lines.push('')
    lines.push('All values are estimates. tunnelmind.ai')
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }, [receipt])

  // ── Render ─────────────────────────────────────────────────────────────────

  const loading = !trackers && !loadError

  return (
    <div style={S.page}>
      {/* Ruler */}
      <div style={S.ruler}>
        <span>receipt</span>
        <span style={{ color: 'var(--chrome-text-dim)' }}>·</span>
        <span>surveillance receipt generator</span>
        {trackers && (
          <>
            <span style={{ color: 'var(--chrome-text-dim)' }}>·</span>
            <span style={{ color: 'var(--accent-green)' }}>
              {Object.keys(trackers).length.toLocaleString()} tracker domains loaded
            </span>
          </>
        )}
        {loading && <span style={{ color: 'var(--accent-amber)' }}>loading tracker db…</span>}
        {loadError && <span style={{ color: 'var(--accent-red)' }}>error: {loadError}</span>}
      </div>

      <div style={S.wrap}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={S.heading}>Surveillance Receipt</div>
          <div style={S.subheading}>
            Paste domains or URLs you've visited. Get a line-item invoice for what your browsing data is worth to the surveillance economy. All processing is local — nothing leaves your browser.
          </div>
        </div>

        {/* Extension data banner */}
        {!receipt && extChecked && extDomains && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 14px',
            marginBottom: '16px',
            background: 'var(--accent-green-dim)',
            border: '1px solid var(--accent-green)',
            borderRadius: '3px',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
          }}>
            <div>
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                ● Extension detected
              </span>
              <span style={{ color: 'var(--doc-text-dim)', marginLeft: '10px' }}>
                {Object.keys(extDomains).length} domains tracked this session
              </span>
            </div>
            <button
              style={{
                ...S.btnPrimary,
                opacity: !trackers ? 0.5 : 1,
                cursor: !trackers ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onClick={loadFromExtension}
              disabled={!trackers}
            >
              Generate from session →
            </button>
          </div>
        )}

        {/* Input */}
        {!receipt && (
          <>
            <textarea
              style={S.textarea}
              placeholder={'Paste domains or URLs, one per line:\n\ngoogle.com\nhttps://facebook.com/feed\ndoubleclick.net\nnytimes.com\n…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate()
              }}
              spellCheck={false}
            />
            <div style={S.btnRow}>
              <button
                style={{
                  ...S.btnPrimary,
                  opacity: (!trackers || !input.trim()) ? 0.5 : 1,
                  cursor: (!trackers || !input.trim()) ? 'not-allowed' : 'pointer',
                }}
                onClick={generate}
                disabled={!trackers || !input.trim()}
              >
                {loading ? 'Loading…' : 'Generate Receipt'}
              </button>
              <button style={S.btnSecondary} onClick={() => setShowMethod(m => !m)}>
                {showMethod ? 'Hide Methodology' : 'How We Calculate This'}
              </button>
            </div>
          </>
        )}

        {/* Receipt */}
        {receipt && (
          <div ref={receiptRef}>
            <div style={S.receipt}>
              {/* Receipt header */}
              <div style={S.receiptHeader}>
                <div style={S.receiptTitle}>Surveillance Receipt</div>
                <div style={{ ...S.receiptStats, marginBottom: '3px' }}>
                  <strong style={{ color: 'var(--accent-red)' }}>{receipt.items.length} tracker{receipt.items.length !== 1 ? 's' : ''}</strong>
                  {' · '}
                  <strong style={{ color: 'var(--accent-red)' }}>{fmt(receipt.totalValue)}</strong>
                  {' extracted'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--chrome-text-dim)' }}>
                  {receipt.domainCount} domain{receipt.domainCount !== 1 ? 's' : ''} analysed · {receipt.generatedAt}
                </div>
              </div>

              {/* Line items */}
              <div>
                {receipt.items.slice(0, 50).map((item, i) => (
                  <div key={item.company}>
                    <div
                      style={{
                        ...S.itemRow,
                        background: expanded[item.company] ? 'rgba(255,255,255,0.03)' : 'transparent',
                      }}
                      onClick={() => toggleExpand(item.company)}
                    >
                      <span style={{ color: 'var(--chrome-text-dim)', minWidth: '22px', fontSize: '13px' }}>
                        {i + 1}.
                      </span>
                      <span style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--doc-text-dim)',
                        fontSize: '17px',
                      }}>
                        {item.company}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: 'var(--chrome-text-dim)',
                        minWidth: '72px',
                        textAlign: 'right',
                        flexShrink: 0,
                      }}>
                        {item.category !== 'unknown' ? item.category : item.industry !== 'unknown' ? item.industry : ''}
                      </span>
                      <span style={{
                        minWidth: '68px',
                        textAlign: 'right',
                        color: item.value > 0 ? 'var(--accent-amber)' : 'var(--chrome-text-dim)',
                        fontWeight: item.value > 0 ? 600 : 400,
                        fontSize: '14px',
                        flexShrink: 0,
                      }}>
                        {fmt(item.value)}
                      </span>
                      <span style={{ color: 'var(--chrome-text-dim)', fontSize: '11px', width: '10px' }}>
                        {expanded[item.company] ? '▲' : '▼'}
                      </span>
                    </div>
                    {expanded[item.company] && (
                      <div style={{
                        padding: '6px 14px 8px 52px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: 'var(--chrome-text-dim)',
                        lineHeight: 1.9,
                        background: 'rgba(255,255,255,0.02)',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                      }}>
                        <div>industry: <span style={{ color: 'var(--doc-text-dim)' }}>{item.industry}</span></div>
                        <div>contacts: <span style={{ color: 'var(--doc-text-dim)' }}>{item.count}</span></div>
                        <div>data collected: <span style={{ color: 'var(--doc-text-dim)' }}>{item.category}</span></div>
                        <div style={{ color: 'var(--chrome-text-dim)', fontSize: '11px', marginTop: '2px' }}>
                          domains: {item.domains.slice(0, 5).join(' · ')}{item.domains.length > 5 ? ` +${item.domains.length - 5} more` : ''}
                        </div>
                        {!item.is_known && (
                          <div style={{ color: 'var(--accent-amber)', marginTop: '2px' }}>
                            ⚠ Not in tracker database — $0.0000
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {receipt.items.length > 50 && (
                  <div style={{
                    padding: '6px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--chrome-text-dim)',
                    textAlign: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    + {receipt.items.length - 50} more
                  </div>
                )}
              </div>

              {/* Totals */}
              <div style={S.totalsSection}>
                <div style={S.totRow}>
                  <span>DATA VALUE EXTRACTED</span>
                  <span style={{ color: 'var(--doc-text)' }}>{fmt(receipt.totalValue)}</span>
                </div>
                <div style={{ ...S.totRow, color: 'var(--chrome-text-dim)' }}>
                  <span>TUNNELMIND SUBSCRIPTION</span>
                  <span>({fmt(SUB_COST)})</span>
                </div>
                <div style={{
                  ...S.totRow,
                  fontSize: '17px',
                  fontWeight: 700,
                  borderTop: '1px solid var(--chrome-border)',
                  marginTop: '4px',
                  paddingTop: '5px',
                  lineHeight: 1.7,
                  color: receipt.netProfit > 0 ? 'var(--accent-red)' : 'var(--accent-green)',
                }}>
                  <span>{receipt.netProfit > 0 ? 'NET SURVEILLANCE PROFIT' : 'NET SURVEILLANCE LOSS'}</span>
                  <span>{fmt(receipt.netProfit)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ ...S.btnRow, marginTop: '12px' }}>
              <button style={S.btnSecondary} onClick={reset}>
                New Receipt
              </button>
              <button style={S.btnSecondary} onClick={copyText}>
                {copied ? 'Copied!' : 'Copy as Text'}
              </button>
              <button style={S.btnSecondary} onClick={() => setShowMethod(m => !m)}>
                {showMethod ? 'Hide Methodology' : 'How We Calculate This'}
              </button>
            </div>
          </div>
        )}

        {/* Methodology */}
        {showMethod && (
          <div style={S.methodSection}>
            <div style={{ color: 'var(--doc-text)', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '11px' }}>
              Methodology
            </div>
            <div style={{ marginBottom: '6px' }}>
              <strong style={{ color: 'var(--doc-text-dim)' }}>Formula:</strong>{' '}
              value = floor( contacts × CPM × category_multiplier / 1000, 4 decimal places )
            </div>
            <div style={{ marginBottom: '12px', color: 'var(--chrome-text-dim)', fontSize: '11px' }}>
              We always round down. Unknown trackers = $0.0000, shown explicitly.
            </div>
            <div style={{ color: 'var(--doc-text-dim)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.08em' }}>
              CPM Benchmarks (USD per 1,000 contacts)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '2px 16px', marginBottom: '12px' }}>
              {Object.entries(CPM).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--chrome-text-dim)' }}>{k}</span>
                  <span style={{ color: 'var(--doc-text-dim)' }}>${v.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ color: 'var(--doc-text-dim)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.08em' }}>
              Data Category Multipliers
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '2px 16px', marginBottom: '12px' }}>
              {Object.entries(MULT).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--chrome-text-dim)' }}>{k}</span>
                  <span style={{ color: 'var(--doc-text-dim)' }}>{v}×</span>
                </div>
              ))}
            </div>
            <div style={{ color: 'var(--chrome-text-dim)', fontSize: '11px' }}>
              Sources: DuckDuckGo Tracker Radar · Disconnect.me · IAB/eMarketer CPM benchmarks
            </div>
          </div>
        )}

        {/* Footer note */}
        <div style={{
          marginTop: '32px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--chrome-text-dim)',
          lineHeight: 1.8,
          borderTop: '1px solid var(--chrome-border)',
          paddingTop: '16px',
        }}>
          <strong style={{ color: 'var(--doc-text-dim)' }}>⊘ Zero data leaves your browser.</strong> All processing is local. The tracker database ({trackers ? Object.keys(trackers).length.toLocaleString() : '…'} domains) is fetched once and runs entirely client-side. Values are estimates — all figures labeled as such.
        </div>
      </div>
    </div>
  )
}

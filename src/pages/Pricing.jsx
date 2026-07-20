import React, { useState, useEffect } from 'react'
import { PRICING } from '../config/pricing.js'

// /pricing (P34). Two rails over the same endpoints:
//   - Humans → Stripe, prepaid $20 blocks of API calls, stackable. At
//     $100 cumulative spend the block doubles in size and stays doubled.
//   - Agents → x402, per-query stablecoin micropayments, no signup.
// There is no Free / Pro / Enterprise tier and no sales contact — the
// public sample (radar, chat, sample API, MCP) is simply free.
//
// All numbers live in ../config/pricing.js. The block-purchase CTA is
// gated by PRICING.human.checkoutEnabled until /api/checkout sells blocks
// instead of the retired subscription (tracked as a P34 follow-up).

const { human, agent } = PRICING

const n = (v) => Number(v).toLocaleString('en-US')
const usd = (v) => '$' + v

// Read the ?checkout= flag (and the Stripe session id) appended to the
// success / cancel URLs. Since the 2026-05-31 history-router migration the
// checkout redirect lands on a clean URL, so the params live in
// window.location.search. Any legacy /#/pricing?… link is rewritten into the
// search string by App.getPageFromPath before this runs, which also clears the
// hash — so we read search first and only fall back to the hash for safety.
function readCheckoutParams() {
  const search = window.location.search || ''
  let qs = search.replace(/^\?/, '')
  if (!qs) {
    const h = window.location.hash || ''
    const qi = h.indexOf('?')
    qs = qi === -1 ? '' : h.slice(qi + 1)
  }
  if (!qs) return {}
  const p = new URLSearchParams(qs)
  return { checkout: p.get('checkout'), session: p.get('session') }
}

const HUMAN_FEATURES = [
  'The whole corpus. Tracker, Scry, Sigil, and GhostRoute endpoints',
  'No public sampling, full campaigns, signatures, supply paths',
  'Bearer API key + the MCP endpoint',
  'Bulk export (JSON / CSV), ASN / country slicing at scale',
  'Blocks never expire, stack them whenever you need to',
]

// ── Human rail — prepaid Stripe blocks ──────────────────────────────
function HumanCard() {
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const accent = 'var(--accent-green)'

  async function startBlockCheckout() {
    setBusy(true)
    try {
      // The email ties repeat purchases to one Stripe customer, so spend
      // accumulates toward the volume rate. It is optional but encouraged.
      const resp = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await resp.json().catch(() => null)
      if (resp.ok && data && data.url) {
        window.location.href = data.url
        return
      }
      window.location.href =
        'mailto:hello@tunnelmind.ai?subject=' +
        encodeURIComponent('TunnelMind API access')
    } catch {
      window.location.href =
        'mailto:hello@tunnelmind.ai?subject=' +
        encodeURIComponent('TunnelMind API access')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      padding: '28px',
      background: 'var(--doc-paper)',
      border: `1px solid ${accent}`,
      borderTop: `3px solid ${accent}`,
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: accent, marginBottom: '8px' }}>
          Human access
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: 700, color: 'var(--chrome-text-bright)', letterSpacing: '-0.02em' }}>
            {usd(human.blockPriceUsd)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--chrome-text-dim)' }}>
            / block
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.55', color: 'var(--doc-text-dim)', margin: '10px 0 0' }}>
          One block is <strong style={{ color: 'var(--chrome-text-bright)' }}>{n(human.callsPerBlock)} API calls</strong>.
          Stack as many as you need, no subscription, no expiry, no negotiation.
        </p>
      </div>

      {/* Volume incentive */}
      <div style={{
        padding: '12px 14px',
        background: 'var(--chrome-bg2)',
        border: '1px solid var(--chrome-border)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: '3px',
      }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.6', color: 'var(--doc-text-dim)', margin: 0 }}>
          Spend <strong style={{ color: 'var(--chrome-text-bright)' }}>{usd(human.volume.thresholdUsd)}</strong> total
          ({human.volume.thresholdUsd / human.blockPriceUsd} blocks) and every block after holds{' '}
          <strong style={{ color: accent }}>{n(human.volume.callsPerBlock)} calls</strong>, same {usd(human.blockPriceUsd)}.
          The volume rate sticks for good.
        </p>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {HUMAN_FEATURES.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.5', color: 'var(--doc-text-dim)' }}>
            <span style={{ color: accent, flexShrink: 0, marginTop: '1px' }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {human.checkoutEnabled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com, for your receipt and the volume rate"
            style={{
              padding: '9px 10px', background: 'var(--doc-bg)',
              border: '1px solid var(--chrome-border)', borderRadius: '3px',
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              color: 'var(--chrome-text-bright)',
            }}
          />
          <button
            onClick={() => !busy && startBlockCheckout()}
            disabled={busy}
            style={{
              padding: '10px', background: accent, border: `1px solid ${accent}`,
              borderRadius: '3px', fontFamily: 'var(--font-mono)', fontSize: '10px',
              fontWeight: 700, color: 'var(--chrome-bg)', cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Starting checkout…' : `Buy blocks, from ${usd(human.blockPriceUsd)}`}
          </button>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)', margin: 0, lineHeight: '1.6' }}>
            Choose how many blocks at checkout.
          </p>
        </div>
      ) : (
        <div>
          <button
            disabled
            style={{
              width: '100%', padding: '10px', background: 'transparent',
              border: '1px solid var(--chrome-border)', borderRadius: '3px',
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              color: 'var(--chrome-text-dim)', cursor: 'default',
            }}
          >
            Checkout opens at launch
          </button>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)', margin: '8px 0 0', lineHeight: '1.6' }}>
            Need a key before then?{' '}
            <a href="mailto:hello@tunnelmind.ai?subject=TunnelMind%20%E2%80%94%20API%20access" style={{ color: 'var(--accent-blue)' }}>
              hello@tunnelmind.ai
            </a>
          </p>
        </div>
      )}
    </div>
  )
}

// ── Agent rail — x402 per-query micropayments ───────────────────────
function AgentCard() {
  const accent = 'var(--accent-cyan)'

  return (
    <div style={{
      padding: '28px',
      background: 'var(--chrome-bg2)',
      border: '1px solid var(--chrome-border)',
      borderTop: `3px solid ${accent}`,
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: accent, marginBottom: '8px' }}>
          Agent access · x402
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: 700, color: 'var(--chrome-text-bright)', letterSpacing: '-0.02em' }}>
            Per query
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.55', color: 'var(--doc-text-dim)', margin: '10px 0 0' }}>
          No signup, no API key. An agent calls an endpoint, gets back{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: accent }}>402 Payment Required</code>,
          settles in {agent.settlementAsset}, and retries, the response comes back paid.
        </p>
      </div>

      {/* Per-query price table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--chrome-border)', borderRadius: '3px', overflow: 'hidden' }}>
        {agent.queries.map(q => (
          <div key={q.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', background: 'var(--doc-bg)',
          }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--doc-text-dim)' }}>
              {q.label}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--chrome-text-bright)' }}>
              {usd(q.priceUsd)}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.6', color: 'var(--doc-text-dim)', margin: 0, flex: 1 }}>
        Price tracks endpoint complexity, a domain check is not a full
        attestation receipt. Settlement is {agent.settlementAsset} on a fast
        L2; x402 is a payment rail, nothing more, no token, no account, no
        DeFi.
      </p>

      <a
        href="/api"
        style={{
          padding: '10px', textAlign: 'center', background: 'transparent',
          border: `1px solid ${accent}`, borderRadius: '3px',
          fontFamily: 'var(--font-mono)', fontSize: '10px', color: accent,
          textDecoration: 'none',
        }}
      >
        Read the API docs
      </a>
    </div>
  )
}

// The success banner does real work: on a successful checkout it calls
// /api/checkout-session, which provisions the API key in scry-server and
// returns it. The raw key is shown ONCE — there is no way to recover it —
// so the banner makes copying it unmissable. The Stripe webhook is the
// backstop if the buyer never lands here.
function KeyReveal({ apiKey, calls }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(apiKey).then(
        () => { setCopied(true); setTimeout(() => setCopied(false), 2500) },
        () => {}
      )
    }
  }

  return (
    <div style={{ marginTop: '12px' }}>
      {Number.isFinite(calls) && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-green)', margin: '0 0 8px' }}>
          {n(calls)} API calls credited to this key.
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <code style={{
          flex: 1, minWidth: '240px', fontFamily: 'var(--font-mono)', fontSize: '12px',
          color: 'var(--chrome-text-bright)', background: 'var(--doc-bg)',
          border: '1px solid var(--chrome-border)', borderRadius: '3px',
          padding: '8px 10px', overflowWrap: 'anywhere',
        }}>
          {apiKey}
        </code>
        <button
          onClick={copy}
          style={{
            padding: '8px 12px', background: 'var(--accent-green)',
            border: '1px solid var(--accent-green)', borderRadius: '3px',
            fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
            color: 'var(--chrome-bg)', cursor: 'pointer',
          }}
        >
          {copied ? 'Copied' : 'Copy key'}
        </button>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-amber)', margin: '8px 0 0' }}>
        ⚠ Store this now, it is shown once and cannot be recovered.
      </p>
    </div>
  )
}

function CheckoutBanner({ status, session }) {
  // phase: 'idle' | 'loading' | 'key' | 'topup' | 'pending' | 'error'
  const [phase, setPhase] = useState(status === 'success' && session ? 'loading' : 'idle')
  const [apiKey, setApiKey] = useState('')
  const [info, setInfo] = useState({})

  useEffect(() => {
    if (status !== 'success' || !session) return
    let live = true
    fetch('/api/checkout-session?session=' + encodeURIComponent(session))
      .then(r => r.json().catch(() => null))
      .then(data => {
        if (!live) return
        if (data && data.status === 'paid' && data.key) {
          setApiKey(data.key)
          setInfo({ calls: data.calls_remaining })
          setPhase('key')
        } else if (data && data.status === 'paid' && data.topped_up) {
          setInfo({ prefix: data.prefix, credited: data.calls_credited, remaining: data.calls_remaining })
          setPhase('topup')
        } else {
          setPhase('pending')
        }
      })
      .catch(() => { if (live) setPhase('error') })
    return () => { live = false }
  }, [status, session])

  if (status !== 'success' && status !== 'cancelled') return null

  const ok = status === 'success'
  const accent = ok ? '--accent-green' : '--accent-amber'

  return (
    <div style={{
      padding: '16px 22px', background: 'var(--chrome-bg2)',
      border: '1px solid var(--chrome-border)', borderLeft: `3px solid var(${accent})`,
      borderRadius: '4px', marginBottom: '24px',
    }}>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.7', color: 'var(--doc-text-dim)', margin: 0 }}>
        {!ok &&
          'Checkout was cancelled, no charge was made. Your blocks are here whenever you are ready.'}
        {ok && phase === 'loading' &&
          'Payment received, crediting your calls…'}
        {ok && phase === 'key' &&
          'Payment received, thank you. Here is your API key:'}
        {ok && phase === 'topup' &&
          `Payment received, thank you. ${info.credited ? n(info.credited) + ' calls were added to' : 'Your calls were credited to'} your existing key ${info.prefix || ''}${
            Number.isFinite(info.remaining) ? `, balance is now ${n(info.remaining)} calls` : ''
          }. The raw key was shown only at first purchase; if you no longer have it, email support@tunnelmind.ai to rotate it.`}
        {ok && phase === 'pending' &&
          'Payment received, thank you. Your calls are being credited and your key will arrive by email shortly. If nothing arrives within a few minutes, email support@tunnelmind.ai with your Stripe receipt.'}
        {ok && (phase === 'error' || phase === 'idle') &&
          'Payment received, thank you. Your calls are being credited and your key will arrive by email shortly. If nothing appears within a few minutes, email support@tunnelmind.ai with your Stripe receipt.'}
      </p>
      {ok && phase === 'key' && <KeyReveal apiKey={apiKey} calls={info.calls} />}
    </div>
  )
}

export default function Pricing() {
  const { checkout: checkoutStatus, session: checkoutSession } = readCheckoutParams()

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-green)',
          letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '12px',
        }}>
          ● Pricing
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: '32px',
          fontWeight: 400, color: 'var(--chrome-text-bright)', marginBottom: '10px',
        }}>
          The right to look is free. Depth and scale are the product.
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.7',
          color: 'var(--doc-text-dim)', marginBottom: '40px', maxWidth: '600px',
        }}>
          The radar, chat, the sample API, and the MCP endpoint stay free, no
          account, no key. Beyond the sample there are two ways to pay for the
          whole corpus: prepaid blocks if you are a person, per-query
          micropayments if you are an agent. No tiers, no sales calls.
        </p>

        <CheckoutBanner status={checkoutStatus} session={checkoutSession} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
          marginBottom: '32px',
        }}>
          <HumanCard />
          <AgentCard />
        </div>

        <div style={{
          padding: '18px 22px', background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)', borderLeft: '3px solid var(--accent-amber)',
          borderRadius: '4px', marginBottom: '32px',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.7', color: 'var(--doc-text-dim)', margin: 0 }}>
            Blocks are bought through Stripe, pay, and your Bearer API key is
            issued on the spot. TunnelMind never sees card data. The x402 rail
            settles in {agent.settlementAsset} directly between an agent and the
            endpoint; it is a payment mechanism, not an account.
          </p>
        </div>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)', lineHeight: '1.6' }}>
          Questions? Email{' '}
          <a href="mailto:hello@tunnelmind.ai" style={{ color: 'var(--accent-blue)' }}>
            hello@tunnelmind.ai
          </a>
          . Payment terms and the refund policy are in the{' '}
          <a href="/terms" style={{ color: 'var(--accent-blue)' }}>
            Terms of Service
          </a>
          .
        </p>

      </div>
    </div>
  )
}

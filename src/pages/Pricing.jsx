import React, { useState, useEffect } from 'react'

// /pricing — post-pivot (P25 Phase 2). Free surfaces stay free; the
// defender tier is the paid product (Phase 2b). Stripe handles every
// payment — no crypto, no exceptions.
//
// The Defender CTA POSTs to /api/checkout (functions/api/checkout.js). If
// Stripe is configured on the Pages project it returns a Checkout URL and
// we redirect; if not (503 checkout_unavailable) we fall back to the
// waitlist email so the page is always functional.

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: '--accent-green',
    blurb: 'Everything you need to evaluate the corpus and build light integrations.',
    features: [
      'Live Scry Radar — public sample',
      'Chat — sourced answers, no account',
      'Corpus API — free tier, per-IP limit',
      'MCP endpoint — agent-native access',
      'Single + bulk IP checks',
      'Recent actors, campaigns, tools, stats',
    ],
    cta: 'Start free',
    ctaAction: 'free',
  },
  {
    name: 'Defender',
    price: '$49',
    period: 'month',
    color: '--accent-blue',
    highlight: true,
    blurb: 'The whole corpus, unmetered — built for SOC teams and threat hunters.',
    features: [
      'Full corpus — no public sampling',
      'Complete campaign membership',
      'Payload signatures + tool fingerprints',
      'Unmetered API + MCP (Bearer key)',
      'Bulk export (JSON / CSV)',
      'ASN / country slicing at scale',
      'Priority support',
    ],
    cta: 'Get Defender access',
    ctaAction: 'defender',
  },
  {
    name: 'Team / Enterprise',
    price: 'From $1,500',
    period: 'month',
    color: '--accent-purple',
    blurb: 'Shared keys, custom ingest, and an SLA for organisations standing on the corpus. Billed annually, scoped to your team.',
    features: [
      'Everything in Defender',
      'Shared API key management',
      'Custom sensor / source integration',
      'SLA available',
      'Direct line to the operator',
    ],
    cta: 'Contact us',
    ctaAction: 'contact',
  },
]

// Read the ?checkout= flag (and the Stripe session id) appended to the
// success / cancel URLs. Hash routing means the query lives inside
// window.location.hash, after the route.
function readCheckoutParams() {
  const h = window.location.hash || ''
  const qi = h.indexOf('?')
  if (qi === -1) return {}
  const p = new URLSearchParams(h.slice(qi + 1))
  return { checkout: p.get('checkout'), session: p.get('session') }
}

function PricingCard({ tier, onNavigate }) {
  const [busy, setBusy] = useState(false)

  function emailWaitlist() {
    window.location.href =
      'mailto:hello@tunnelmind.ai?subject=' +
      encodeURIComponent('TunnelMind — Defender waitlist')
  }

  async function startDefenderCheckout() {
    setBusy(true)
    try {
      const resp = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await resp.json().catch(() => null)
      if (resp.ok && data && data.url) {
        window.location.href = data.url
        return
      }
      // checkout_unavailable (503) or any error — fall back to the waitlist.
      emailWaitlist()
    } catch {
      emailWaitlist()
    } finally {
      setBusy(false)
    }
  }

  function handleCta() {
    if (busy) return
    if (tier.ctaAction === 'free') {
      if (onNavigate) onNavigate('tools')
      return
    }
    if (tier.ctaAction === 'defender') {
      startDefenderCheckout()
      return
    }
    // Team / Enterprise → email sales.
    window.location.href =
      'mailto:hello@tunnelmind.ai?subject=' +
      encodeURIComponent('TunnelMind — Team/Enterprise')
  }

  const accent = `var(${tier.color})`

  return (
    <div style={{
      padding: '28px',
      background: tier.highlight ? 'var(--doc-paper)' : 'var(--chrome-bg2)',
      border: `1px solid ${tier.highlight ? accent : 'var(--chrome-border)'}`,
      borderTop: `3px solid ${accent}`,
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      position: 'relative',
    }}>
      {tier.badge && (
        <span style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          color: accent,
          border: `1px solid ${accent}`,
          borderRadius: '2px',
          padding: '1px 5px',
          opacity: 0.75,
        }}>
          {tier.badge}
        </span>
      )}

      <div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 600,
          color: accent,
          marginBottom: '8px',
        }}>
          {tier.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: tier.price ? '26px' : '14px',
            fontWeight: 700,
            color: tier.price ? 'var(--chrome-text-bright)' : 'var(--chrome-text-dim)',
            letterSpacing: '-0.02em',
          }}>
            {tier.price || 'Pricing TBA'}
          </span>
          {tier.price && tier.period && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--chrome-text-dim)',
            }}>
              / {tier.period}
            </span>
          )}
        </div>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '13px',
          lineHeight: '1.55',
          color: 'var(--doc-text-dim)',
          margin: '10px 0 0',
        }}>
          {tier.blurb}
        </p>
      </div>

      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flex: 1,
      }}>
        {tier.features.map(f => (
          <li key={f} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontFamily: 'var(--font-serif)',
            fontSize: '13px',
            lineHeight: '1.5',
            color: 'var(--doc-text-dim)',
          }}>
            <span style={{ color: accent, flexShrink: 0, marginTop: '1px' }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={handleCta}
        disabled={busy}
        style={{
          padding: '10px',
          background: tier.ctaAction === 'free' ? accent : 'transparent',
          border: `1px solid ${tier.ctaAction === 'free' ? accent : 'var(--chrome-border)'}`,
          borderRadius: '3px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          fontWeight: tier.ctaAction === 'free' ? 700 : 400,
          color: tier.ctaAction === 'free' ? '#0f172a' : 'var(--chrome-text)',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Starting checkout…' : tier.cta}
      </button>
    </div>
  )
}

// The success banner does real work: on a successful checkout it calls
// /api/checkout-session, which provisions the Defender key in scry-server
// and returns it. The raw key is shown ONCE — there is no way to recover
// it — so the banner makes copying it unmissable. The Stripe webhook is
// the backstop if the buyer never lands here.
function KeyReveal({ apiKey }) {
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        <code style={{
          flex: 1,
          minWidth: '240px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--chrome-text-bright)',
          background: 'var(--doc-bg)',
          border: '1px solid var(--chrome-border)',
          borderRadius: '3px',
          padding: '8px 10px',
          overflowWrap: 'anywhere',
        }}>
          {apiKey}
        </code>
        <button
          onClick={copy}
          style={{
            padding: '8px 12px',
            background: 'var(--accent-green)',
            border: '1px solid var(--accent-green)',
            borderRadius: '3px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 700,
            color: '#0f172a',
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied' : 'Copy key'}
        </button>
      </div>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--accent-amber)',
        margin: '8px 0 0',
      }}>
        ⚠ Store this now — it is shown once and cannot be recovered.
      </p>
    </div>
  )
}

function CheckoutBanner({ status, session }) {
  // phase: 'idle' | 'loading' | 'key' | 'pending' | 'error'
  const [phase, setPhase] = useState(status === 'success' && session ? 'loading' : 'idle')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    if (status !== 'success' || !session) return
    let live = true
    fetch('/api/checkout-session?session=' + encodeURIComponent(session))
      .then(r => r.json().catch(() => null))
      .then(data => {
        if (!live) return
        if (data && data.status === 'paid' && data.key) {
          setApiKey(data.key)
          setPhase('key')
        } else if (data && data.status === 'paid') {
          // already_issued, key_pending, or webhook-delivered.
          setPhase('pending')
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
      padding: '16px 22px',
      background: 'var(--chrome-bg2)',
      border: '1px solid var(--chrome-border)',
      borderLeft: `3px solid var(${accent})`,
      borderRadius: '4px',
      marginBottom: '24px',
    }}>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '13px',
        lineHeight: '1.7',
        color: 'var(--doc-text-dim)',
        margin: 0,
      }}>
        {!ok &&
          'Checkout was cancelled — no charge was made. The Defender tier is here whenever you are ready.'}
        {ok && phase === 'loading' &&
          'Payment received — provisioning your Defender API key…'}
        {ok && phase === 'key' &&
          'Payment received — thank you. Here is your Defender API key:'}
        {ok && phase === 'pending' &&
          'Payment received — thank you. Your Defender API key has been issued and emailed to you. If it does not arrive within a few minutes, email support@tunnelmind.ai with your Stripe receipt.'}
        {ok && (phase === 'error' || phase === 'idle') &&
          'Payment received — thank you. Your Defender API key is being issued and will arrive by email shortly. If it does not appear within a few minutes, email support@tunnelmind.ai with your Stripe receipt.'}
      </p>
      {ok && phase === 'key' && <KeyReveal apiKey={apiKey} />}
    </div>
  )
}

export default function Pricing({ onNavigate }) {
  const { checkout: checkoutStatus, session: checkoutSession } = readCheckoutParams()

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-green)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          ● Pricing
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 400,
          color: 'var(--chrome-text-bright)',
          marginBottom: '10px',
        }}>
          The right to look is free. Depth and scale are the product.
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          lineHeight: '1.7',
          color: 'var(--doc-text-dim)',
          marginBottom: '40px',
          maxWidth: '560px',
        }}>
          The radar, chat, the free API tier, and MCP stay free — that&apos;s the
          public sample, and the sample is honest. The defender tier opens the
          full corpus for the people whose job is stopping what&apos;s in it.
        </p>

        <CheckoutBanner status={checkoutStatus} session={checkoutSession} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          marginBottom: '40px',
        }}>
          {TIERS.map(tier => (
            <PricingCard key={tier.name} tier={tier} onNavigate={onNavigate} />
          ))}
        </div>

        <div style={{
          padding: '18px 22px',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderLeft: '3px solid var(--accent-amber)',
          borderRadius: '4px',
          marginBottom: '32px',
        }}>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '13px',
            lineHeight: '1.7',
            color: 'var(--doc-text-dim)',
            margin: 0,
          }}>
            Defender is billed monthly through Stripe — pick the tier, pay, and
            your Bearer API key is issued on the spot. Team / Enterprise is
            contract-based and billed annually: email us to scope your access.
            Every payment runs through Stripe; TunnelMind never sees card data.
          </p>
        </div>

        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--chrome-text-dim)',
          lineHeight: '1.6',
        }}>
          Questions? Email{' '}
          <a href="mailto:hello@tunnelmind.ai" style={{ color: 'var(--accent-blue)' }}>
            hello@tunnelmind.ai
          </a>
          . Subscription terms and the refund policy are in the{' '}
          <a href="#/terms" style={{ color: 'var(--accent-blue)' }}>
            Terms of Service
          </a>
          .
        </p>

      </div>
    </div>
  )
}

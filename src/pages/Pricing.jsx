import React from 'react'

// /pricing — post-pivot (P25 Phase 2). Free surfaces stay free; the
// defender tier is the paid product (Phase 2b). Stripe handles every
// payment — no crypto, no exceptions.

// Real Stripe Price IDs land here once the defender tier opens.
const STRIPE_PRICE_DEFENDER = import.meta.env.VITE_STRIPE_PRICE_DEFENDER || null

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
    badge: 'Opening soon',
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
    cta: 'Join the waitlist',
    ctaAction: 'waitlist',
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

function PricingCard({ tier, onNavigate }) {
  function handleCta() {
    if (tier.ctaAction === 'free') {
      if (onNavigate) onNavigate('tools')
      return
    }
    if (tier.ctaAction === 'waitlist' && STRIPE_PRICE_DEFENDER) {
      // Defender checkout opens here once the tier ships (Stripe only).
      window.alert('Defender checkout is opening soon — pricing is being finalized.')
      return
    }
    // Waitlist (pre-launch) and enterprise both route to email.
    window.location.href = 'mailto:hello@tunnelmind.ai?subject=' +
      encodeURIComponent(tier.ctaAction === 'contact' ? 'TunnelMind — Team/Enterprise' : 'TunnelMind — Defender waitlist')
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
        style={{
          padding: '10px',
          background: tier.ctaAction === 'free' ? accent : 'transparent',
          border: `1px solid ${tier.ctaAction === 'free' ? accent : 'var(--chrome-border)'}`,
          borderRadius: '3px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          fontWeight: tier.ctaAction === 'free' ? 700 : 400,
          color: tier.ctaAction === 'free' ? '#0f172a' : 'var(--chrome-text)',
          cursor: 'pointer',
        }}
      >
        {tier.cta}
      </button>
    </div>
  )
}

export default function Pricing({ onNavigate }) {
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
            Pricing is set. Live self-serve checkout opens with Phase 2b — join
            the Defender waitlist and your API key lands the day it ships. Team
            / Enterprise is available now: email us to scope a contract.
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
          . Stripe handles every payment — TunnelMind never stores card data.
        </p>

      </div>
    </div>
  )
}

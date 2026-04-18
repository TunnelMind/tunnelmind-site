import React from 'react'

// TODO: Replace with real Stripe Price IDs once pricing is finalized
const STRIPE_PRICE_API_PRO    = import.meta.env.VITE_STRIPE_PRICE_API_PRO    || null
const STRIPE_PRICE_API_TEAM   = import.meta.env.VITE_STRIPE_PRICE_API_TEAM   || null
const STRIPE_PRICE_PERSONAL   = import.meta.env.VITE_STRIPE_PRICE_PERSONAL   || null

const API_TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    priceId: null,
    color: '--accent-green',
    features: [
      '50 requests / day',
      'Domain + entity lookup',
      'Search endpoint',
      'CORS open — no key needed',
      'Community support',
    ],
    cta: 'Start for free',
    ctaAction: 'free',
  },
  {
    name: 'Pro',
    price: null,
    period: 'month',
    priceId: STRIPE_PRICE_API_PRO,
    color: '--accent-blue',
    badge: 'Coming soon',
    features: [
      // TODO: finalize rate limits and features for paid API tier
      '5,000 requests / day',
      'Full entity graph access',
      'Bulk export (CSV / JSON)',
      'GhostRoute certificate API',
      'Email support',
    ],
    cta: 'Get Pro',
    ctaAction: 'stripe',
  },
  {
    name: 'Team',
    price: null,
    period: 'month',
    priceId: STRIPE_PRICE_API_TEAM,
    color: '--accent-purple',
    badge: 'Coming soon',
    features: [
      // TODO: finalize team tier
      '50,000 requests / day',
      'Shared API key management',
      'Priority support',
      'SLA available',
      'Custom entity tagging',
    ],
    cta: 'Contact us',
    ctaAction: 'contact',
  },
]

const PERSONAL_TIER = {
  name: 'TunnelMind Personal',
  price: null,
  priceId: STRIPE_PRICE_PERSONAL,
  badge: 'Coming soon',
  color: '--accent-cyan',
  features: [
    'ReCenter desktop app',
    'WireGuard enrollment',
    'Live Surveillance Map (eBPF)',
    'Surveillance Dossier Receipt',
    'Resonance coordination graph',
    'GhostRoute Jurisdictional Certificate',
    'Dark Mirror profile inference',
    'Cost of You valuation',
    'ATAP hardware identity (1.5× tier)',
  ],
}

function PricingCard({ tier, highlight }) {
  function handleCta() {
    if (tier.ctaAction === 'free') return
    if (tier.ctaAction === 'stripe' && tier.priceId) {
      // TODO: POST to /api/stripe/connect/create-account with priceId
      window.alert('Stripe checkout coming soon — pricing is not yet finalized.')
    }
    if (tier.ctaAction === 'contact') {
      window.location.href = 'mailto:hello@tunnelmind.ai'
    }
  }

  const accentColor = `var(${tier.color})`

  return (
    <div style={{
      padding: '28px',
      background: highlight ? 'var(--doc-paper)' : 'var(--chrome-bg2)',
      border: `1px solid ${highlight ? accentColor : 'var(--chrome-border)'}`,
      borderTop: `3px solid ${accentColor}`,
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
          color: accentColor,
          border: `1px solid ${accentColor}`,
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
          color: accentColor,
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
            {tier.price || 'TBD'}
          </span>
          {tier.price && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--chrome-text-dim)',
            }}>
              / {tier.period}
            </span>
          )}
        </div>
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
            <span style={{ color: accentColor, flexShrink: 0, marginTop: '1px' }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={handleCta}
        disabled={tier.ctaAction === 'free' ? false : !tier.priceId && tier.ctaAction === 'stripe'}
        style={{
          padding: '10px',
          background: tier.ctaAction === 'free' ? accentColor : 'transparent',
          border: `1px solid ${tier.ctaAction === 'free' ? accentColor : 'var(--chrome-border)'}`,
          borderRadius: '3px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          fontWeight: tier.ctaAction === 'free' ? 700 : 400,
          color: tier.ctaAction === 'free' ? '#0f172a' : 'var(--chrome-text)',
          cursor: 'pointer',
          opacity: (!tier.priceId && tier.ctaAction === 'stripe') ? 0.5 : 1,
        }}
      >
        {tier.cta}
      </button>
    </div>
  )
}

export default function Pricing() {
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
          Simple, transparent pricing
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          lineHeight: '1.7',
          color: 'var(--doc-text-dim)',
          marginBottom: '40px',
          maxWidth: '520px',
        }}>
          Free tools stay free. Paid tiers are in development — pricing will be
          published here when finalized.
        </p>

        {/* API tiers */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--chrome-text-dim)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}>
          Tracker Data API
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '48px',
        }}>
          {API_TIERS.map((tier, i) => (
            <PricingCard key={tier.name} tier={tier} highlight={i === 1} />
          ))}
        </div>

        <div style={{ height: '1px', background: 'var(--chrome-border)', marginBottom: '40px' }} />

        {/* Personal tier */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--chrome-text-dim)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}>
          Personal Enrollment
        </div>
        <div style={{
          padding: '28px',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderTop: '3px solid var(--accent-cyan)',
          borderRadius: '4px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '28px',
          alignItems: 'start',
          position: 'relative',
        }}>
          <span style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            color: 'var(--accent-cyan)',
            border: '1px solid var(--accent-cyan)',
            borderRadius: '2px',
            padding: '1px 5px',
            opacity: 0.75,
          }}>
            {PERSONAL_TIER.badge}
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--accent-cyan)',
                marginBottom: '6px',
              }}>
                {PERSONAL_TIER.name}
              </div>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '14px',
                lineHeight: '1.65',
                color: 'var(--doc-text-dim)',
                margin: 0,
              }}>
                Full kernel-level surveillance intelligence — requires a ReCenter-enrolled
                device. All personal tools, hardware-anchored ATAP identity, and eBPF
                traffic observation.
              </p>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '6px 24px',
            }}>
              {PERSONAL_TIER.features.map(f => (
                <div key={f} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '13px',
                  color: 'var(--doc-text-dim)',
                }}>
                  <span style={{ color: 'var(--accent-cyan)', flexShrink: 0 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--chrome-text-dim)',
            whiteSpace: 'nowrap',
            paddingTop: '28px',
          }}>
            TBD / month
          </div>
        </div>

        {/* Footer note */}
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--chrome-text-dim)',
          marginTop: '32px',
          lineHeight: '1.6',
        }}>
          Questions? Email{' '}
          <a href="mailto:hello@tunnelmind.ai" style={{ color: 'var(--accent-blue)' }}>
            hello@tunnelmind.ai
          </a>
          . Stripe handles all payments — TunnelMind does not store card data.
        </p>

      </div>
    </div>
  )
}

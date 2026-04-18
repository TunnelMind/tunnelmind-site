import React from 'react'

const PRODUCT_CARDS = [
  {
    name: 'NetProbe',
    desc: 'Full domain intelligence — WHOIS, DNS, SSL, HTTP headers, tech stack fingerprinting, plus surveillance tracker scores and ownership data.',
    href: 'https://netprobe.tunnelmind.ai',
    tag: 'Live · Free',
    accentVar: '--accent-green',
  },
  {
    name: 'Surveillance Receipt',
    desc: 'Paste any domains you\'ve visited. Get a line-item invoice showing what your browsing data is worth to the surveillance economy. Fully local — nothing leaves your browser.',
    page: 'receipt',
    tag: 'Live · Free · Local',
    accentVar: '--accent-green',
  },
  {
    name: 'Surveillance Radar',
    desc: '704 surveillance entities and 9,786 domains rendered as an interactive force-directed graph. Click any node to explore corporate ownership chains.',
    href: 'https://radar.tunnelmind.ai',
    tag: 'Live · Free',
    accentVar: '--accent-green',
  },
]

const STATS = [
  { value: '53K+',  label: 'tracked domains' },
  { value: '6,600+', label: 'corporate entities' },
  { value: '704',   label: 'on Radar' },
  { value: '9,786', label: 'ownership links' },
]

function ProductCard({ card, onNavigate }) {
  function handleClick() {
    if (card.href) window.open(card.href, '_blank', 'noopener')
    else if (card.page && onNavigate) onNavigate(card.page)
  }

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '20px',
        background: 'var(--chrome-bg2)',
        border: '1px solid var(--chrome-border)',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color var(--transition), background var(--transition)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `var(${card.accentVar})`
        e.currentTarget.style.background = 'var(--doc-paper)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--chrome-border)'
        e.currentTarget.style.background = 'var(--chrome-bg2)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--chrome-text-bright)',
        }}>
          {card.name}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          color: `var(${card.accentVar})`,
          border: `1px solid var(${card.accentVar})`,
          borderRadius: '2px',
          padding: '1px 5px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          opacity: 0.85,
        }}>
          {card.tag}
        </span>
      </div>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '14px',
        lineHeight: '1.65',
        color: 'var(--doc-text)',
        margin: 0,
        flex: 1,
      }}>
        {card.desc}
      </p>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--accent-blue)',
        marginTop: 'auto',
      }}>
        {card.href || `tunnelmind.ai/${card.page}`} ↗
      </span>
    </div>
  )
}

export default function Landing({ onNavigate }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto', padding: 'clamp(32px, 6vw, 64px) clamp(16px, 4vw, 32px)' }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '56px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--accent-green)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            ● TunnelMind — Adversarial Intelligence
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 400,
            lineHeight: '1.2',
            color: 'var(--chrome-text-bright)',
            marginBottom: '20px',
            letterSpacing: '-0.01em',
          }}>
            They've been studying you for years.
            <br />
            <span style={{ color: 'var(--accent-green)' }}>Now you study them.</span>
          </h1>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '17px',
            lineHeight: '1.7',
            color: 'var(--doc-text-dim)',
            maxWidth: '580px',
            marginBottom: '28px',
          }}>
            TunnelMind exposes who's watching you online — at the kernel level, not
            the browser level. Real signal. No proxy. No DNS redirect.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate && onNavigate('tools')}
              style={{
                padding: '9px 20px',
                background: 'var(--accent-green)',
                border: 'none',
                borderRadius: '3px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              Explore tools
            </button>
            <button
              onClick={() => onNavigate && onNavigate('api')}
              style={{
                padding: '9px 20px',
                background: 'transparent',
                border: '1px solid var(--chrome-border)',
                borderRadius: '3px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--chrome-text)',
                cursor: 'pointer',
              }}
            >
              API docs
            </button>
          </div>
        </section>

        {/* ── Product cards ─────────────────────────────────────────── */}
        <section style={{ marginBottom: '56px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '14px',
          }}>
            Free Tools
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '10px',
          }}>
            {PRODUCT_CARDS.map(card => (
              <ProductCard key={card.name} card={card} onNavigate={onNavigate} />
            ))}
          </div>
        </section>

        {/* ── ReCenter feature block ────────────────────────────────── */}
        <section style={{
          marginBottom: '56px',
          padding: '28px',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderLeft: '3px solid var(--accent-blue)',
          borderRadius: '4px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '24px',
          alignItems: 'center',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--accent-blue)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}>
              ReCenter — Desktop App
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '22px',
              fontWeight: 400,
              color: 'var(--chrome-text-bright)',
              marginBottom: '10px',
            }}>
              Reset your online presence.
            </h2>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '14px',
              lineHeight: '1.65',
              color: 'var(--doc-text-dim)',
              margin: 0,
            }}>
              WireGuard tunnel enrollment, kernel-level eBPF traffic observation,
              and identity management — bundled in a single native app for Linux,
              macOS, and Windows.
            </p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('recenter')}
            style={{
              padding: '9px 18px',
              background: 'transparent',
              border: '1px solid var(--accent-blue)',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--accent-blue)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'background var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(96,165,250,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Learn more →
          </button>
        </section>

        {/* ── API callout ───────────────────────────────────────────── */}
        <section style={{
          marginBottom: '56px',
          padding: '24px 28px',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderLeft: '3px solid var(--accent-amber)',
          borderRadius: '4px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '24px',
          alignItems: 'center',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--accent-amber)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              Tracker Data API
            </div>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '14px',
              lineHeight: '1.65',
              color: 'var(--doc-text-dim)',
              margin: 0,
            }}>
              Build on our surveillance intelligence data. 50 requests/day free,
              CORS open, no API key required.{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-amber)' }}>
                data.tunnelmind.ai
              </code>
            </p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('api')}
            style={{
              padding: '9px 18px',
              background: 'transparent',
              border: '1px solid var(--accent-amber)',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--accent-amber)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'background var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            API docs →
          </button>
        </section>

        {/* ── Stats strip ───────────────────────────────────────────── */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '1px',
          background: 'var(--chrome-border)',
          border: '1px solid var(--chrome-border)',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '0',
        }}>
          {STATS.map(({ value, label }) => (
            <div key={label} style={{
              background: 'var(--chrome-bg2)',
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--accent-green)',
                letterSpacing: '-0.02em',
              }}>
                {value}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                color: 'var(--chrome-text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                {label}
              </span>
            </div>
          ))}
        </section>

      </div>
    </div>
  )
}

import React from 'react'

const LINKS = [
  { label: 'tunnelmind.ai',        href: 'https://tunnelmind.ai' },
  { label: 'alloy.tunnelmind.ai',  href: 'https://alloy.tunnelmind.ai' },
  { label: 'Whitepapers',          href: '/#/whitepapers' },
  { label: 'Extension',            href: '/#/extension' },
  { label: 'Pricing',              href: '/#/pricing' },
]

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--chrome-border)',
      background: 'var(--chrome-bg)',
      padding: '20px 24px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--accent-green)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          TunnelMind AI, LLC
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--chrome-text-dim)',
        }}>
          © {new Date().getFullYear()}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', alignItems: 'center' }}>
        {LINKS.map(({ label, href }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              textDecoration: 'none',
              transition: 'color var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--chrome-text-bright)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--chrome-text-dim)'}
          >
            {label}
          </a>
        ))}
      </div>
    </footer>
  )
}

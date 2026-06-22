import React from 'react'

const LINKS = [
  { label: 'tunnelmind.ai',        href: 'https://tunnelmind.ai' },
  { label: 'API',                  href: '/api' },
  { label: 'Roadmap',              href: '/roadmap' },
  { label: 'Vision',               href: '/vision' },
  { label: 'Whitepapers',          href: '/whitepapers' },
  { label: 'Pricing',              href: '/pricing' },
]

const LEGAL_LINKS = [
  { label: 'Privacy Policy',       href: '/privacy' },
  { label: 'Terms of Service',     href: '/terms' },
  { label: 'Transparency',         href: '/transparency' },
  { label: 'Law Enforcement',      href: '/law-enforcement' },
  { label: 'Abuse Policy',         href: '/abuse' },
  { label: 'Account Risk',         href: '/account-risk' },
  { label: 'Warrant Canary',       href: '/canary.json', external: true },
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', alignItems: 'center' }}>
          {LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)', textDecoration: 'none', transition: 'color var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--chrome-text-bright)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--chrome-text-dim)'}
            >
              {label}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'center' }}>
          {LEGAL_LINKS.map(({ label, href, external }) => (
            <a
              key={href}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--chrome-text-dim)', textDecoration: 'none', transition: 'color var(--transition)', opacity: 0.7 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--chrome-text-bright)'; e.currentTarget.style.opacity = '1' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--chrome-text-dim)'; e.currentTarget.style.opacity = '0.7' }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}

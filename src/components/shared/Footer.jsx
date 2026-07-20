import React from 'react'

// Demoted-from-nav pages live here now (nav went 11 → 4). Everything is still
// reachable by URL for humans and agents; only the top bar got lean.
// P55: 1-bit wp-mac strip — styles live in index.css (.tm-footer).
const LINKS = [
  { label: 'Radar',                href: '/radar' },
  { label: 'Lenses',               href: '/glassbox' },
  { label: 'Tools',                href: '/tools' },
  { label: 'Docs / API',           href: '/api' },
  { label: 'Skills',               href: '/skills' },
  { label: 'Agents',               href: '/agents' },
  { label: 'Compare',              href: '/compare' },
  { label: 'Products',             href: '/products' },
  { label: 'Standards',            href: '/standards' },
  { label: 'Whitepapers',          href: '/whitepapers' },
  { label: 'Vision & Roadmap',     href: '/vision' },
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
    <div className="tm-footer">
      <div className="tm-footer-id">
        <span className="tm-footer-name">TunnelMind AI, LLC</span>
        <span className="tm-footer-copy">&copy; {new Date().getFullYear()}</span>
        <span className="tm-footer-copy">Font: ChiKareGo2 by Giles Booth (CC BY)</span>
      </div>
      <div className="tm-footer-links">
        <div className="tm-footer-row">
          {LINKS.map(({ label, href, external }) => (
            <a
              key={href}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
            >
              {label}
            </a>
          ))}
        </div>
        <div className="tm-footer-row tm-footer-legal">
          {LEGAL_LINKS.map(({ label, href, external }) => (
            <a
              key={href}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

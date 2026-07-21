import React, { useState, useRef, useEffect } from 'react'

// Demoted-from-nav pages live here (nav went 11 → 4). Everything is still
// reachable by URL for humans and agents; only the top bar stays lean.
// P57: the fat footer strip + status line were merged into ONE WordPerfect
// status bar. These links now live behind a pull-up menu so the chrome is a
// single strip. Real <a href> kept — reachability for crawlers/agents matters.
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

const linkEl = ({ label, href, external }) => (
  <a
    key={href}
    href={href}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
  >
    {label}
  </a>
)

export default function FooterMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className="tm-menu" ref={ref}>
      <button
        type="button"
        className="tm-menu-trigger"
        aria-expanded={open}
        aria-controls="tm-menu-panel"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? '▾' : '▴'} Menu
      </button>
      {open && (
        <nav id="tm-menu-panel" className="tm-menu-panel" aria-label="Site links">
          <div className="tm-menu-col">{LINKS.map(linkEl)}</div>
          <div className="tm-menu-col">{LEGAL_LINKS.map(linkEl)}</div>
          <div className="tm-menu-id">
            <span className="tm-footer-name">TunnelMind AI, LLC</span>
            <span className="tm-footer-copy">&copy; {new Date().getFullYear()}</span>
            <span className="tm-footer-copy">Font: ChiKareGo2 by Giles Booth (CC BY)</span>
          </div>
        </nav>
      )}
    </div>
  )
}

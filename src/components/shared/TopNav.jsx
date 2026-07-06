import React, { useState } from 'react'

// Lean nav (2026-07): 11 → 4. The root IS the product now (live Verify
// console), so the primary paths are just: use it · build on it · pay · who.
// Everything else stays reachable via the footer + its own URL — nothing was
// removed, only demoted from the top bar.
const NAV_ITEMS = {
  tunnelmind: [
    { label: 'Verify',   page: 'landing' },
    { label: 'Docs',     page: 'api' },
    { label: 'Pricing',  page: 'pricing' },
    { label: 'About',    page: 'about' },
  ],
}

// currentPage: string (page key)
// onNavigate: (page) => void  — hash router
export default function TopNav({ site = 'tunnelmind', currentPage, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const items = NAV_ITEMS[site]

  function handleNav(page) {
    setMenuOpen(false)
    if (onNavigate) onNavigate(page)
  }

  return (
    <nav style={{
      height: 'var(--nav-height)',
      background: 'var(--chrome-bg)',
      borderBottom: '1px solid var(--chrome-border)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '14px',
      paddingRight: '14px',
      gap: '0',
      flexShrink: 0,
      position: 'relative',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div
        onClick={() => handleNav('landing')}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--accent-green)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          flexShrink: 0,
          marginRight: '20px',
        }}
      >
        TunnelMind
      </div>

      {/* Desktop nav items */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        flex: 1,
        minWidth: 0,
      }} className="tm-nav-desktop">
        {items.map(item => {
          const active = item.page && currentPage === item.page
          const sharedStyle = {
            padding: '4px 10px',
            background: active ? 'var(--selected-overlay)' : 'transparent',
            border: 'none',
            borderRadius: '3px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: active ? 600 : 400,
            color: active ? 'var(--accent-green)' : 'var(--chrome-text)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            transition: 'color var(--transition), background var(--transition)',
          }
          const handleEnter = e => { if (!active) e.currentTarget.style.color = 'var(--chrome-text-bright)' }
          const handleLeave = e => { if (!active) e.currentTarget.style.color = 'var(--chrome-text)' }
          if (item.href) {
            return (
              <a
                key={item.label}
                href={item.href}
                style={sharedStyle}
                onMouseEnter={handleEnter}
                onMouseLeave={handleLeave}
              >
                {item.label}
              </a>
            )
          }
          return (
            <button
              key={item.page}
              onClick={() => handleNav(item.page)}
              style={sharedStyle}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Mobile hamburger */}
      <button
        className="tm-nav-mobile-toggle"
        onClick={() => setMenuOpen(o => !o)}
        style={{
          display: 'none',
          marginLeft: '12px',
          padding: '4px 8px',
          background: 'transparent',
          border: '1px solid var(--chrome-border)',
          borderRadius: '3px',
          color: 'var(--chrome-text)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        aria-label="Menu"
      >
        ☰
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          position: 'absolute',
          top: 'var(--nav-height)',
          left: 0,
          right: 0,
          background: 'var(--chrome-bg2)',
          borderBottom: '1px solid var(--chrome-border)',
          zIndex: 200,
          animation: 'fadeIn 0.12s ease',
        }} className="tm-nav-mobile-menu">
          {items.map(item => {
            const mobileStyle = {
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--chrome-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: item.page && currentPage === item.page ? 'var(--accent-green)' : 'var(--chrome-text-bright)',
              cursor: 'pointer',
              textDecoration: 'none',
            }
            if (item.href) {
              return (
                <a key={item.label} href={item.href} style={mobileStyle} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </a>
              )
            }
            return (
              <button key={item.page} onClick={() => handleNav(item.page)} style={mobileStyle}>
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </nav>
  )
}

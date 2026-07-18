import React from 'react'

// Lean nav (2026-07): 11 → 4. The root IS the product now (live Verify
// console), so the primary paths are just: use it · build on it · pay · who.
// Everything else stays reachable via the footer + its own URL — nothing was
// removed, only demoted from the top bar.
//
// P55: rendered as the classic Mac menu bar (wp-mac). ponytail: the old
// mobile hamburger is gone — the menu bar wraps on narrow screens, same
// links, less code, fully keyboard-operable.
const NAV_ITEMS = {
  tunnelmind: [
    { label: 'Verify',   page: 'landing' },
    { label: 'Docs',     page: 'api' },
    { label: 'Pricing',  page: 'pricing' },
    { label: 'About',    page: 'about' },
  ],
}

// currentPage: string (page key)
// onNavigate: (page) => void
export default function TopNav({ site = 'tunnelmind', currentPage, onNavigate }) {
  const items = NAV_ITEMS[site]

  return (
    <nav className="wpm-menubar" aria-label="Main">
      <button
        className="wpm-menu-item tm-menubar-logo"
        onClick={() => onNavigate && onNavigate('landing')}
      >
        <span aria-hidden="true">&#9670;</span> TunnelMind
      </button>
      {items.map(item => (
        <button
          key={item.page}
          className="wpm-menu-item"
          aria-current={currentPage === item.page ? 'page' : undefined}
          onClick={() => onNavigate && onNavigate(item.page)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

import React, { useState, useRef, useEffect } from 'react'
import { useTM } from '../lib/state.jsx'
import { sha256hex } from '../lib/proofOfWork.js'

const AUTHOR_KEY = import.meta.env.VITE_AUTHOR_KEY

const COMMUNITIES = [
  {
    key: 'internal',
    items: [
      { id: 'dialog', label: 't/dialog', desc: 'Collaborative writing space — read, annotate, vote, contribute', path: '/' },
      { id: 'products', label: 't/products', desc: 'Live tools and products in development', path: '/products' },
      { id: 'roadmap', label: 't/roadmap', desc: 'What we\'re building and when', path: '/roadmap' },
      { id: 'contributors', label: 't/contributors', desc: 'Leaderboard + future compensation', path: '/contributors' },
      { id: 'about', label: 't/about', desc: 'Origin story, philosophy, data sources', path: '/about' },
    ],
  },
  {
    key: 'tools',
    label: 'Live Tools',
    items: [
      { id: 'explore', label: 't/explore', desc: '53k+ domains, surveillance scores, corporate ownership', href: 'https://explore.tunnelmind.ai', external: true },
      { id: 'receipt', label: 't/receipt', desc: 'Upload browser history → dollar value invoice', href: 'https://receipt.tunnelmind.ai', external: true },
      { id: 'radar', label: 't/radar', desc: '704 entities, 9,786 domains — live force graph', href: 'https://radar.tunnelmind.ai', external: true },
      { id: 'api', label: 't/api', desc: 'REST API, 50 req/day free, CORS open', href: 'https://data.tunnelmind.ai', external: true },
    ],
  },
]

const PAGE_BREADCRUMBS = {
  dialog: '· collaborative writing · annotate · vote · contribute',
  products: '· surveillance tools · live + in development',
  roadmap: '· packet-trace timeline · community priorities',
  contributors: '· leaderboard · contribution scoring · future compensation',
  about: '· origin story · philosophy · 22 years of networking',
}

export default function SubredditNav({ currentPage, onNavigate }) {
  const { state, dispatch } = useTM()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const currentCommunity = COMMUNITIES[0].items.find(c => c.id === currentPage) || COMMUNITIES[0].items[0]
  const breadcrumb = PAGE_BREADCRUMBS[currentPage] || ''

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <nav style={{
      height: 'var(--nav-height)',
      background: 'var(--chrome-bg)',
      borderBottom: '1px solid var(--chrome-border)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '10px',
      paddingRight: '10px',
      gap: '8px',
      flexShrink: 0,
      position: 'relative',
      zIndex: 100,
    }}>
      {/* TunnelMind wordmark */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--accent-green)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        flexShrink: 0,
      }}
        onClick={() => onNavigate('dialog')}
      >
        TM
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--chrome-border)' }} />

      {/* Community pill + dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            background: dropdownOpen ? 'var(--chrome-bg2)' : 'transparent',
            border: '1px solid',
            borderColor: dropdownOpen ? 'var(--chrome-text-dim)' : 'var(--chrome-border)',
            borderRadius: '12px',
            color: 'var(--accent-green)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--transition)',
            whiteSpace: 'nowrap',
          }}
          onClick={() => setDropdownOpen(o => !o)}
        >
          {currentCommunity.label}
          <span style={{
            fontSize: '8px',
            color: 'var(--chrome-text-dim)',
            transform: dropdownOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform var(--transition)',
          }}>▼</span>
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '320px',
            background: 'var(--chrome-bg2)',
            border: '1px solid var(--chrome-border)',
            borderRadius: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.15s ease',
            overflow: 'hidden',
          }}>
            {COMMUNITIES.map((group, gi) => (
              <div key={group.key}>
                {group.label && (
                  <div style={{
                    padding: '6px 12px 4px',
                    borderTop: gi > 0 ? '1px solid var(--chrome-border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{ fontSize: '9px', color: 'var(--chrome-text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {group.label}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--accent-amber)' }}>↗</span>
                  </div>
                )}
                {group.items.map(item => (
                  <div
                    key={item.id}
                    style={{
                      padding: '7px 12px',
                      cursor: 'pointer',
                      borderLeft: '2px solid transparent',
                      transition: 'all var(--transition)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--hover-overlay)'
                      e.currentTarget.style.borderLeftColor = 'var(--accent-green)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderLeftColor = 'transparent'
                    }}
                    onClick={() => {
                      if (item.external) {
                        window.open(item.href, '_blank', 'noopener')
                      } else {
                        onNavigate(item.id)
                        setDropdownOpen(false)
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: item.id === currentPage ? 'var(--accent-green)' : 'var(--chrome-text-bright)',
                        fontWeight: item.id === currentPage ? 600 : 400,
                      }}>
                        {item.label}
                      </span>
                      {item.external && (
                        <span style={{ fontSize: '9px', color: 'var(--accent-amber)' }}>↗</span>
                      )}
                      {item.id === currentPage && (
                        <span style={{ fontSize: '8px', color: 'var(--accent-green)' }}>●</span>
                      )}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      color: 'var(--chrome-text-dim)',
                    }}>
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--chrome-text-dim)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flex: 1,
        minWidth: 0,
      }}>
        {breadcrumb}
      </span>

    </nav>
  )
}

import React from 'react'

const INSTALL_LINKS = [
  {
    browser: 'Firefox',
    status: 'Pending AMO review',
    statusColor: '--accent-amber',
    href: 'https://addons.mozilla.org/firefox/addon/tunnelmind-surveillance-receipt/',
    icon: '🦊',
    note: 'v1.1.0 submitted — install from AMO once approved, or load unpacked for now.',
  },
  {
    browser: 'Chrome',
    status: 'Pending Web Store review',
    statusColor: '--accent-amber',
    href: 'https://chromewebstore.google.com',
    icon: '◈',
    note: 'v1.1.0 submitted to Chrome Web Store — pending review.',
  },
]

const CHANGELOG = [
  {
    version: 'v1.1.0',
    date: '2026-04-05',
    changes: [
      'Shadow Graph viewer: bundled D3 v7.9.0 map — no CDN dependency',
      '"View Live Map" button opens extension/graph.html in a new tab',
      'graph.html reads chrome.storage.local directly for offline capability',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-03-01',
    changes: [
      'Initial release — passive tracker interception via webRequest API',
      'Real-time popup showing tracker count and estimated session value',
      'Matches against 9,786 known surveillance domains',
      'One-click Surveillance Receipt generation',
    ],
  },
]

export default function Extension() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-green)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          ● Browser Extension
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 400,
          color: 'var(--chrome-text-bright)',
          marginBottom: '10px',
        }}>
          TunnelMind Surveillance Receipt
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          lineHeight: '1.75',
          color: 'var(--doc-text-dim)',
          marginBottom: '16px',
          maxWidth: '580px',
        }}>
          Passive tracker interception as you browse — no proxy, no DNS redirect.
          Every third-party request is matched against 9,786 known surveillance domains
          in real time. The popup shows who's watching and what your session is worth.
        </p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '40px',
        }}>
          {['No browsing data sent anywhere', 'Firefox + Chrome', 'Open source', '9,786 surveillance domains'].map(tag => (
            <span key={tag} style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '8px',
              color: 'var(--chrome-text-dim)',
              border: '1px solid var(--chrome-border)',
              borderRadius: '2px',
              padding: '3px 7px',
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* ── Install buttons ───────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
          marginBottom: '48px',
        }}>
          {INSTALL_LINKS.map(link => (
            <div key={link.browser} style={{
              padding: '22px',
              background: 'var(--chrome-bg2)',
              border: '1px solid var(--chrome-border)',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{link.icon}</span>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--chrome-text-bright)',
                  }}>
                    {link.browser}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    color: `var(${link.statusColor})`,
                    marginTop: '2px',
                  }}>
                    {link.status}
                  </div>
                </div>
              </div>

              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '12px',
                lineHeight: '1.6',
                color: 'var(--doc-text-dim)',
                margin: 0,
              }}>
                {link.note}
              </p>

              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'transparent',
                  border: '1px solid var(--chrome-border)',
                  borderRadius: '3px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--chrome-text)',
                  textDecoration: 'none',
                  alignSelf: 'flex-start',
                  transition: 'border-color var(--transition), color var(--transition)',
                  opacity: 0.7,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-green)'
                  e.currentTarget.style.color = 'var(--accent-green)'
                  e.currentTarget.style.opacity = '1'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--chrome-border)'
                  e.currentTarget.style.color = 'var(--chrome-text)'
                  e.currentTarget.style.opacity = '0.7'
                }}
              >
                Install from {link.browser === 'Firefox' ? 'AMO' : 'Web Store'} ↗
              </a>
            </div>
          ))}
        </div>

        {/* ── What it does ─────────────────────────────────────────── */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            What it does
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
          }}>
            {[
              { icon: '◉', title: 'Passive interception', desc: 'Every outbound browser request is matched against 9,786 known surveillance domains. No proxy, no DNS redirect — pure webRequest API.', color: '--accent-green' },
              { icon: '◈', title: 'Real-time popup', desc: 'The extension popup shows how many surveillance domains have been contacted this session and the estimated dollar value of your browsing data.', color: '--accent-blue' },
              { icon: '⊕', title: 'Live map', desc: 'Click "View Live Map" to open an interactive D3 force graph of every surveillance entity that has received a request from your browser this session.', color: '--accent-cyan' },
              { icon: '◎', title: 'Receipt generation', desc: 'One click generates a Surveillance Receipt — a line-item invoice showing what your session data is worth, broken down by tracker and category.', color: '--accent-amber' },
            ].map(f => (
              <div key={f.title} style={{
                padding: '18px',
                background: 'var(--chrome-bg2)',
                border: '1px solid var(--chrome-border)',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: `var(${f.color})` }}>{f.icon}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: 'var(--chrome-text-bright)' }}>{f.title}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', lineHeight: '1.65', color: 'var(--doc-text-dim)', margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Changelog ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            Changelog
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', border: '1px solid var(--chrome-border)', borderRadius: '4px', overflow: 'hidden' }}>
            {CHANGELOG.map((entry, i) => (
              <div key={entry.version} style={{
                padding: '16px 20px',
                background: i === 0 ? 'var(--doc-paper)' : 'var(--chrome-bg2)',
                borderBottom: i < CHANGELOG.length - 1 ? '1px solid var(--chrome-border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: i === 0 ? 'var(--accent-green)' : 'var(--chrome-text-bright)',
                  }}>
                    {entry.version}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: 'var(--chrome-text-dim)',
                  }}>
                    {entry.date}
                  </span>
                  {i === 0 && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '8px',
                      color: 'var(--accent-green)',
                      border: '1px solid var(--accent-green)',
                      borderRadius: '2px',
                      padding: '1px 5px',
                      opacity: 0.8,
                    }}>
                      Latest
                    </span>
                  )}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {entry.changes.map(c => (
                    <li key={c} style={{
                      display: 'flex',
                      gap: '8px',
                      fontFamily: 'var(--font-serif)',
                      fontSize: '13px',
                      lineHeight: '1.55',
                      color: 'var(--doc-text-dim)',
                    }}>
                      <span style={{ color: 'var(--chrome-text-dim)', flexShrink: 0 }}>–</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Source ───────────────────────────────────────────────── */}
        <div style={{
          padding: '18px 20px',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '4px',
            }}>
              Source code
            </div>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              color: 'var(--doc-text-dim)',
              margin: 0,
            }}>
              The extension lives in the{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-amber)' }}>extension/</code>
              {' '}directory of the TunnelMind server monorepo.
            </p>
          </div>
          <a
            href="https://github.com/TunnelMind/server/tree/main/extension"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '7px 14px',
              background: 'transparent',
              border: '1px solid var(--chrome-border)',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--chrome-text-dim)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'border-color var(--transition), color var(--transition)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent-green)'
              e.currentTarget.style.color = 'var(--accent-green)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--chrome-border)'
              e.currentTarget.style.color = 'var(--chrome-text-dim)'
            }}
          >
            GitHub ↗
          </a>
        </div>

      </div>
    </div>
  )
}

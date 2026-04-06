import React from 'react'
import InteractiveSentence from '../components/InteractiveSentence.jsx'
import { Ruler } from '../components/WPChrome.jsx'

import t001 from '../content/transmissions/001.json'
import t002 from '../content/transmissions/002.json'
import t003 from '../content/transmissions/003.json'

const TRANSMISSIONS = [t001, t002, t003]

function classificationColor(classification) {
  if (!classification) return 'var(--accent-red)'
  if (classification.includes('ORCON')) return '#ff6b35'
  if (classification.includes('NOFORN')) return '#da3633'
  if (classification.includes('REL')) return '#d29922'
  return 'var(--accent-red)'
}

function TransmissionHeader({ tx }) {
  return (
    <div style={{
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid var(--chrome-border)',
    }}>
      {/* Classification banner */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: classificationColor(tx.classification),
        letterSpacing: '0.15em',
        fontWeight: 700,
        marginBottom: '10px',
        textTransform: 'uppercase',
      }}>
        ▲ {tx.classification} ▲
      </div>

      {/* ASN + metadata grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        marginBottom: '10px',
      }}>
        <MetaCell label="ORIGIN" value={tx.origin} />
        <MetaCell label="TIMESTAMP" value={tx.timestamp} />
        <MetaCell label="NODE" value={tx.node} />
      </div>

      {/* Transmission title */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--chrome-text)',
        letterSpacing: '0.08em',
      }}>
        TRANSMISSION {tx.id.replace('transmission-', '')} — {tx.title.toUpperCase()}
      </div>
    </div>
  )
}

function MetaCell({ label, value }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
    }}>
      <div style={{ color: 'var(--chrome-text-dim)', marginBottom: '2px', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ color: 'var(--chrome-text)' }}>
        {value}
      </div>
    </div>
  )
}

function Transmission({ tx, index }) {
  return (
    <article style={{
      marginBottom: '48px',
      paddingBottom: '48px',
      borderBottom: index < TRANSMISSIONS.length - 1 ? '1px solid var(--chrome-border)' : 'none',
    }}>
      <TransmissionHeader tx={tx} />

      {tx.paragraphs.map(para => (
        <p key={para.key} style={{
          marginBottom: '16px',
          lineHeight: 0,
        }}>
          {para.sentences.map((sentence, si) => (
            <React.Fragment key={sentence.key}>
              <InteractiveSentence
                sentenceId={`${tx.id}-${para.key}-${sentence.key}`}
                content={sentence.text}
                isRedacted={sentence.isRedacted || false}
                redactionThreshold={sentence.redactionThreshold || 5}
              />
              {si < para.sentences.length - 1 ? ' ' : ''}
            </React.Fragment>
          ))}
        </p>
      ))}
    </article>
  )
}

function Sidebar({ onNavigate }) {
  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      flexShrink: 0,
      borderLeft: '1px solid var(--chrome-border)',
      padding: '16px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      overflowY: 'auto',
      fontSize: '10px',
      fontFamily: 'var(--font-mono)',
    }}>
      {/* Transmission index */}
      <div>
        <div style={{
          color: 'var(--chrome-text-dim)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '10px',
          fontSize: '9px',
        }}>Transmissions</div>
        {TRANSMISSIONS.map((tx, i) => (
          <a
            key={tx.id}
            href={`#${tx.id}`}
            style={{
              display: 'block',
              padding: '6px 8px',
              marginBottom: '2px',
              color: 'var(--chrome-text)',
              textDecoration: 'none',
              borderLeft: '2px solid transparent',
              transition: 'all var(--transition)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--hover-overlay)'
              e.currentTarget.style.borderLeftColor = 'var(--accent-green)'
              e.currentTarget.style.color = 'var(--accent-green)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderLeftColor = 'transparent'
              e.currentTarget.style.color = 'var(--chrome-text)'
            }}
          >
            <div style={{ fontSize: '9px', color: 'var(--chrome-text-dim)', marginBottom: '2px' }}>
              {String(i + 1).padStart(3, '0')} — {tx.timestamp.slice(0, 10)}
            </div>
            <div style={{ fontSize: '10px' }}>{tx.title}</div>
            <div style={{ fontSize: '8px', color: 'var(--chrome-text-dim)', marginTop: '2px' }}>
              {tx.origin.split(' — ')[0]}
            </div>
          </a>
        ))}

        <div style={{
          marginTop: '8px',
          padding: '6px 8px',
          color: 'var(--chrome-text-dim)',
          fontSize: '9px',
          borderLeft: '2px solid var(--chrome-border)',
          fontStyle: 'italic',
        }}>
          More transmissions incoming...
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--chrome-border)' }} />

      {/* About this site */}
      <div>
        <div style={{
          color: 'var(--chrome-text-dim)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '10px',
          fontSize: '9px',
        }}>About TunnelMind</div>

        <div style={{ color: 'var(--chrome-text)', lineHeight: '1.6', marginBottom: '12px' }}>
          Adversarial intelligence platform. Exposes, models, and reverse-engineers surveillance actor behavior.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { label: 'Explorer', href: 'https://explore.tunnelmind.ai', desc: '53k+ domains' },
            { label: 'Receipt', href: 'https://receipt.tunnelmind.ai', desc: 'Browser history invoice' },
            { label: 'Radar', href: 'https://radar.tunnelmind.ai', desc: '704 entities' },
            { label: 'Data API', href: 'https://data.tunnelmind.ai', desc: 'Free REST API' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'var(--accent-green)',
                textDecoration: 'none',
                fontSize: '9px',
                padding: '3px 0',
                borderBottom: '1px solid var(--chrome-border)',
              }}
            >
              <span>{link.label} ↗</span>
              <span style={{ color: 'var(--chrome-text-dim)' }}>{link.desc}</span>
            </a>
          ))}
        </div>

        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { label: 't/products', id: 'products' },
            { label: 't/roadmap', id: 'roadmap' },
            { label: 't/contributors', id: 'contributors' },
            { label: 't/about', id: 'about' },
          ].map(nav => (
            <button
              key={nav.id}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--chrome-text-dim)',
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                textAlign: 'left',
                padding: '3px 0',
              }}
              onClick={() => onNavigate(nav.id)}
            >
              {nav.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default function Dialog({ onNavigate }) {
  return (
    <div style={{
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
      minHeight: 0,
    }}>
      {/* Main content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--doc-bg)',
        minWidth: 0,
      }}>
        <Ruler page="dialog" classification="TUNNELMIND // SIGINT" />

        <div style={{
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          padding: '40px 32px',
        }}>
          {/* Novel header */}
          <div style={{ marginBottom: '48px', textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              TunnelMind // Serialized Fiction // Intercepted Transmissions
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '36px',
              fontWeight: 400,
              color: 'var(--doc-text)',
              marginBottom: '8px',
              lineHeight: 1.2,
            }}>
              The Shadow Graph
            </h1>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '16px',
              color: 'var(--doc-text-dim)',
              fontStyle: 'italic',
            }}>
              A novel about the infrastructure of surveillance
            </div>

            {/* Interaction hint */}
            <div style={{
              marginTop: '24px',
              padding: '10px 16px',
              background: 'var(--chrome-bg2)',
              border: '1px solid var(--chrome-border)',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              display: 'inline-block',
            }}>
              Hover any sentence to vote, correct, or annotate · Redacted passages declassify at vote threshold
            </div>
          </div>

          {/* Transmissions */}
          {TRANSMISSIONS.map((tx, i) => (
            <div key={tx.id} id={tx.id}>
              <Transmission tx={tx} index={i} />
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar onNavigate={onNavigate} />
    </div>
  )
}

import React, { useState } from 'react'

const ENDPOINTS = [
  {
    name: 'Tracker Data API',
    base: 'https://data.tunnelmind.ai',
    tag: 'Live · 50 req/day free',
    tagColor: '--accent-green',
    routes: [
      {
        method: 'GET',
        path: '/v1/domains',
        desc: 'List tracked surveillance domains. Supports pagination and filtering by entity.',
        params: [
          { name: 'limit', type: 'integer', desc: 'Max results (default 50, max 200)' },
          { name: 'offset', type: 'integer', desc: 'Pagination offset' },
          { name: 'entity_id', type: 'string', desc: 'Filter by entity UUID' },
        ],
        example: `GET https://data.tunnelmind.ai/v1/domains?limit=2`,
        response: `{
  "domains": [
    {
      "domain": "doubleclick.net",
      "entity_id": "a1b2c3d4",
      "entity_name": "Google LLC",
      "category": "ad_tech",
      "score": 98
    },
    {
      "domain": "liveramp.com",
      "entity_id": "e5f6a7b8",
      "entity_name": "LiveRamp Holdings",
      "category": "data_broker",
      "score": 95
    }
  ],
  "total": 53412,
  "offset": 0
}`,
      },
      {
        method: 'GET',
        path: '/v1/entities',
        desc: 'List surveillance entities (companies, data brokers, ad networks). Includes ownership links.',
        params: [
          { name: 'limit', type: 'integer', desc: 'Max results (default 50, max 200)' },
          { name: 'offset', type: 'integer', desc: 'Pagination offset' },
          { name: 'category', type: 'string', desc: 'Filter: ad_tech, data_broker, analytics, cdn' },
        ],
        example: `GET https://data.tunnelmind.ai/v1/entities?category=data_broker&limit=2`,
        response: `{
  "entities": [
    {
      "id": "e5f6a7b8",
      "name": "LiveRamp Holdings",
      "category": "data_broker",
      "domain_count": 47,
      "parent_id": null
    }
  ],
  "total": 6623,
  "offset": 0
}`,
      },
      {
        method: 'GET',
        path: '/v1/search',
        desc: 'Search domains and entities by keyword.',
        params: [
          { name: 'q', type: 'string', desc: 'Search query (domain fragment or entity name)' },
          { name: 'type', type: 'string', desc: '"domain" | "entity" | "all" (default: all)' },
        ],
        example: `GET https://data.tunnelmind.ai/v1/search?q=doubleclick`,
        response: `{
  "results": [
    {
      "type": "domain",
      "domain": "doubleclick.net",
      "entity_name": "Google LLC",
      "score": 98
    }
  ]
}`,
      },
    ],
  },
  {
    name: 'GhostRoute Certificate API',
    base: 'https://data.tunnelmind.ai',
    tag: 'Live · Free · Public',
    tagColor: '--accent-cyan',
    routes: [
      {
        method: 'POST',
        path: '/ghostroute/verify',
        desc: 'Verify a GhostRoute Jurisdictional Routing Certificate. Returns the certificate content and confirms the Ed25519 signature is valid.',
        params: [
          { name: 'certificate_id', type: 'string', desc: 'UUID of the certificate to verify' },
          { name: 'content_hash', type: 'string', desc: 'SHA-256 hash of the certificate content' },
          { name: 'signature', type: 'string', desc: 'Base64-encoded Ed25519 signature' },
        ],
        example: `POST https://data.tunnelmind.ai/ghostroute/verify
Content-Type: application/json

{
  "certificate_id": "gr-2026-abc123",
  "content_hash": "sha256:e3b0c44298fc...",
  "signature": "base64:MEUCIQDxyz..."
}`,
        response: `{
  "valid": true,
  "certificate_id": "gr-2026-abc123",
  "peer_id": "peer-001",
  "verdict": "PARTIAL",
  "jurisdictions": ["US_FISA702", "EU_GDPR_ADEQUATE"],
  "signed_at": "2026-04-18T12:00:00Z",
  "signer": "ed25519:tm-2026-03"
}`,
      },
    ],
  },
]

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div style={{ position: 'relative' }}>
      <pre style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        lineHeight: '1.6',
        color: 'var(--accent-green)',
        background: 'var(--chrome-bg)',
        border: '1px solid var(--chrome-border)',
        borderRadius: '3px',
        padding: '12px 14px',
        overflowX: 'auto',
        margin: 0,
        whiteSpace: 'pre',
      }}>
        {children}
      </pre>
      <button
        onClick={copy}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          padding: '2px 7px',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderRadius: '2px',
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          color: copied ? 'var(--accent-green)' : 'var(--chrome-text-dim)',
          cursor: 'pointer',
        }}
      >
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  )
}

function MethodBadge({ method }) {
  const colors = {
    GET: 'var(--accent-green)',
    POST: 'var(--accent-blue)',
    DELETE: 'var(--accent-red)',
  }
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
      fontWeight: 700,
      color: colors[method] || 'var(--chrome-text)',
      border: `1px solid ${colors[method] || 'var(--chrome-border)'}`,
      borderRadius: '2px',
      padding: '2px 6px',
      flexShrink: 0,
    }}>
      {method}
    </span>
  )
}

function RouteSection({ route }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      border: '1px solid var(--chrome-border)',
      borderRadius: '3px',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: open ? 'var(--doc-paper)' : 'var(--chrome-bg2)',
          cursor: 'pointer',
          transition: 'background var(--transition)',
        }}
      >
        <MethodBadge method={route.method} />
        <code style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--chrome-text-bright)',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {route.path}
        </code>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--chrome-text-dim)',
          display: 'none',
          '@media(minWidth:500px)': { display: 'block' },
        }}>
          {route.desc.split(' ').slice(0, 6).join(' ')}…
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--chrome-text-dim)',
          flexShrink: 0,
        }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && (
        <div style={{
          padding: '20px',
          borderTop: '1px solid var(--chrome-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          background: 'var(--doc-bg)',
        }}>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '14px',
            lineHeight: '1.65',
            color: 'var(--doc-text)',
            margin: 0,
          }}>
            {route.desc}
          </p>

          {route.params && route.params.length > 0 && (
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--chrome-text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '8px',
              }}>
                Parameters
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {route.params.map(p => (
                    <tr key={p.name} style={{ borderBottom: '1px solid var(--chrome-border)' }}>
                      <td style={{
                        padding: '7px 12px 7px 0',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--accent-amber)',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'top',
                        width: '1%',
                      }}>
                        {p.name}
                      </td>
                      <td style={{
                        padding: '7px 12px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: 'var(--chrome-text-dim)',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'top',
                        width: '1%',
                      }}>
                        {p.type}
                      </td>
                      <td style={{
                        padding: '7px 0 7px 0',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '13px',
                        color: 'var(--doc-text-dim)',
                        verticalAlign: 'top',
                      }}>
                        {p.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}>
              Example request
            </div>
            <CodeBlock>{route.example}</CodeBlock>
          </div>

          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}>
              Example response
            </div>
            <CodeBlock>{route.response}</CodeBlock>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Api({ onNavigate }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        {/* Header */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-green)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          ● Developer API
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 400,
          color: 'var(--chrome-text-bright)',
          marginBottom: '10px',
        }}>
          Build on TunnelMind's surveillance intelligence data.
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          lineHeight: '1.7',
          color: 'var(--doc-text-dim)',
          marginBottom: '40px',
          maxWidth: '600px',
        }}>
          REST API powered by 53K+ tracked domains, 6,600+ corporate entities, and
          real-time GhostRoute certificate verification. CORS open — call it directly
          from the browser.
        </p>

        {/* Auth + rate limits */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          marginBottom: '40px',
        }}>
          <div style={{
            padding: '18px 20px',
            background: 'var(--chrome-bg2)',
            border: '1px solid var(--chrome-border)',
            borderLeft: '3px solid var(--accent-green)',
            borderRadius: '4px',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--accent-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}>
              Authentication
            </div>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--doc-text-dim)',
              margin: 0,
            }}>
              No API key required for free tier. Pass{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-amber)' }}>
                Authorization: Bearer &lt;key&gt;
              </code>{' '}
              header for higher rate limits.{' '}
              <span
                onClick={() => onNavigate && onNavigate('pricing')}
                style={{ color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Get an API key →
              </span>
            </p>
          </div>

          <div style={{
            padding: '18px 20px',
            background: 'var(--chrome-bg2)',
            border: '1px solid var(--chrome-border)',
            borderLeft: '3px solid var(--accent-amber)',
            borderRadius: '4px',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--accent-amber)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}>
              Rate limits
            </div>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--doc-text-dim)',
              margin: 0,
            }}>
              <strong style={{ color: 'var(--chrome-text-bright)' }}>Free:</strong> 50 requests/day per IP.{' '}
              <strong style={{ color: 'var(--chrome-text-bright)' }}>Paid:</strong> higher limits available —{' '}
              <span
                onClick={() => onNavigate && onNavigate('pricing')}
                style={{ color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                see pricing
              </span>.
              {/* TODO: document exact paid tier rate limits once pricing is finalized */}
            </p>
          </div>
        </div>

        {/* Endpoint groups */}
        {ENDPOINTS.map(group => (
          <section key={group.name} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <h2 style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--chrome-text-bright)',
                margin: 0,
              }}>
                {group.name}
              </h2>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                color: `var(${group.tagColor})`,
                border: `1px solid var(${group.tagColor})`,
                borderRadius: '2px',
                padding: '1px 5px',
                opacity: 0.85,
              }}>
                {group.tag}
              </span>
              <a
                href={group.base}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--accent-blue)',
                  textDecoration: 'none',
                  marginLeft: 'auto',
                }}
              >
                {group.base.replace('https://', '')} ↗
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {group.routes.map(route => (
                <RouteSection key={route.path} route={route} />
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <div style={{
          padding: '24px',
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
              marginBottom: '6px',
            }}>
              Need more?
            </div>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              color: 'var(--doc-text-dim)',
              margin: 0,
            }}>
              Higher rate limits, bulk exports, and entity graph access are available on paid plans.
            </p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('pricing')}
            style={{
              padding: '8px 18px',
              background: 'transparent',
              border: '1px solid var(--chrome-border)',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--chrome-text)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            See pricing →
          </button>
        </div>

      </div>
    </div>
  )
}

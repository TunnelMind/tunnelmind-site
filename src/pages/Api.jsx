import React, { useState } from 'react'

// /api — post-pivot (P25 Phase 2). Documents the live attacker-corpus
// API (scry-server v0.2.0 at api.tunnelmind.ai) and the MCP endpoint.
// Endpoints + response shapes verified against the running service.

const ENDPOINTS = [
  {
    name: 'Corpus API',
    base: 'https://api.tunnelmind.ai',
    tag: 'Live · Free tier',
    tagColor: '--accent-green',
    routes: [
      {
        method: 'GET',
        path: '/v1/check/{ip}',
        desc: 'Look up a single IP against the corpus. Returns category, confidence bucket, protocols and ports observed, ASN, country, and observation count.',
        params: [
          { name: 'ip', type: 'path', desc: 'IPv4 or IPv6 address to check' },
        ],
        example: 'GET https://api.tunnelmind.ai/v1/check/45.141.56.49',
        response: `{
  "ip": "45.141.56.49",
  "status": "observed",
  "category": "actor",
  "confidence_bucket": "high",
  "first_seen_ms": 1778288596802,
  "last_seen_ms": 1778336268495,
  "observation_count": 576,
  "protocols": ["telnet"],
  "ports": [23],
  "asn": "213373",
  "country": "AT"
}`,
      },
      {
        method: 'POST',
        path: '/v1/check/bulk',
        desc: 'Check up to 100 IPs in a single round trip — one request for a whole block list.',
        params: [
          { name: 'ips', type: 'string[]', desc: 'Array of IP addresses (max 100)' },
        ],
        example: `POST https://api.tunnelmind.ai/v1/check/bulk
Content-Type: application/json

{ "ips": ["45.141.56.49", "128.199.25.179"] }`,
        response: `{
  "results": [
    { "ip": "45.141.56.49", "status": "observed",
      "category": "actor", "confidence_bucket": "high" },
    { "ip": "128.199.25.179", "status": "observed",
      "category": "actor", "confidence_bucket": "high" }
  ]
}`,
      },
      {
        method: 'GET',
        path: '/v1/recent',
        desc: 'Most recently observed hostile source IPs, newest first. Cursor-paginated via next_cursor_since_ms.',
        params: [
          { name: 'limit', type: 'integer', desc: 'Max results (default 50)' },
          { name: 'since_ms', type: 'integer', desc: 'Cursor — only results after this timestamp' },
        ],
        example: "GET https://api.tunnelmind.ai/v1/recent?limit=50",
        response: `{
  "limit": 50,
  "filters": { "include_noise": false },
  "results": [
    {
      "source_ip": "128.199.25.179",
      "category": "actor",
      "confidence_bucket": "high",
      "observations": 51,
      "asn": null,
      "country": null
    }
  ],
  "next_cursor_since_ms": 1778995391971
}`,
      },
      {
        method: 'GET',
        path: '/v1/campaigns',
        desc: 'Coordinated clusters of actors sharing a payload signature across multiple networks. Active campaigns by default.',
        params: [
          { name: 'limit', type: 'integer', desc: 'Max results (default 50)' },
          { name: 'include_inactive', type: 'boolean', desc: 'Include campaigns no longer active' },
        ],
        example: 'GET https://api.tunnelmind.ai/v1/campaigns',
        response: `{
  "include_inactive": false,
  "results": [
    {
      "id": "c87eaae90aa8a6e9",
      "protocol": "telnet",
      "payload_sha256_prefix": "0693621d03183c49",
      "member_actor_count": 2327,
      "confidence_bucket": "low",
      "active": true
    }
  ]
}`,
      },
      {
        method: 'GET',
        path: '/v1/tools',
        desc: 'Distinct attacker tools, identified as clusters of actors that share a payload pattern. Drill into one with /v1/tool/{id}.',
        params: [
          { name: 'protocol', type: 'string', desc: 'Filter by protocol (telnet, ssh, http…)' },
          { name: 'limit', type: 'integer', desc: 'Max results (default 50)' },
        ],
        example: 'GET https://api.tunnelmind.ai/v1/tools',
        response: `{
  "results": [
    {
      "id": "87eaae90aa8a6e9e",
      "protocol": "telnet",
      "actor_count": 2896,
      "payload_sha256_prefix": "0693621d03183c49",
      "first_seen_ms": 1778288596802,
      "last_seen_ms": 1778994731943
    }
  ]
}`,
      },
      {
        method: 'GET',
        path: '/v1/stats',
        desc: 'Corpus totals — total observations, distinct source IPs, last-24h volume, and the protocol breakdown. /v1/stats/timeseries returns the same broken out over time.',
        params: [],
        example: 'GET https://api.tunnelmind.ai/v1/stats',
        response: `{
  "total_observations": 253692,
  "distinct_source_ips": 10191,
  "observations_last_24h": 25306,
  "distinct_source_ips_last_24h": 1653,
  "by_protocol": {
    "telnet": 180611,
    "http": 23260,
    "https": 15253,
    "ssh": 14751
  }
}`,
      },
      {
        method: 'GET',
        path: '/v1/asn/{asn}  ·  /v1/country/{cc}  ·  /v1/top',
        desc: 'Slice the corpus by network or geography: all observed actors in an ASN, in a country (ISO 3166-1 alpha-2), or the top actors overall by observation count.',
        params: [
          { name: 'asn', type: 'path', desc: 'Autonomous System Number, e.g. 213373' },
          { name: 'cc', type: 'path', desc: 'Two-letter country code, e.g. AT' },
        ],
        example: 'GET https://api.tunnelmind.ai/v1/country/AT',
        response: `{
  "country": "AT",
  "results": [
    { "source_ip": "45.141.56.49", "category": "actor",
      "confidence_bucket": "high", "observations": 576 }
  ]
}`,
      },
    ],
  },
  {
    name: 'MCP — agent-native access',
    base: 'https://mcp.tunnelmind.ai',
    tag: 'Live · Free',
    tagColor: '--accent-cyan',
    routes: [
      {
        method: 'POST',
        path: '/mcp',
        desc: 'The Model Context Protocol endpoint — JSON-RPC 2.0 over streamable HTTP. Point any MCP-capable agent at it and the corpus becomes a callable tool. Start with tools/list to discover what is available.',
        params: [
          { name: 'jsonrpc', type: 'string', desc: 'Protocol version — always "2.0"' },
          { name: 'method', type: 'string', desc: 'JSON-RPC method, e.g. tools/list or tools/call' },
          { name: 'id', type: 'integer', desc: 'Request identifier echoed in the response' },
        ],
        example: `POST https://mcp.tunnelmind.ai/mcp
Content-Type: application/json

{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }`,
        response: `{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      { "name": "check_ip", "description": "Look up an IP in the corpus" },
      { "name": "recent_actors", "description": "Recently observed attackers" }
    ]
  }
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
          Build on the attacker corpus.
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          lineHeight: '1.7',
          color: 'var(--doc-text-dim)',
          marginBottom: '40px',
          maxWidth: '600px',
        }}>
          REST over the same signed corpus the radar draws — real source IPs,
          campaigns, attacker tools, and rolling stats. JSON in, JSON out, CORS
          open. The MCP endpoint exposes the identical corpus to AI agents.
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
              No key needed for the free tier — call it straight from the
              browser. Pass{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-amber)' }}>
                Authorization: Bearer &lt;key&gt;
              </code>{' '}
              on the defender tier for unmetered access.
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
              <strong style={{ color: 'var(--chrome-text-bright)' }}>Free:</strong> per-IP limit,
              plenty for evaluation and light use.{' '}
              <strong style={{ color: 'var(--chrome-text-bright)' }}>Defender:</strong> unmetered —{' '}
              <span
                onClick={() => onNavigate && onNavigate('pricing')}
                style={{ color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                see pricing
              </span>.
            </p>
          </div>
        </div>

        {/* Endpoint groups */}
        {ENDPOINTS.map(group => (
          <section key={group.name} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
              Running at scale?
            </div>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              color: 'var(--doc-text-dim)',
              margin: 0,
            }}>
              The defender tier removes the rate limit and unlocks full campaign
              membership and payload signatures.
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

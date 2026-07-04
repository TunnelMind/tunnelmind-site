import React from 'react'

// /agents — TunnelMind is MCP-native.
//
// The vendor-neutral counterpart to /skills: any MCP-capable agent framework
// (Claude, Gemini/ADK, or anything speaking Streamable HTTP JSON-RPC) points
// a standard MCP client at the live servers and gets the same tools Claude
// gets. No shim, no SDK, no TunnelMind-specific glue.
//
// The ADK snippet below is copied from the WORKING reference agent in
// github.com/TunnelMind (tunnelmind-agents/gemini-interop) — P54 rule: if it
// doesn't run, it doesn't go on this page. Tool counts are from live
// discovery 2026-07-04, not aspiration.

const SERVERS = [
  {
    url: 'mcp.tunnelmind.ai',
    tools: 12,
    accent: '--accent-green',
    name: 'Scry',
    blurb: 'Attacker intelligence corpus: live check on any IP, bulk checks, campaigns, per-ASN / country / protocol aggregates, timeseries.',
  },
  {
    url: 'mcp.sigil.tunnelmind.ai',
    tools: 12,
    accent: '--accent-cyan',
    name: 'Sigil',
    blurb: 'Supply verification: ads.txt authorization, IP classification, app bundles, supply paths, entity trust scoring, ATAP receipts — plus cross_lens_verify, the fused Scry × Sigil verdict.',
  },
  {
    url: 'mcp-data.tunnelmind.ai',
    tools: 69,
    accent: '--accent-amber',
    name: 'Full data plane',
    blurb: 'Everything: cross-lens verdicts, signed receipts and offline verification, Tracker lens, GhostRoute, preflight_should_i_act, entity profiles, compliance exports.',
  },
]

const ADK_SNIPPET = `# Google ADK — works as-is (pip install google-adk google-genai mcp)
from google.adk.agents import LlmAgent
from google.adk.tools import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import (
    StreamableHTTPConnectionParams,
)

root_agent = LlmAgent(
    name="tunnelmind_analyst",
    model="gemini-3.5-flash",
    tools=[
        McpToolset(connection_params=StreamableHTTPConnectionParams(
            url="https://mcp.tunnelmind.ai/mcp")),
        McpToolset(connection_params=StreamableHTTPConnectionParams(
            url="https://mcp.sigil.tunnelmind.ai/mcp")),
        McpToolset(connection_params=StreamableHTTPConnectionParams(
            url="https://mcp-data.tunnelmind.ai/mcp"),
            tool_name_prefix="data"),
    ],
)`

const DISCOVER_CURL = `curl -X POST https://mcp.tunnelmind.ai/mcp \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`

const mono = { fontFamily: 'var(--font-mono)' }

function Code({ children }) {
  return (
    <pre style={{
      background: 'var(--chrome-bg2)', border: '1px solid var(--chrome-border)',
      borderLeft: '3px solid var(--accent-green)', borderRadius: '4px',
      padding: '16px 18px', margin: '0 0 18px', overflowX: 'auto',
      ...mono, fontSize: '12.5px', lineHeight: 1.55,
      color: 'var(--chrome-text-bright)',
    }}>{children}</pre>
  )
}

export default function Agents() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 24px 80px', overflowY: 'auto' }}>
      <div style={{ ...mono, fontSize: '10px', color: 'var(--chrome-text-dim)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '10px' }}>
        /agents — framework interop
      </div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '30px', color: 'var(--chrome-text-bright)', margin: '0 0 14px' }}>
        MCP-native. Bring any agent.
      </h1>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', lineHeight: 1.7, color: 'var(--doc-text-dim)', margin: '0 0 28px' }}>
        TunnelMind's tool surface is the Model Context Protocol itself — not an SDK with an
        MCP wrapper bolted on. Claude, Gemini (via Google's Agent Development Kit), and any
        other MCP-capable framework connect the same way: point a standard MCP client at the
        servers below. Streamable HTTP JSON-RPC, stateless, discovery unauthenticated.
        Tools are enumerated at connect time — your agent always sees the current surface.
      </p>

      {SERVERS.map(s => (
        <div key={s.url} style={{
          border: '1px solid var(--chrome-border)', borderLeft: `3px solid var(${s.accent})`,
          borderRadius: '4px', padding: '16px 20px', marginBottom: '12px', background: 'var(--chrome-bg2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
            <code style={{ ...mono, fontSize: '13.5px', fontWeight: 700, color: `var(${s.accent})` }}>{s.url}</code>
            <span style={{ ...mono, fontSize: '11px', color: 'var(--chrome-text-dim)' }}>{s.tools} tools · POST /mcp</span>
          </div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', lineHeight: 1.6, color: 'var(--doc-text-dim)', margin: '8px 0 0' }}>
            <strong style={{ color: 'var(--chrome-text-bright)' }}>{s.name}.</strong> {s.blurb}
          </p>
        </div>
      ))}

      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--chrome-text-bright)', margin: '36px 0 10px' }}>
        See the tools first
      </h2>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: 1.7, color: 'var(--doc-text-dim)', margin: '0 0 12px' }}>
        Discovery needs no account and no key:
      </p>
      <Code>{DISCOVER_CURL}</Code>

      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--chrome-text-bright)', margin: '36px 0 10px' }}>
        Gemini / ADK in one file
      </h2>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: 1.7, color: 'var(--doc-text-dim)', margin: '0 0 12px' }}>
        This is the working reference agent, verbatim — ADK's <code style={{ ...mono, fontSize: '12.5px' }}>McpToolset</code> is
        a standard MCP client, so there is nothing TunnelMind-specific to install. The
        <code style={{ ...mono, fontSize: '12.5px' }}> tool_name_prefix</code> on the third server disambiguates the
        few tool names it shares with Sigil.
      </p>
      <Code>{ADK_SNIPPET}</Code>

      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--chrome-text-bright)', margin: '36px 0 10px' }}>
        What the responses guarantee
      </h2>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: 1.7, color: 'var(--doc-text-dim)', margin: '0 0 8px' }}>
        Verdict responses carry a signed receipt whose <code style={{ ...mono, fontSize: '12.5px' }}>attestation_strength</code> field
        states exactly how strong the underlying evidence chain is — <code style={{ ...mono, fontSize: '12.5px' }}>self-asserted</code>,{' '}
        <code style={{ ...mono, fontSize: '12.5px' }}>software</code>, <code style={{ ...mono, fontSize: '12.5px' }}>tee-tpm</code>, or{' '}
        <code style={{ ...mono, fontSize: '12.5px' }}>silicon-root</code>. The receipt is Ed25519-signed and verifiable offline
        with <code style={{ ...mono, fontSize: '12.5px' }}>@tunnelmindai/receipt-verify</code>; the tier field is the claim — nothing
        stronger is implied. Agents should report it verbatim rather than translating it
        into their own confidence language.
      </p>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', lineHeight: 1.7, color: 'var(--chrome-text-dim)', margin: '16px 0 0' }}>
        Anonymous calls run on the free rate-limited tier. A Bearer token (see{' '}
        <a href="/pricing" style={{ color: 'var(--accent-cyan)' }}>pricing</a>) lifts the limits — same tools, same protocol.
      </p>
    </div>
  )
}

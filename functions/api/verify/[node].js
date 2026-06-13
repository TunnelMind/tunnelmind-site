// GET /api/verify/:node — same-origin proxy for the hero Verify widget.
//
// The site's CSP is connect-src 'self', so the browser cannot call
// data.tunnelmind.ai directly (see reference: site CSP connect-src self).
// This Function proxies the cross-lens verdict for one node and forwards
// only the fields the widget renders — including the signed receipt, which
// the existing /api/corpus/cross-lens proxy does NOT pass through.
//
// Upstream is POST data.tunnelmind.ai/v1/verify/{node}. That endpoint is
// edge-cached upstream and fast when warm (~1s) but can be slow cold
// (seen up to ~18s, occasionally >30s). CF Pages Functions hard-502 past
// ~10s of pending fetch, so we cap the wait at 9s and return a clean
// 504 the widget can fall back from — never let it become an un-catchable
// edge 502. A 300s edge cache keeps repeat/curated lookups instant.

import { normalizeHost, json, fetchWithTimeout } from '../corpus/_lib.js'

const DATA_BASE = 'https://data.tunnelmind.ai'

export async function onRequestGet(context) {
  const node = normalizeHost(context.params.node)
  if (!node) return json({ error: 'invalid_node' }, 400)

  let r
  try {
    r = await fetchWithTimeout(
      `${DATA_BASE}/v1/verify/${encodeURIComponent(node)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'TunnelMindSite/1.0 (+https://tunnelmind.ai)',
        },
        body: '{}',
      },
      9000,
    )
  } catch {
    // AbortError (our 9s deadline) or a network blip — the widget shows a
    // "taking longer than usual" state and links to the full corpus view.
    return json({ error: 'verify_timeout', node }, 504)
  }

  if (!r.ok) return json({ error: 'verify_upstream', node, status: r.status }, 502)

  const body = await r.json()
  const d = body && body.data
  if (!d) return json({ error: 'verify_empty', node }, 502)

  // Forward only what the widget draws. The receipt is the payoff — a real
  // Ed25519-signed artifact the visitor can re-verify — so it goes through
  // intact rather than being trimmed to a boolean.
  return json({
    node:             d.node              ?? { value: node },
    scry:             d.scry              ?? null,
    sigil:            d.sigil             ?? null,
    ghostroute:       d.ghostroute        ?? null,
    cross_lens:       d.cross_lens        ?? null,
    sigil_token:      body.sigil_token     ?? null,
    token_signed:     body.token_signed    ?? null,
    token_expires_at: body.token_expires_at ?? null,
    receipt:          body.receipt          ?? null,
  }, 200, 300)
}

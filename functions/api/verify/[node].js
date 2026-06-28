// GET /api/verify/:node — same-origin proxy for the hero Verify widget.
//
// The site's CSP is connect-src 'self', so the browser cannot call
// data.tunnelmind.ai directly (see reference: site CSP connect-src self).
// This Function proxies the cross-lens verdict for one node and forwards
// only the fields the widget renders — including the signed receipt, which
// the existing /api/corpus/cross-lens proxy does NOT pass through.
//
// Upstream is POST data.tunnelmind.ai/v1/verify/{node}. That endpoint is
// fast warm (~1-2s) but slow cold (seen 9-30s). CF Pages Functions hard-502
// past ~10s of pending fetch, so we cap the wait at 9s and return a clean
// 504 the widget can fall back from (and auto-retry — the first cold call
// warms the upstream, so the retry usually lands).
//
// Caching: a Cache-Control header alone does NOT populate the CF edge cache
// for a dynamic Function response — you must use the Cache API. So we
// read-through caches.default keyed by node and store successful verdicts
// for 300s. This is what actually makes the curated examples + repeat
// lookups instant; the header version was a no-op.

import { normalizeHost, json, fetchWithTimeout } from '../corpus/_lib.js'

const DATA_BASE = 'https://data.tunnelmind.ai'
const CACHE_TTL = 300
// Background warm budget. Longer than the foreground 9s cap (no client is
// waiting on it) but bounded so a detached task can't run unbounded.
const WARM_TIMEOUT_MS = 28_000

const VERIFY_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'User-Agent': 'TunnelMindSite/1.0 (+https://tunnelmind.ai)',
}

// Fire-and-forget: run the verify to completion with a generous deadline so the
// upstream's per-stage + result KV caches actually populate. Used via
// context.waitUntil when the foreground 9s attempt times out on a cold node —
// our abort cancels that attempt mid-flight, so without this the node never
// warms and stays permanently stuck behind the 9s cap. Best-effort; never throws.
async function warmUpstream(node) {
  try {
    await fetchWithTimeout(
      `${DATA_BASE}/v1/verify/${encodeURIComponent(node)}`,
      { method: 'POST', headers: VERIFY_HEADERS, body: '{}' },
      WARM_TIMEOUT_MS,
    )
  } catch { /* best-effort warm — nothing is waiting on it */ }
}

export async function onRequestGet(context) {
  const node = normalizeHost(context.params.node)
  if (!node) return json({ error: 'invalid_node' }, 400)

  // Stable, node-scoped cache key (ignore querystring / cache-buster params).
  const cache = caches.default
  const cacheKey = new Request(`https://verify.cache/${encodeURIComponent(node)}`, { method: 'GET' })

  const hit = await cache.match(cacheKey)
  if (hit) return hit

  let r
  try {
    r = await fetchWithTimeout(
      `${DATA_BASE}/v1/verify/${encodeURIComponent(node)}`,
      { method: 'POST', headers: VERIFY_HEADERS, body: '{}' },
      9000,
    )
  } catch {
    // AbortError (our 9s deadline) or a network blip. The browser gets a fast
    // 504 (widget falls back + retries), but we detach a long-budget warm so the
    // upstream completes in the background and populates its caches — otherwise a
    // slow-cold node never self-warms (our abort kills it) and stays stuck. The
    // visitor's retry, or the next visitor, then lands on a warm node.
    context.waitUntil(warmUpstream(node))
    return json({ error: 'verify_timeout', node }, 504)
  }

  if (!r.ok) return json({ error: 'verify_upstream', node, status: r.status }, 502)

  const body = await r.json()
  const d = body && body.data
  if (!d) return json({ error: 'verify_empty', node }, 502)

  // Forward only what the widget draws. The receipt is the payoff — a real
  // Ed25519-signed artifact the visitor can re-verify — so it goes through
  // intact rather than being trimmed to a boolean.
  const payload = {
    node:             d.node              ?? { value: node },
    scry:             d.scry              ?? null,
    sigil:            d.sigil             ?? null,
    ghostroute:       d.ghostroute        ?? null,
    tracker:          d.tracker           ?? null,
    cross_lens:       d.cross_lens        ?? null,
    sigil_token:      body.sigil_token     ?? null,
    token_signed:     body.token_signed    ?? null,
    token_expires_at: body.token_expires_at ?? null,
    receipt:          body.receipt          ?? null,
  }

  // GhostRoute races a 5s deadline upstream: a cold node returns a fast
  // 3-lens verdict with ghostroute {available:false, reason:'ghostroute_pending'}
  // while its routing stage keeps warming in the background. We must NOT cache
  // that partial — caching it would pin the pending verdict for 300s and the
  // 4th lens would never land. Return it un-cached (so the widget can show a
  // "verifying routing…" state) and detach a long warm so the upstream
  // completes; the widget's background re-fetch, or the next visitor, then gets
  // the full 4-lens verdict (which does get cached).
  const grPending =
    payload.ghostroute &&
    payload.ghostroute.available === false &&
    payload.ghostroute.reason === 'ghostroute_pending'

  if (grPending) {
    context.waitUntil(warmUpstream(node))
    return json(payload, 200, 0) // no-store — let the next call land the full verdict
  }

  const resp = json(payload, 200, CACHE_TTL)
  // Store the complete verdict at the edge so repeat / curated lookups are
  // instant even while the upstream is cold. Non-blocking.
  context.waitUntil(cache.put(cacheKey, resp.clone()))
  return resp
}

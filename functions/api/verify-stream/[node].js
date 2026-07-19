// POST /api/verify-stream/:node — same-origin streaming proxy for the live
// VerifyTrace component (P56). The site's CSP is connect-src 'self', so the
// browser can't call data.tunnelmind.ai directly; this passes the NDJSON
// stream through UNTOUCHED — no caching, no buffering, no reshaping. The
// honesty principle lives or dies here: the client sees each lens event at
// the moment the upstream flushed it.
//
// Unlike /api/verify (9s cap + edge cache), no timeout cap is needed: the
// upstream emits its four lens-start lines immediately, so time-to-first-byte
// is instant and the Pages pending-fetch limit never triggers.

const DATA_BASE = 'https://data.tunnelmind.ai'

export async function onRequest({ request, params }) {
  const node = String(params.node || '').trim().toLowerCase()
  if (!node || node.length > 255) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid node' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const upstream = await fetch(`${DATA_BASE}/v1/verify/${encodeURIComponent(node)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
      'User-Agent': 'TunnelMindSite/1.0 (+https://tunnelmind.ai)',
      // Same console self-traffic tag as /api/verify — this proxy
      // re-originates the request, so the tag must be set here.
      'X-TM-Source': 'web-console',
    },
    body: '{}',
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

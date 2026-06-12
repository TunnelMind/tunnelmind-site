// GET /api/ecosystem-stats — four-lens corpus scoreboard for the /compare page.
//
// Same-origin proxy to the data-api's ecosystem stats so the page can fetch it
// under the site's strict CSP (connect-src 'self'). Distinct from /api/stats,
// which proxies scry-server's Scry-only stats (api.tunnelmind.ai) for the radar
// hero — this one carries the Sigil supply-graph + Tracker counts the page cites.
//
// The upstream (data.tunnelmind.ai/v1/stats) already serves a weekly KV snapshot,
// so a short edge cache here is plenty.

const DATA_ORIGIN = 'https://data.tunnelmind.ai'
const CACHE_TTL_S = 3600

export async function onRequestGet() {
  const resp = await fetch(`${DATA_ORIGIN}/v1/stats`, {
    headers: { Accept: 'application/json' },
  })

  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  headers.set('Cache-Control', resp.ok ? `public, max-age=${CACHE_TTL_S}` : 'no-store')

  return new Response(resp.body, { status: resp.status, headers })
}

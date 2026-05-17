// GET /api/check/:ip — single fresh-domain / IP lookup against the corpus.
//
// Unlike the cached /api/{recent,campaigns,stats} endpoints, this one is
// DELIBERATELY routed through the PUBLIC api.tunnelmind.ai (not the `API`
// service binding) and forwards the real viewer IP. P25 Phase 2 requires
// fresh-domain queries to be rate-limited per viewer — the landing is the
// highest-value scrape target — and the public API already enforces a
// per-IP limit. Using the service binding here would bypass exactly the
// limit we want.
//
// OPEN FOLLOW-UP (see PR notes): P25 specifies a 5/IP/hour ceiling for
// anonymous fresh-domain queries, tighter than the public API's general
// limit. A dedicated counter must NOT use a cloud free-tier KV quota on
// the hot path (see memory: feedback_no_freetier_loadbearing) — implement
// with a Durable Object or VPS Postgres. Not built in this Phase 2 port.

export async function onRequestGet(context) {
  const { request, params } = context
  const ip = encodeURIComponent(params.ip)
  const clientIp = request.headers.get('CF-Connecting-IP') || ''

  const resp = await fetch(`https://api.tunnelmind.ai/v1/check/${ip}`, {
    headers: {
      Accept: 'application/json',
      // Forward the real viewer IP so the public API's per-IP rate limit
      // applies to the viewer, not to this proxy's egress IP.
      'X-Forwarded-For': clientIp,
    },
  })

  const headers = new Headers(resp.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Cache-Control', 'no-store')
  return new Response(resp.body, { status: resp.status, headers })
}

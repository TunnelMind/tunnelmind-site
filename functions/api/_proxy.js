// Shared proxy for the radar's cached corpus endpoints (P25 Phase 2).
//
// Replaces the scry-radar Worker's /api/* routes. The radar polls these
// from the browser; proxying server-side keeps the corpus surface
// (scry-api) isolated and lets us cache at the edge.
//
// Binding: when the Pages project has a Service Binding named `API` to
// `scry-api`, we use it — that bypasses the public per-IP rate limit
// (radar viewers behind one corporate NAT would otherwise share an IP
// and exhaust it). Without the binding we fall back to the public
// endpoint so the site still works before the binding is configured.
//
// Underscore-prefixed: not a route, import-only.

export async function proxyToApi(context, path, cacheTtl) {
  const { request, env } = context
  const url = new URL(request.url)
  const target = path + url.search

  let resp
  if (env.API && typeof env.API.fetch === 'function') {
    resp = await env.API.fetch(
      new Request('https://api.tunnelmind.ai' + target, {
        headers: { Accept: 'application/json' },
      })
    )
  } else {
    resp = await fetch('https://api.tunnelmind.ai' + target, {
      headers: { Accept: 'application/json' },
    })
  }

  const headers = new Headers(resp.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Cache-Control', cacheTtl ? `public, max-age=${cacheTtl}` : 'no-store')
  // The upstream rate-limit headers are computed against the proxy's
  // egress IP, not the viewer's — strip them so they don't mislead.
  headers.delete('X-RateLimit-Limit')
  headers.delete('X-RateLimit-Remaining')
  headers.delete('X-RateLimit-Reset')

  return new Response(resp.body, { status: resp.status, headers })
}

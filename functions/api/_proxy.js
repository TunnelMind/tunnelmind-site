// Shared proxy for the radar's cached corpus endpoints (P25 Phase 2).
//
// Replaces the scry-radar Worker's /api/* routes. The radar reads these
// (live, via /api/stream's server-side loop); proxying server-side lets
// us cache at the edge so concurrent viewers share corpus reads.
//
// The corpus API (`scry-server`) runs on the VPS, reached over plain
// HTTPS at api.tunnelmind.ai. It is not a Cloudflare Worker, so there is
// no Service Binding — see wrangler.toml.
//
// Underscore-prefixed: not a route, import-only.

const CORPUS_ORIGIN = 'https://api.tunnelmind.ai'

export async function proxyToApi(context, path, cacheTtl) {
  const url = new URL(context.request.url)
  const resp = await fetch(CORPUS_ORIGIN + path + url.search, {
    headers: { Accept: 'application/json' },
  })

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

// GET /api/check/:ip — single fresh-domain / IP lookup against the corpus.
//
// Unlike the cached /api/{recent,campaigns,stats} endpoints, this one is
// DELIBERATELY routed through the PUBLIC api.tunnelmind.ai (not the `API`
// service binding) and forwards the real viewer IP. Using the service
// binding here would bypass exactly the per-viewer limit we want.
//
// Two layers of rate limiting:
//   1. A 5/IP/hour ceiling enforced locally by a Durable Object counter
//      (RateLimiter). P25 Phase 2: the landing is the highest-value scrape
//      target. The DO is strongly consistent and quota-free on the hot
//      path — never KV (see memory: feedback_no_freetier_loadbearing).
//   2. The public API's own general per-IP limit, reached via the
//      forwarded X-Forwarded-For.
//
// Layer 1 degrades gracefully: if the RATE_LIMITER binding has not been
// configured in the Pages dashboard yet, the local cap is skipped and
// layer 2 still applies — exactly the pre-binding behaviour.

import { RateLimiter } from '../_rate-limiter.js'

// Re-export so the Pages Functions bundle includes the DO class — the
// RATE_LIMITER binding's class_name must resolve inside this Worker.
export { RateLimiter }

export async function onRequestGet(context) {
  const { request, params, env } = context
  const ip = encodeURIComponent(params.ip)
  const clientIp = request.headers.get('CF-Connecting-IP') || ''

  // ── Layer 1: local 5/IP/hour ceiling (Durable Object) ──────────────
  if (env.RATE_LIMITER && clientIp) {
    const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(clientIp))
    const verdict = await stub.fetch('https://rate-limiter/').then((r) => r.json())
    if (!verdict.allowed) {
      const retryMs = Math.max(0, verdict.reset_ms - Date.now())
      return new Response(
        JSON.stringify({
          error: 'rate_limited',
          message:
            'Anonymous lookups are capped at 5 per hour. The chat and API surfaces have room to breathe — try those.',
          limit: verdict.limit,
          retry_after_ms: retryMs,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Retry-After': String(Math.ceil(retryMs / 1000)),
          },
        },
      )
    }
  }

  // ── Forward to the public corpus API ───────────────────────────────
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

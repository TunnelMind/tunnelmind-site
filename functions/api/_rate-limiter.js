// Durable Object — per-IP sliding-window rate limiter for the anonymous
// fresh-lookup endpoint (/api/check/:ip). P25 Phase 2 caps anonymous
// queries at 5 per IP per hour: the landing is the highest-value scrape
// target on the property.
//
// Why a Durable Object and NOT KV: a rate-limit counter lives on the
// request hot path. Cloudflare KV is eventually-consistent and its free
// tier is a quota that must never be load-bearing (see memory:
// feedback_no_freetier_loadbearing). A DO gives a single-threaded,
// strongly-consistent counter with no quota on the read/write path —
// state lives in the DO's own transactional storage.
//
// Underscore-prefixed: import-only, not a route. The class is re-exported
// from functions/api/check/[ip].js so the Pages Functions bundle carries
// it and the RATE_LIMITER binding's class_name resolves.

const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const LIMIT = 5

export class RateLimiter {
  constructor(state) {
    this.state = state
  }

  async fetch() {
    const now = Date.now()
    // `hits` is the list of request timestamps still inside the window.
    let hits = (await this.state.storage.get('hits')) || []
    hits = hits.filter((t) => now - t < WINDOW_MS)

    const allowed = hits.length < LIMIT
    if (allowed) {
      hits.push(now)
      await this.state.storage.put('hits', hits)
    }

    const oldest = hits.length ? hits[0] : now
    return new Response(
      JSON.stringify({
        allowed,
        limit: LIMIT,
        remaining: Math.max(0, LIMIT - hits.length),
        reset_ms: oldest + WINDOW_MS,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }
}

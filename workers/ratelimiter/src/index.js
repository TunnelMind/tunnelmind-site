// tunnelmind-ratelimiter — a Durable-Object-only Worker.
//
// Cloudflare Pages cannot DEFINE a Durable Object; it can only bind to one
// that lives in a Worker. So the RateLimiter DO lives here, and the
// tunnelmind-site Pages project binds RATE_LIMITER to this script via
// `script_name` (see ../../wrangler.toml).
//
// Why a Durable Object and NOT KV: a rate-limit counter sits on the
// request hot path. KV is eventually-consistent and its free tier is a
// quota that must never be load-bearing (memory: feedback_no_freetier_
// loadbearing). A DO gives a single-threaded, strongly-consistent counter
// with no quota on the read/write path — state lives in the DO's own
// transactional storage.

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

// The Worker carries no public routes — it exists only to host the DO.
// A bare 404 keeps direct hits to the workers.dev URL tidy.
export default {
  fetch() {
    return new Response('tunnelmind-ratelimiter: durable-object host only\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    })
  },
}

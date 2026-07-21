// GET /api/example — same-origin proxy to the data-api's rotating "example of
// the day" (the hero verify widget's default: a real signed verdict picked by
// the daily example-pick cron). Needed because the site's CSP is connect-src
// 'self'; the widget can't hit data.tunnelmind.ai directly.
//
// KV-backed upstream, so a short edge cache is plenty. On any upstream failure
// we pass the status through and the widget falls back to its baked SEED.

const DATA_ORIGIN = 'https://data.tunnelmind.ai'
const CACHE_TTL_S = 300

export async function onRequestGet() {
  let resp
  try {
    resp = await fetch(`${DATA_ORIGIN}/v1/example`, { headers: { Accept: 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'upstream unreachable' }), {
      status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  headers.set('Cache-Control', resp.ok ? `public, max-age=${CACHE_TTL_S}` : 'no-store')
  return new Response(resp.body, { status: resp.status, headers })
}

// GET /api/stream — Server-Sent Events feed for the radar (P25 Phase 2).
//
// Replaces the browser's 10s polling with one persistent connection: the
// server runs the poll loop and pushes a combined { recent, campaigns,
// stats, timeseries } payload as a `snapshot` event every INTERVAL_MS.
//
// The loop fetches this site's own /api/{recent,campaigns,stats}
// endpoints — which are edge-cached — so many concurrent viewers in a
// colo share cached corpus data rather than each hammering scry-api.
//
// The stream closes itself after MAX_TICKS; the browser's EventSource
// reconnects automatically, so a long-lived viewer just sees a seamless
// hand-off rather than an unbounded connection.

const INTERVAL_MS = 10_000
const MAX_TICKS = 150 // ~25 min, then close cleanly and let the client reconnect

export function onRequestGet(context) {
  const origin = new URL(context.request.url).origin
  const encoder = new TextEncoder()

  let stopped = false
  let timer = null

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (text) => {
        if (stopped) return
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          stopped = true // controller already closed (client gone)
        }
      }

      let ticks = 0
      const tick = async () => {
        if (stopped) return
        try {
          const snap = await buildSnapshot(origin)
          enqueue(`event: snapshot\ndata: ${JSON.stringify(snap)}\n\n`)
        } catch {
          // Transient upstream error — keep the connection open and the
          // client keeps its last good snapshot; retry on the next tick.
        }
        if (stopped) return
        if (++ticks >= MAX_TICKS) {
          stopped = true
          try { controller.close() } catch { /* already closed */ }
          return
        }
        timer = setTimeout(tick, INTERVAL_MS)
      }

      // A comment line flushes headers and opens the stream immediately.
      enqueue(': connected\n\n')
      await tick()
    },

    cancel() {
      // Client disconnected — stop the loop.
      stopped = true
      if (timer) clearTimeout(timer)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// One snapshot = the three corpus reads the radar needs, fetched through
// the site's own cached endpoints (which carry the API service binding).
async function buildSnapshot(origin) {
  const get = (path) =>
    fetch(new URL(path, origin), { headers: { Accept: 'application/json' } })
      .then((r) => r.json())

  const [recent, campaigns, stats, timeseries] = await Promise.all([
    get('/api/recent?limit=50'),
    get('/api/campaigns?limit=20'),
    get('/api/stats'),
    get('/api/timeseries'),
  ])
  return { recent, campaigns, stats, timeseries }
}

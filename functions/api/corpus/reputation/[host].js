// GET /api/corpus/reputation/:host — reputation across public feeds.
//
// First feed: URLhaus (abuse.ch) host lookup — tells us whether the
// name has shown up in any malware-distribution URL. Future expansions
// (ThreatFox, Spamhaus DROP, the local Scry corpus) layer in here; the
// inspector renders whatever sources come back.
//
// Edge-cached 5 minutes so the visitor stream amortizes across viewers.

import { normalizeHost, json, fetchWithTimeout } from '../_lib.js'

export async function onRequestGet(context) {
  const host = normalizeHost(context.params.host)
  if (!host) return json({ error: 'invalid_host' }, 400)

  const sources = await Promise.allSettled([
    urlhaus(host),
  ])

  return json({
    host,
    sources: {
      urlhaus: sources[0].status === 'fulfilled' ? sources[0].value : { error: 'lookup_failed' },
    },
  }, 200, 300)
}

async function urlhaus(host) {
  const r = await fetchWithTimeout(
    'https://urlhaus-api.abuse.ch/v1/host/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'host=' + encodeURIComponent(host),
    },
  )
  if (!r.ok) throw new Error(`urlhaus_${r.status}`)
  const j = await r.json()
  return trimUrlhaus(j)
}

export function trimUrlhaus(j) {
  if (!j || j.query_status !== 'ok') {
    return { listed: false, status: (j && j.query_status) || 'no_results' }
  }
  const urls = Array.isArray(j.urls) ? j.urls : []
  return {
    listed: urls.length > 0,
    total_urls: urls.length,
    online: urls.filter((u) => u && u.url_status === 'online').length,
    tags: Array.from(new Set(
      urls.flatMap((u) => (u && Array.isArray(u.tags) ? u.tags : []))
    )).slice(0, 10),
    first_seen: j.firstseen || null,
    most_recent: urls.length ? urls[0].dateadded || null : null,
  }
}

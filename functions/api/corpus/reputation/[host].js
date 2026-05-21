// GET /api/corpus/reputation/:host — reputation across public feeds.
//
// Split contract by input kind:
//   - IP     → /v1/check on scry-server. Returns Augur's redistributable
//              enrichment view (URLhaus, ThreatFox, Tor exit, …) plus
//              our own observation/actor-class state. No live third
//              party in the request path.
//   - domain → urlhaus (abuse.ch) live host lookup. scry-server doesn't
//              carry domain enrichment yet, so this stays on the live
//              upstream until Augur grows a domain index.
//
// We used to hit urlhaus live for IPs too, but it's community-run and
// flakes on cold workers — the "first lookup fails, retry works" UX on
// the Reputation tab traced back to that. Mirrors the bgpview→/v1/check
// migration shipped 2026-05-21 for the ASN tab.
//
// Edge-cached 5 minutes so the visitor stream amortizes across viewers.

import { normalizeHost, normalizeIp, json, fetchWithTimeout } from '../_lib.js'

const SCRY_BASE = 'https://api.tunnelmind.ai'

export async function onRequestGet(context) {
  const host = normalizeHost(context.params.host)
  if (!host) return json({ error: 'invalid_host' }, 400)

  if (normalizeIp(host)) {
    const scry = await scryReputation(host)
    return json({ host, kind: 'ip', sources: { scry } }, 200, 300)
  }

  const settled = await Promise.allSettled([urlhaus(host)])
  return json({
    host,
    kind: 'domain',
    sources: {
      urlhaus: settled[0].status === 'fulfilled' ? settled[0].value : { error: 'lookup_failed' },
    },
  }, 200, 300)
}

async function scryReputation(ip) {
  const r = await fetchWithTimeout(
    `${SCRY_BASE}/v1/check/${encodeURIComponent(ip)}`,
    { headers: { Accept: 'application/json' } },
    4000,
  )
  if (!r.ok) return { error: 'lookup_failed' }
  const j = await r.json()
  return trimScryCheck(j)
}

// Map /v1/check into a flat "did anyone flag this IP" view. We surface
// enrichment_count / promoted (≥2-source agreement) / source names, plus
// the actor_class overlay so the renderer can show "security vendor"
// vs. "hostile" framing without a second call.
export function trimScryCheck(j) {
  if (!j || typeof j !== 'object') return { listed: false, status: 'no_results' }
  const enrichment_count = Number(j.enrichment_count || 0)
  const observation_count = Number(j.observation_count || 0)
  const sources = Array.isArray(j.enrichment_sources) ? j.enrichment_sources : []
  return {
    listed: enrichment_count > 0,
    enrichment_count,
    enrichment_promoted: Number(j.enrichment_promoted || 0),
    sources,
    observation_count,
    status: j.status || (enrichment_count > 0 ? 'listed' : 'not_listed'),
    actor_class: j.actor_class || null,
    actor_class_label: j.actor_class_label || null,
    actor_class_trust: j.actor_class_trust || null,
    first_seen_ms: j.first_seen_ms || null,
    last_seen_ms: j.last_seen_ms || null,
  }
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

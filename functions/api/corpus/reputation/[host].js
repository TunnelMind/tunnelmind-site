// GET /api/corpus/reputation/:host — reputation across public feeds.
//
// Both input kinds now proxy our own scry-server. No live third-party
// call in the request path on either branch:
//   - IP     → /v1/check (Augur's IP enrichment + actor_class overlay)
//   - domain → /v1/check-domain (Augur's domain enrichment — URLhaus host
//              extraction + ThreatFox domain IOCs, with subdomain hits
//              counted separately so an apex query still tells you when
//              child names are flagged)
//
// We used to hit urlhaus-api.abuse.ch live for both, which is community-
// run and flakes on cold workers — that was the "first lookup fails,
// retry works" UX. Mirrors the bgpview→/v1/check migration shipped
// 2026-05-21 for the ASN tab; same shape, both inputs now.
//
// Edge-cached 5 minutes so the visitor stream amortizes across viewers.

import { normalizeHost, normalizeIp, json, fetchWithTimeout } from '../_lib.js'

const SCRY_BASE = 'https://api.tunnelmind.ai'

export async function onRequestGet(context) {
  const host = normalizeHost(context.params.host)
  if (!host) return json({ error: 'invalid_host' }, 400)

  if (normalizeIp(host)) {
    const scry = await scryCheckIp(host)
    return json({ host, kind: 'ip', sources: { scry } }, 200, 300)
  }

  const scry = await scryCheckDomain(host)
  return json({ host, kind: 'domain', sources: { scry } }, 200, 300)
}

async function scryCheckIp(ip) {
  const r = await fetchWithTimeout(
    `${SCRY_BASE}/v1/check/${encodeURIComponent(ip)}`,
    { headers: { Accept: 'application/json' } },
    4000,
  )
  if (!r.ok) return { error: 'lookup_failed' }
  const j = await r.json()
  return trimScryCheck(j)
}

async function scryCheckDomain(domain) {
  const r = await fetchWithTimeout(
    `${SCRY_BASE}/v1/check-domain/${encodeURIComponent(domain)}`,
    { headers: { Accept: 'application/json' } },
    4000,
  )
  if (!r.ok) return { error: 'lookup_failed' }
  const j = await r.json()
  return trimScryCheckDomain(j)
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
    kind: 'ip',
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

// Map /v1/check-domain. Two distinct signal classes the renderer treats
// differently:
//   - enrichment_*  → direct domain indicators (the domain IS the IoC).
//     listed=true on this is a hard signal an agent or ad buyer can act on.
//   - url_hosted_*  → URLs hosted on this domain were flagged but the
//     domain itself is not an indicator. github.com, raw.githubusercontent.com,
//     duckdns.org, etc. accumulate these without being malicious themselves.
//     Surfaced separately so callers don't conflate "domain is malware" with
//     "domain hosts user content, some of which is malware."
export function trimScryCheckDomain(j) {
  if (!j || typeof j !== 'object') return { listed: false, status: 'no_results' }
  const enrichment_count = Number(j.enrichment_count || 0)
  const url_hosted_count = Number(j.url_hosted_count || 0)
  const subdomain_hits = Number(j.subdomain_hits || 0)
  return {
    kind: 'domain',
    listed: enrichment_count > 0,
    enrichment_count,
    enrichment_promoted: Number(j.enrichment_promoted || 0),
    sources: Array.isArray(j.enrichment_sources) ? j.enrichment_sources : [],
    url_hosted_count,
    url_hosted_sources: Array.isArray(j.url_hosted_sources) ? j.url_hosted_sources : [],
    subdomain_hits,
    subdomain_sources: Array.isArray(j.subdomain_sources) ? j.subdomain_sources : [],
    threat_types: Array.isArray(j.threat_types) ? j.threat_types : [],
    tags: Array.isArray(j.tags) ? j.tags.slice(0, 20) : [],
    status: j.status || (
      enrichment_count > 0   ? 'listed' :
      subdomain_hits > 0     ? 'subdomain_only' :
      url_hosted_count > 0   ? 'url_hosting' :
                               'not_listed'
    ),
    first_seen_ms: j.first_seen_ms || null,
    last_seen_ms: j.last_seen_ms || null,
  }
}

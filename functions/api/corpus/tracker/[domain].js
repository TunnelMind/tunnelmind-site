// GET /api/corpus/tracker/:domain — surveillance tracker score for a host.
//
// Proxies the tunnelmind-data-api surface (data.tunnelmind.ai) that
// originally backed netprobe.tunnelmind.ai. Same corpus as the radar +
// the Sigil verification surfaces, exposed here so the right-hand
// inspector can show "is this domain a tracker, and who owns it?" in
// one click. Edge-cached 1 hour — tracker classifications change slow.

import { normalizeDomain, json, fetchWithTimeout } from '../_lib.js'

const UPSTREAM = 'https://data.tunnelmind.ai'

export async function onRequestGet(context) {
  const domain = normalizeDomain(context.params.domain)
  if (!domain) return json({ error: 'invalid_domain' }, 400)

  try {
    const r = await fetchWithTimeout(
      `${UPSTREAM}/v1/domains/${encodeURIComponent(domain)}`,
      { headers: { Accept: 'application/json' } },
    )
    if (r.status === 404) return json({ domain, known: false }, 200, 3600)
    if (!r.ok) return json({ error: 'tracker_unavailable', status: r.status }, 502)
    return json(trim(await r.json(), domain), 200, 3600)
  } catch {
    return json({ error: 'tracker_error' }, 502)
  }
}

export function trim(j, domain) {
  // Pull the fields the inspector actually renders. Pass through the
  // entity reference so the panel can deep-link to the entity walk.
  return {
    domain,
    known: true,
    score: numericOrNull(j.score ?? j.tracker_score),
    entity: j.entity || j.owner_entity || null,
    entity_slug: j.entity_slug || (j.entity && j.entity.slug) || null,
    categories: Array.isArray(j.categories) ? j.categories.slice(0, 10) : [],
    prevalence: numericOrNull(j.prevalence),
    first_seen: j.first_seen || null,
    last_seen: j.last_seen || null,
    cookies: Array.isArray(j.cookies) ? j.cookies.length : null,
    fingerprinting: typeof j.fingerprinting === 'boolean' ? j.fingerprinting : null,
  }
}

function numericOrNull(v) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

// GET /api/corpus/intel/:type/:domain — multiplexer for the six
// domain-intel tabs that share data.tunnelmind.ai/v1/intel/* as their
// upstream. One file because the proxy contract is identical for every
// tab; only the upstream path segment changes.
//
// Type allowlist is enforced server-side — `:type` reaches `fetch()`
// untrusted, so anything outside this list is rejected as 400 before a
// subrequest fires. Cached 5 min at the edge; the intel surface
// re-probes the live web, but page-load patterns are bursty enough that
// 5 min smooths the load on data.tunnelmind.ai significantly.

import { normalizeDomain, json, fetchWithTimeout } from '../../_lib.js'

const TYPES = new Set(['http', 'stack', 'robots', 'agent', 'inject', 'optout'])
const UPSTREAM = 'https://data.tunnelmind.ai'

export async function onRequestGet(context) {
  const type = String(context.params.type || '').toLowerCase()
  if (!TYPES.has(type)) return json({ error: 'invalid_intel_type' }, 400)

  const domain = normalizeDomain(context.params.domain)
  if (!domain) return json({ error: 'invalid_domain' }, 400)

  try {
    const r = await fetchWithTimeout(
      `${UPSTREAM}/v1/intel/${type}?domain=${encodeURIComponent(domain)}`,
      { headers: { Accept: 'application/json' } },
    )
    if (!r.ok) return json({ error: 'intel_unavailable', type, status: r.status }, 502)
    const env = await r.json()
    // tunnelmind-data-api wraps every response in {ok, data, meta}; the
    // inspector only ever wants `data`. Unwrap once at the edge so
    // consumers (radar + future REST clients) get the clean payload.
    if (!env || env.ok === false || !env.data) {
      return json({ error: 'intel_error', detail: (env && env.error) || 'no_data' }, 502)
    }
    return json(env.data, 200, 300)
  } catch (e) {
    return json({ error: 'intel_error', detail: String((e && e.message) || e).slice(0, 200) }, 502)
  }
}

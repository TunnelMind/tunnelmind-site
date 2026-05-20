// GET /api/corpus/subdomains/:domain — discovered subdomains via crt.sh.
//
// Same upstream as the Certs tab but a different query: `%.example.com`
// returns every cert ever issued under that suffix. We pull the SAN
// names out of those certs and unique them — the standard CT-log
// recipe for passive subdomain enumeration. No active scanning, no
// brute-forcing, no DNS amplification.
//
// Wildcard queries are slower than name queries; budget 10s and cache
// the result for an hour at the edge.

import { normalizeDomain, json, fetchWithTimeout } from '../_lib.js'

export async function onRequestGet(context) {
  const domain = normalizeDomain(context.params.domain)
  if (!domain) return json({ error: 'invalid_domain' }, 400)

  try {
    const r = await fetchWithTimeout(
      `https://crt.sh/?q=${encodeURIComponent('%.' + domain)}&output=json`,
      { headers: { Accept: 'application/json' } },
      10000,
    )
    if (!r.ok) return json({ error: 'crtsh_unavailable', status: r.status }, 502)
    const text = await r.text()
    let arr
    try { arr = JSON.parse(text) } catch { return json({ error: 'crtsh_bad_payload' }, 502) }
    if (!Array.isArray(arr)) return json({ error: 'crtsh_bad_payload' }, 502)
    return json(trim(arr, domain), 200, 3600)
  } catch (e) {
    return json({ error: 'subdomains_error', detail: String((e && e.message) || e).slice(0, 200) }, 502)
  }
}

export function trim(arr, domain) {
  const suffix = '.' + domain
  const seen = new Set()
  for (const row of arr) {
    const raw = row && row.name_value
    if (typeof raw !== 'string') continue
    for (const line of raw.split('\n')) {
      const name = line.trim().toLowerCase()
      // CT logs include both the apex and subdomains, plus wildcards
      // (`*.example.com`). Strip wildcards, keep only names that are
      // strictly subordinate to the queried apex.
      if (!name || name === domain) continue
      const bare = name.startsWith('*.') ? name.slice(2) : name
      if (!bare.endsWith(suffix)) continue
      seen.add(bare)
    }
  }
  const subdomains = [...seen].sort()
  return {
    domain,
    total: subdomains.length,
    shown: Math.min(subdomains.length, 200),
    subdomains: subdomains.slice(0, 200),
  }
}

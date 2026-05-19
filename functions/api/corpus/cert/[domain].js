// GET /api/corpus/cert/:domain — certificate transparency lookup.
//
// crt.sh aggregates the public CT logs every CA is required to publish
// to; the entries are signed promises that a CA issued a cert for this
// name. We trim to the most-recent 25 entries and ship just enough to
// render the inspector tab — issuer, dates, common name, SAN sample.
//
// crt.sh is community-run and occasionally slow; the per-tab timeout in
// _lib.js caps the wait, and the result is edge-cached for 1 hour.

import { normalizeDomain, json, fetchWithTimeout } from '../_lib.js'

export async function onRequestGet(context) {
  const domain = normalizeDomain(context.params.domain)
  if (!domain) return json({ error: 'invalid_domain' }, 400)

  try {
    const url = `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`
    const r = await fetchWithTimeout(url, {
      headers: { Accept: 'application/json' },
    }, 8000)
    if (!r.ok) return json({ error: 'crtsh_unavailable', status: r.status }, 502)
    const text = await r.text()
    // crt.sh occasionally returns an HTML error page with a 200; guard.
    let arr
    try { arr = JSON.parse(text) } catch { return json({ error: 'crtsh_bad_payload' }, 502) }
    if (!Array.isArray(arr)) return json({ error: 'crtsh_bad_payload' }, 502)
    return json(trim(arr, domain), 200, 3600)
  } catch {
    return json({ error: 'crtsh_error' }, 502)
  }
}

export function trim(arr, domain) {
  // De-duplicate by serial (crt.sh emits one row per CT log entry, so
  // the same cert frequently shows up 3-6 times) and take the most-
  // recent 25 by not_before. Each entry carries a `name_value` field
  // that is a newline-separated list of SANs; cap to first 5 per cert.
  const seen = new Set()
  const dedup = []
  for (const e of arr) {
    const k = e.serial_number || e.id
    if (seen.has(k)) continue
    seen.add(k)
    dedup.push(e)
  }
  dedup.sort((a, b) => (b.not_before || '').localeCompare(a.not_before || ''))
  const top = dedup.slice(0, 25)
  return {
    domain,
    total: dedup.length,
    shown: top.length,
    certs: top.map((e) => ({
      id: e.id,
      issuer: shortIssuer(e.issuer_name || ''),
      common_name: e.common_name || null,
      sans: sansOf(e.name_value),
      not_before: e.not_before || null,
      not_after: e.not_after || null,
      serial: e.serial_number || null,
    })),
  }
}

// crt.sh issuer field is a full DN; the inspector only needs the O= part.
function shortIssuer(dn) {
  const m = dn.match(/(?:^|,\s*)O="?([^",]+)"?/i)
  return m ? m[1].trim() : dn
}

function sansOf(raw) {
  if (typeof raw !== 'string') return []
  return raw.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 5)
}

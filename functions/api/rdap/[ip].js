// GET /api/rdap/:ip — WHOIS / RDAP click-through for the radar inspector.
//
// Proxies rdap.org, which bootstraps to whichever Regional Internet
// Registry is responsible for the address (ARIN, RIPE, APNIC, LACNIC,
// AFRINIC). RDAP is the registries' own structured replacement for
// legacy WHOIS — no key, no big-tech intermediary.
//
// The RDAP payload is large and deeply nested; it is trimmed server-side
// to the handful of fields the inspector renders, and cached a day.

// Follows redirects MANUALLY — see /api/corpus/_lib.js fetchFollowRedirects
// for the rationale (Workers' auto-redirect handler started returning hard
// CF-edge 502s instead of catchable rejections somewhere around 2025-Q4).
import { fetchFollowRedirects } from '../corpus/_lib.js'

export async function onRequestGet(context) {
  const ip = encodeURIComponent(context.params.ip)
  try {
    const resp = await fetchFollowRedirects(`https://rdap.org/ip/${ip}`, {
      headers: { Accept: 'application/rdap+json' },
    })
    if (!resp.ok) return json({ error: 'rdap_unavailable', status: resp.status }, 502)
    return json(trim(await resp.json()), 200, 86400)
  } catch (e) {
    return json({ error: 'rdap_error', detail: String((e && e.message) || e).slice(0, 200) }, 502)
  }
}

// Pull the readable vCard fields (formatted name, email) out of the
// jCard array RDAP entities carry.
// Exported for unit tests (test/rdap.test.js); Pages ignores non-handler
// exports.
export function vcard(arr) {
  const out = {}
  if (!Array.isArray(arr) || arr[0] !== 'vcard') return out
  for (const item of arr[1] || []) {
    if (item[0] === 'fn') out.fn = item[3]
    if (item[0] === 'email') out.email = item[3]
  }
  return out
}

export function trim(r) {
  const out = {
    handle: r.handle || null,
    name: r.name || null,
    type: r.type || null,
    country: r.country || null,
    range:
      r.startAddress && r.endAddress ? `${r.startAddress} – ${r.endAddress}` : null,
    registry: r.port43 || null,
    org: null,
    abuse: null,
    registered: null,
    updated: null,
  }
  for (const ev of r.events || []) {
    if (ev.eventAction === 'registration') out.registered = ev.eventDate
    if (ev.eventAction === 'last changed') out.updated = ev.eventDate
  }
  for (const ent of r.entities || []) {
    const roles = ent.roles || []
    const v = vcard(ent.vcardArray)
    if (!out.org && (roles.includes('registrant') || roles.includes('administrative'))) {
      out.org = v.fn || ent.handle || null
    }
    if (!out.abuse && roles.includes('abuse')) out.abuse = v.email || null
    // Abuse contacts are frequently nested one level down.
    for (const sub of ent.entities || []) {
      if (!out.abuse && (sub.roles || []).includes('abuse')) {
        out.abuse = vcard(sub.vcardArray).email || null
      }
    }
  }
  return out
}

function json(obj, status = 200, ttl = 0) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': ttl ? `public, max-age=${ttl}` : 'no-store',
    },
  })
}

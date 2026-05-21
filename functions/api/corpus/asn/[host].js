// GET /api/corpus/asn/:host — ASN / BGP-prefix / abuse contact.
//
// Single contract for IP and domain inputs:
//   - IP   → one /v1/check call against our own scry-server (iptoasn)
//   - host → resolve A/AAAA via DoH, then bgpview each (max 4) in parallel
//
// Returns the same {host, kind, addresses:[...]} shape regardless of
// input. Each address row carries asn, org, prefix, country, rir, and
// abuse contacts so the inspector can render either form uniformly.
//
// We used to call bgpview.io for IP inputs too, but it's community-run
// and frequently dies on cold workers — the "first lookup fails, retry
// works" UX traced back to that. /v1/check serves the same ASN/country/
// org from our own iptoasn snapshot with no upstream flakiness.
// (Domains still fan-out through bgpview until we add a /v1/asn/{ip}
// surface; that's the next migration.)

import { normalizeHost, normalizeIp, normalizeDomain, json, fetchWithTimeout } from '../_lib.js'

const MAX_ADDRESSES = 4
const SCRY_BASE = 'https://api.tunnelmind.ai'

export async function onRequestGet(context) {
  const host = normalizeHost(context.params.host)
  if (!host) return json({ error: 'invalid_host' }, 400)

  try {
    if (normalizeIp(host)) {
      const addr = await scryCheck(host)
      return json({ host, kind: 'ip', addresses: [addr] }, 200, 3600)
    }

    const ips = await resolveAddrs(host)
    if (!ips.length) {
      return json({ host, kind: 'domain', addresses: [], note: 'Domain did not resolve to any A/AAAA records.' }, 200, 300)
    }

    const settled = await Promise.allSettled(ips.slice(0, MAX_ADDRESSES).map(bgpview))
    const addresses = settled.map((s, i) => s.status === 'fulfilled'
      ? s.value
      : { ip: ips[i], error: 'lookup_failed' })

    return json({ host, kind: 'domain', addresses }, 200, 3600)
  } catch (e) {
    return json({ error: 'asn_error', detail: String((e && e.message) || e).slice(0, 200) }, 502)
  }
}

// Map /v1/check's shape into the address row the inspector renders.
// Prefix / RIR / abuse don't exist in our iptoasn snapshot — the renderer
// already skips null fields, so the row collapses gracefully.
async function scryCheck(ip) {
  const r = await fetchWithTimeout(
    `${SCRY_BASE}/v1/check/${encodeURIComponent(ip)}`,
    { headers: { Accept: 'application/json' } },
    4000,
  )
  if (!r.ok) return { ip, error: 'lookup_failed' }
  const j = await r.json()
  return {
    ip,
    asn: j.asn || null,
    org: j.org || null,
    country: j.country || null,
    prefix: null,
    rir: null,
    abuse: [],
  }
}

async function resolveAddrs(domain) {
  if (!normalizeDomain(domain)) return []
  const [a, aaaa] = await Promise.allSettled([
    doh(domain, 'A'),
    doh(domain, 'AAAA'),
  ])
  const out = new Set()
  const collect = (s) => {
    if (s.status !== 'fulfilled' || !s.value || !Array.isArray(s.value.Answer)) return
    for (const ans of s.value.Answer) {
      if (typeof ans.data === 'string') out.add(ans.data.trim())
    }
  }
  collect(a); collect(aaaa)
  return [...out]
}

async function doh(name, type) {
  const r = await fetchWithTimeout(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    { headers: { Accept: 'application/dns-json' } },
    4000,
  )
  if (!r.ok) return null
  return r.json()
}

async function bgpview(ip) {
  const r = await fetchWithTimeout(
    `https://api.bgpview.io/ip/${ip}`,
    { headers: { Accept: 'application/json' } },
    4000,
  )
  if (!r.ok) throw new Error(`bgpview_${r.status}`)
  const j = await r.json()
  return trimBgpview(ip, j && j.data)
}

export function trimBgpview(ip, d) {
  if (!d) return { ip, asn: null, org: null, prefix: null, country: null, rir: null, abuse: [] }
  const prefixes = Array.isArray(d.prefixes) ? d.prefixes : []
  // Pick the most-specific prefix (longest mask length) — that's the
  // one actually announcing this IP.
  const ranked = prefixes
    .filter((p) => p && p.prefix)
    .map((p) => ({ p, len: prefixLen(p.prefix) }))
    .sort((a, b) => b.len - a.len)
  const top = ranked[0] && ranked[0].p
  const rir = d.rir_allocation || null
  return {
    ip,
    asn: top && top.asn && top.asn.asn != null ? top.asn.asn : null,
    org: (top && top.asn && (top.asn.name || top.asn.description)) || (rir && rir.rir) || null,
    prefix: top ? top.prefix : (rir ? rir.prefix : null),
    country: (top && top.asn && top.asn.country_code) || (rir && rir.country_code) || null,
    rir: rir && rir.rir ? rir.rir : (top && top.asn && top.asn.rir_name) || null,
    abuse: Array.isArray(d.abuse_contacts)
      ? d.abuse_contacts.map((c) => c && c.email).filter(Boolean).slice(0, 5)
      : [],
  }
}

function prefixLen(p) {
  const m = String(p).match(/\/(\d+)$/)
  return m ? Number(m[1]) : 0
}

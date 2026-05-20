// GET /api/corpus/asn/:host — ASN / BGP-prefix / abuse contact.
//
// Single contract for IP and domain inputs:
//   - IP   → one direct bgpview lookup
//   - host → resolve A/AAAA via DoH, then bgpview each (max 4) in parallel
//
// Returns the same {host, kind, addresses:[...]} shape regardless of
// input. Each address row carries asn, org, prefix, country, rir, and
// abuse contacts so the inspector can render either form uniformly.
//
// bgpview.io is community-run; budget per-call 4s, cap the per-host
// fan-out, and cache 1 hour at the edge — ASN allocations change rarely
// and viewer traffic is bursty.

import { normalizeHost, normalizeIp, normalizeDomain, json, fetchWithTimeout } from '../_lib.js'

const MAX_ADDRESSES = 4

export async function onRequestGet(context) {
  const host = normalizeHost(context.params.host)
  if (!host) return json({ error: 'invalid_host' }, 400)

  try {
    let ips
    let kind
    if (normalizeIp(host)) {
      ips = [host]
      kind = 'ip'
    } else {
      kind = 'domain'
      ips = await resolveAddrs(host)
      if (!ips.length) {
        return json({ host, kind, addresses: [], note: 'Domain did not resolve to any A/AAAA records.' }, 200, 300)
      }
    }

    const settled = await Promise.allSettled(ips.slice(0, MAX_ADDRESSES).map(bgpview))
    const addresses = settled.map((s, i) => s.status === 'fulfilled'
      ? s.value
      : { ip: ips[i], error: 'lookup_failed' })

    return json({ host, kind, addresses }, 200, 3600)
  } catch (e) {
    return json({ error: 'asn_error', detail: String((e && e.message) || e).slice(0, 200) }, 502)
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

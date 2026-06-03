// GET /api/corpus/asn/:host — ASN / BGP routing / abuse contact.
//
// Real BGP data via RIPEstat (RIPE NCC, the non-profit RIR — see
// feedback_no_big_tech). bgpview.io was community-run and routinely died
// on cold workers ("first lookup fails, retry works"); RIPEstat is the
// authoritative routing-registry source and stays up.
//
//   IP   → scry-server /v1/check (our iptoasn: asn/org/country, instant)
//          merged with RIPEstat (prefix, RIR, abuse, announced)
//   host → resolve A/AAAA via DoH, then RIPEstat each (max 4) in parallel
//
// Same {host, kind, addresses:[...]} shape regardless of input. Each row:
// { ip, asn, org, prefix, country, rir, abuse:[], announced }.

import { normalizeHost, normalizeIp, normalizeDomain, json, fetchWithTimeout } from '../_lib.js'

const MAX_ADDRESSES = 4
const SCRY_BASE = 'https://api.tunnelmind.ai'
const RIPE_BASE = 'https://stat.ripe.net/data'

export async function onRequestGet(context) {
  const host = normalizeHost(context.params.host)
  if (!host) return json({ error: 'invalid_host' }, 400)

  try {
    if (normalizeIp(host)) {
      // Our own iptoasn view + RIPEstat routing, in parallel; either may
      // fail without sinking the row (mergeRows tolerates nulls).
      const [scry, ripe] = await Promise.all([
        scryCheck(host).catch(() => null),
        ripeLookup(host).catch(() => null),
      ])
      return json({ host, kind: 'ip', addresses: [mergeRows(host, scry, ripe)] }, 200, 3600)
    }

    const ips = await resolveAddrs(host)
    if (!ips.length) {
      return json({ host, kind: 'domain', addresses: [], note: 'Domain did not resolve to any A/AAAA records.' }, 200, 300)
    }

    const settled = await Promise.allSettled(ips.slice(0, MAX_ADDRESSES).map(ripeLookup))
    const addresses = settled.map((s, i) => s.status === 'fulfilled'
      ? s.value
      : { ip: ips[i], error: 'lookup_failed' })

    return json({ host, kind: 'domain', addresses }, 200, 3600)
  } catch (e) {
    return json({ error: 'asn_error', detail: String((e && e.message) || e).slice(0, 200) }, 502)
  }
}

// Merge our own iptoasn view (asn/org/country — authoritative + instant)
// with RIPEstat's routing data (prefix/rir/abuse/announced). Prefer scry
// for asn/org/country so the tab matches the inline node enrichment; fall
// back to RIPEstat's AS holder when we have no org of our own.
export function mergeRows(ip, scry, ripe) {
  const r = ripe || {}
  const s = scry || {}
  return {
    ip,
    asn: s.asn || r.asn || null,
    org: s.org || r.org || null,
    country: s.country || r.country || null,
    prefix: r.prefix || null,
    rir: r.rir || null,
    abuse: r.abuse || [],
    announced: r.announced ?? null,
  }
}

// Map /v1/check's shape into the asn/org/country we trust most.
async function scryCheck(ip) {
  const r = await fetchWithTimeout(
    `${SCRY_BASE}/v1/check/${encodeURIComponent(ip)}`,
    { headers: { Accept: 'application/json' } },
    4000,
  )
  if (!r.ok) return null
  const j = await r.json()
  return { asn: j.asn || null, org: j.org || null, country: j.country || null }
}

// One IP → its routing facts, assembled from RIPEstat data calls. The
// three independent calls run in parallel (allSettled, so a slow
// abuse-finder never sinks the prefix); as-overview needs the ASN, so
// it's a dependent second hop taken only when one is known.
async function ripeLookup(ip) {
  if (!normalizeIp(ip)) return { ip, error: 'lookup_failed' }
  const [netInfo, abuse, rir] = await Promise.allSettled([
    ripe('network-info', ip),
    ripe('abuse-contact-finder', ip),
    ripe('rir', ip),
  ])
  const ni = val(netInfo)
  const asn = ni && Array.isArray(ni.asns) && ni.asns.length ? ni.asns[0] : null
  const over = asn ? await ripe('as-overview', `AS${asn}`).catch(() => null) : null
  return trimRipe(ip, { ni, abuse: val(abuse), rir: val(rir), over })
}

function val(settled) {
  return settled && settled.status === 'fulfilled' ? settled.value : null
}

// Pure shaping of the RIPEstat payloads into one address row. Kept pure +
// exported so the field mapping is unit-testable without the network.
export function trimRipe(ip, parts = {}) {
  const { ni, abuse, rir, over } = parts
  const asns = ni && Array.isArray(ni.asns) ? ni.asns : []
  const rirs = rir && Array.isArray(rir.rirs) ? rir.rirs : []
  return {
    ip,
    asn: asns.length ? String(asns[0]) : null,
    org: (over && over.holder) || null,
    prefix: (ni && ni.prefix) || null,
    country: null,            // RIPEstat network-info carries no geo; RDAP tab covers it
    rir: rirs.length ? rirs[0].rir : null,
    abuse: abuse && Array.isArray(abuse.abuse_contacts) ? abuse.abuse_contacts.slice(0, 5) : [],
    announced: over ? !!over.announced : null,
  }
}

async function ripe(call, resource) {
  // sourceapp is RIPEstat's politeness convention for identifying heavier
  // automated callers; it does not gate access.
  const r = await fetchWithTimeout(
    `${RIPE_BASE}/${call}/data.json?resource=${encodeURIComponent(resource)}&sourceapp=tunnelmind`,
    { headers: { Accept: 'application/json' } },
    5000,
  )
  if (!r.ok) throw new Error(`ripe_${call}_${r.status}`)
  const j = await r.json()
  return j && j.data
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

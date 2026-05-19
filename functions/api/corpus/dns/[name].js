// GET /api/corpus/dns/:name — A/AAAA/MX/NS/TXT records via DoH.
//
// Bundles five record types in one request so the inspector's DNS tab
// renders in one round-trip; degrades per-type so a flaky type does not
// blank the whole tab. Upstream is Cloudflare's DoH endpoint — same
// platform as the rest of our edge, no big-tech intermediary.
//
// Cached at the edge for 5 minutes — DNS TTLs vary, but the radar reads
// the same handful of names at viewer scale and we'd rather pay the DoH
// quota once than per visitor.

import { normalizeDomain, json, fetchWithTimeout } from '../_lib.js'

const TYPES = ['A', 'AAAA', 'MX', 'NS', 'TXT']

export async function onRequestGet(context) {
  const name = normalizeDomain(context.params.name)
  if (!name) return json({ error: 'invalid_name' }, 400)

  // Parallel; per-type failures keep the rest of the payload.
  const settled = await Promise.allSettled(
    TYPES.map((t) => resolveOne(name, t)),
  )

  const out = { name, records: {} }
  TYPES.forEach((t, i) => {
    const s = settled[i]
    out.records[t] = s.status === 'fulfilled' ? s.value : { error: 'lookup_failed' }
  })
  return json(out, 200, 300)
}

async function resolveOne(name, type) {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`
  const r = await fetchWithTimeout(url, {
    headers: { Accept: 'application/dns-json' },
  })
  if (!r.ok) throw new Error(`doh_${r.status}`)
  const j = await r.json()
  return trim(j, type)
}

// DoH "Answer" entries vary in shape across types; reduce to a flat
// list of { value, ttl } that the inspector renders uniformly.
export function trim(j, type) {
  const answers = j && Array.isArray(j.Answer) ? j.Answer : []
  const out = { type, values: [] }
  for (const a of answers) {
    if (!a || typeof a.data !== 'string') continue
    out.values.push({
      value: type === 'MX' ? mxToString(a.data) : stripQuotes(a.data),
      ttl: typeof a.TTL === 'number' ? a.TTL : null,
    })
  }
  return out
}

function stripQuotes(s) {
  return s.replace(/^"|"$/g, '')
}

function mxToString(data) {
  // DoH returns MX as "priority host." — strip trailing dot, keep priority.
  const m = String(data).match(/^(\d+)\s+(\S+?)\.?$/)
  return m ? `${m[1]} ${m[2]}` : data
}

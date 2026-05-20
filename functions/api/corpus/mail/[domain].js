// GET /api/corpus/mail/:domain — SPF / DMARC / DKIM / MX summary.
//
// All four checks are DNS TXT lookups (MX is a record-type lookup) so
// this is just DoH fan-out + a tiny bit of record-string parsing. Same
// upstream (cloudflare-dns.com DoH) as /api/corpus/dns; kept separate
// from that endpoint because the inspector renders the parsed mail
// posture, not the raw records.
//
// DKIM is interesting: there's no way to enumerate selectors without
// asking the registrar, so we probe a handful of selectors that 95% of
// real mail providers use (default, google, k1-k3, selector1-2,
// mandrill, mailchimp, sendgrid). If any return a record, DKIM is
// "present" — the exact selector is reported.
//
// Edge-cached 10 min — DNS TTLs vary, but mail records change slowly
// and the surface is viewer-scale.

import { normalizeDomain, json, fetchWithTimeout } from '../_lib.js'

const DKIM_SELECTORS = [
  'default', 'google', 'k1', 'k2', 'k3',
  'selector1', 'selector2', 'mandrill', 'mailchimp', 'sendgrid',
]

export async function onRequestGet(context) {
  const domain = normalizeDomain(context.params.domain)
  if (!domain) return json({ error: 'invalid_domain' }, 400)

  try {
    const settled = await Promise.allSettled([
      doh(domain, 'MX'),
      doh(domain, 'TXT'),
      doh(`_dmarc.${domain}`, 'TXT'),
      ...DKIM_SELECTORS.map((s) => doh(`${s}._domainkey.${domain}`, 'TXT')),
    ])
    const [mxR, txtR, dmarcR, ...dkimR] = settled

    return json({
      domain,
      mx: parseMx(valueOf(mxR)),
      spf: parseSpf(valueOf(txtR)),
      dmarc: parseDmarc(valueOf(dmarcR)),
      dkim: parseDkim(DKIM_SELECTORS, dkimR.map(valueOf)),
    }, 200, 600)
  } catch (e) {
    return json({ error: 'mail_error', detail: String((e && e.message) || e).slice(0, 200) }, 502)
  }
}

async function doh(name, type) {
  const r = await fetchWithTimeout(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    { headers: { Accept: 'application/dns-json' } },
  )
  if (!r.ok) return null
  return r.json()
}

function valueOf(s) {
  return s && s.status === 'fulfilled' ? s.value : null
}

export function parseMx(j) {
  const ans = j && Array.isArray(j.Answer) ? j.Answer : []
  return ans.map((a) => {
    const m = String(a.data || '').match(/^(\d+)\s+(\S+?)\.?$/)
    if (!m) return null
    return { preference: Number(m[1]), host: m[2] }
  }).filter(Boolean)
}

export function parseSpf(j) {
  const ans = j && Array.isArray(j.Answer) ? j.Answer : []
  // SPF lives in regular TXT; the record starts with "v=spf1". DoH
  // returns concatenated TXT chunks wrapped in quotes — strip them.
  const rec = ans.map((a) => stripQuotes(String(a.data || ''))).find((s) => s.startsWith('v=spf1'))
  if (!rec) return { present: false, policy: null, record: null }
  let policy = 'neutral'
  if (rec.includes('-all')) policy = 'hard-fail'
  else if (rec.includes('~all')) policy = 'soft-fail'
  else if (rec.includes('?all')) policy = 'neutral'
  else if (rec.includes('+all')) policy = 'pass-all'
  return { present: true, policy, record: rec }
}

export function parseDmarc(j) {
  const ans = j && Array.isArray(j.Answer) ? j.Answer : []
  const rec = ans.map((a) => stripQuotes(String(a.data || ''))).find((s) => s.includes('v=DMARC1'))
  if (!rec) return { present: false, policy: null, record: null }
  const p = (rec.match(/p\s*=\s*(\w+)/i) || [])[1] || null
  return { present: true, policy: p ? p.toLowerCase() : null, record: rec }
}

export function parseDkim(selectors, results) {
  const found = []
  results.forEach((j, i) => {
    if (!j || !Array.isArray(j.Answer)) return
    const hit = j.Answer.find((a) => /v=DKIM1/i.test(String(a.data || '')))
    if (hit) found.push(selectors[i])
  })
  return { present: found.length > 0, selectors_found: found }
}

function stripQuotes(s) { return s.replace(/^"|"$/g, '').replace(/"\s*"/g, '') }

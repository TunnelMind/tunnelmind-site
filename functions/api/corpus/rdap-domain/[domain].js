// GET /api/corpus/rdap-domain/:domain — registry record for a domain.
//
// Sibling of /api/rdap/:ip; that one calls rdap.org/ip and reads back
// the netblock record, this one calls rdap.org/domain and reads back
// the registration. Same proxy pattern: bootstrap to the responsible
// registry, trim the deeply-nested payload to the fields the inspector
// renders, cache 1 day at the edge.

import { normalizeDomain, json, fetchFollowRedirects } from '../_lib.js'

export async function onRequestGet(context) {
  const domain = normalizeDomain(context.params.domain)
  if (!domain) return json({ error: 'invalid_domain' }, 400)
  try {
    // Manual redirect chain — rdap.org always 302s to the responsible
    // RIR endpoint. See _lib.js fetchFollowRedirects() for why we can
    // no longer let the Workers runtime auto-follow.
    const resp = await fetchFollowRedirects(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      { headers: { Accept: 'application/rdap+json' } },
    )
    if (!resp.ok) return json({ error: 'rdap_unavailable', status: resp.status }, 502)
    return json(trim(await resp.json(), domain), 200, 86400)
  } catch (e) {
    return json({ error: 'rdap_error', detail: String((e && e.message) || e).slice(0, 200) }, 502)
  }
}

// Exported for tests; Pages ignores non-handler exports.
export function vcard(arr) {
  const out = {}
  if (!Array.isArray(arr) || arr[0] !== 'vcard') return out
  for (const item of arr[1] || []) {
    if (item[0] === 'fn') out.fn = item[3]
    if (item[0] === 'email') out.email = item[3]
    if (item[0] === 'org') out.org = Array.isArray(item[3]) ? item[3].join(' ') : item[3]
  }
  return out
}

export function trim(r, domain) {
  const out = {
    domain,
    ldhName: r.ldhName || domain,
    handle: r.handle || null,
    status: Array.isArray(r.status) ? r.status : [],
    registrar: null,
    registrar_iana: null,
    registrant_org: null,
    abuse: null,
    nameservers: [],
    registered: null,
    updated: null,
    expires: null,
    secure_dns: r.secureDNS && r.secureDNS.delegationSigned === true,
  }
  for (const ev of r.events || []) {
    if (ev.eventAction === 'registration') out.registered = ev.eventDate
    if (ev.eventAction === 'last changed') out.updated = ev.eventDate
    if (ev.eventAction === 'expiration') out.expires = ev.eventDate
  }
  for (const ns of r.nameservers || []) {
    if (ns.ldhName) out.nameservers.push(String(ns.ldhName).toLowerCase())
  }
  for (const ent of r.entities || []) {
    const roles = ent.roles || []
    const v = vcard(ent.vcardArray)
    if (roles.includes('registrar')) {
      out.registrar = v.fn || v.org || ent.handle || null
      for (const pid of ent.publicIds || []) {
        if (pid.type === 'IANA Registrar ID') out.registrar_iana = pid.identifier
      }
    }
    if (!out.registrant_org && roles.includes('registrant')) {
      out.registrant_org = v.org || v.fn || null
    }
    if (!out.abuse && roles.includes('abuse')) out.abuse = v.email || null
    for (const sub of ent.entities || []) {
      const subRoles = sub.roles || []
      if (!out.abuse && subRoles.includes('abuse')) {
        out.abuse = vcard(sub.vcardArray).email || null
      }
    }
  }
  return out
}

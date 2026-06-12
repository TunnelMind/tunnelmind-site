// Shared helpers for /api/corpus/* — the inspector's domain-intelligence
// surface. Five tabs (RDAP, DNS, certs, tracker score, reputation) each
// proxy a different upstream so the panel can fail-and-show-the-rest
// without the whole inspector going dark.
//
// All inputs are validated before they touch fetch — these endpoints sit
// on the public edge and could otherwise be turned into an SSRF relay.

// Allow lowercased domain labels with hyphens (no leading/trailing) and
// dotted segments. Accept up to 253 chars per RFC 1035. We do NOT accept
// underscores, schemes, paths, or ports — every upstream rejects those
// anyway, and rejecting early gives a clean 400 instead of a 502.
import { ipVersion, canonicalizeIp } from './_ip.js'

const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/

export function normalizeDomain(raw) {
  if (typeof raw !== 'string') return null
  const s = raw.trim().toLowerCase().replace(/\.$/, '')
  return DOMAIN_RE.test(s) ? s : null
}

// IPv4 returned as-is; IPv6 validated structurally (rejects `:::`, accepts
// v4-mapped) and returned in RFC 5952 canonical form. rdap/[ip].js then passes
// the colons through raw (encodeURIComponent would break rdap.org).
export function normalizeIp(raw) {
  if (typeof raw !== 'string') return null
  const v = ipVersion(raw)
  if (!v) return null
  return v === 6 ? canonicalizeIp(raw) : raw.trim().toLowerCase()
}

export function normalizeHost(raw) {
  return normalizeDomain(raw) || normalizeIp(raw)
}

export function json(obj, status = 200, ttl = 0) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': ttl ? `public, max-age=${ttl}` : 'no-store',
    },
  })
}

// Wrap fetch with a deadline so a flaky upstream cannot keep a viewer's
// tab waiting on a spinner. The radar should never need more than a few
// seconds per tab; 6s is plenty for the slowest of these (crt.sh).
export async function fetchWithTimeout(url, opts = {}, ms = 6000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    return await fetch(url, { ...opts, signal: ctl.signal })
  } finally {
    clearTimeout(t)
  }
}

// Like fetchWithTimeout but follows up to N redirects MANUALLY. The
// Workers runtime auto-followed redirects until ~2025-Q4 when something
// in the redirect handler stopped surfacing errors as catchable rejects
// — instead a redirect chain that failed somewhere produced a hard
// CF-edge 502 that bypassed user try/catch entirely. rdap.org is a
// pure redirector (every domain RDAP query 302s to the responsible
// RIR's endpoint), so /api/rdap/* and /api/corpus/rdap-domain/* both
// hit this. Following them ourselves keeps the failure inside the
// caller's try/catch.
export async function fetchFollowRedirects(url, opts = {}, totalMs = 8000, maxRedirects = 5) {
  // Some upstreams (rdap.org, several smaller registry endpoints) silently
  // reject requests without a User-Agent that looks like a real client —
  // the request hard-errors at the CF edge before our catch sees it. Send
  // a polite identifying UA unless the caller set one explicitly.
  const headers = new Headers(opts.headers || {})
  if (!headers.has('user-agent')) {
    headers.set('user-agent', 'TunnelMindCorpus/1.0 (+https://tunnelmind.ai)')
  }
  // Single deadline across the whole redirect chain so a slow per-hop
  // cannot stack into a 30s wall-clock. CF Pages Functions get killed
  // hard (un-catchable 502) somewhere past ~10s of pending fetch; stay
  // well under that even with five hops.
  const deadline = Date.now() + totalMs
  let current = url
  for (let i = 0; i <= maxRedirects; i++) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw new Error('upstream_timeout')
    const r = await fetchWithTimeout(current, { ...opts, headers, redirect: 'manual' }, remaining)
    if (r.status >= 300 && r.status < 400 && r.headers.has('location')) {
      const loc = r.headers.get('location')
      current = new URL(loc, current).toString()
      continue
    }
    return r
  }
  throw new Error('too_many_redirects')
}

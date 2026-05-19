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
const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/

const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/

// Conservative IPv6 — only well-formed colon-hex; rejects zone IDs.
const IPV6_RE = /^[0-9a-f:]+$/

export function normalizeDomain(raw) {
  if (typeof raw !== 'string') return null
  const s = raw.trim().toLowerCase().replace(/\.$/, '')
  return DOMAIN_RE.test(s) ? s : null
}

export function normalizeIp(raw) {
  if (typeof raw !== 'string') return null
  const s = raw.trim().toLowerCase()
  if (IPV4_RE.test(s)) return s
  // Reject obvious garbage but accept colon-hex; rdap.org will validate.
  if (s.includes(':') && IPV6_RE.test(s) && s.length <= 39) return s
  return null
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

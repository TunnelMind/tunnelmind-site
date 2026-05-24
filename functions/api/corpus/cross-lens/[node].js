// GET /api/corpus/cross-lens/:node — A2 cross-lens (Scry × Sigil) verdict
// composed for the Corpus inspector's Reputation tab.
//
// Two upstreams in parallel:
//   - POST data.tunnelmind.ai/v1/verify/{node}  — fused verdict + per-lens blocks
//   - GET  api.tunnelmind.ai/v1/check{,-domain} — rich Scry trim
//
// v1 cross-lens coverage matrix means the data-api `scry` block is degraded
// for domains and the `sigil` block is degraded for IPs (see ADR
// 2026-05-A2). We layer the rich Scry trim alongside the fused verdict so
// the Reputation tab can render the full Scry detail (actor_class, URL-
// hosted vs subdomain hits, threat_types, etc.) without waiting on A2.v2
// to close the data-api-side coverage gap.
//
// 60s edge cache: cross-lens verdicts are slow-moving enough to amortize
// across the viewer stream without staleness mattering.

import { normalizeHost, normalizeIp, json, fetchWithTimeout } from '../_lib.js'
import { trimScryCheck, trimScryCheckDomain } from '../reputation/[host].js'

const DATA_BASE = 'https://data.tunnelmind.ai'
const SCRY_BASE = 'https://api.tunnelmind.ai'

export async function onRequestGet(context) {
  const node = normalizeHost(context.params.node)
  if (!node) return json({ error: 'invalid_node' }, 400)
  const isIp = !!normalizeIp(node)

  const [verify, scryRich] = await Promise.all([
    fetchVerify(node),
    isIp ? fetchScryIp(node) : fetchScryDomain(node),
  ])

  if (verify.__failed) return json(verify, 502)

  return json({
    node,
    kind: isIp ? 'ip' : 'domain',
    scry:        verify.data?.scry        ?? null,
    sigil:       verify.data?.sigil       ?? null,
    cross_lens:  verify.data?.cross_lens  ?? null,
    sigil_token:      verify.data?.sigil_token      ?? null,
    token_signed:     verify.data?.token_signed     ?? null,
    token_expires_at: verify.data?.token_expires_at ?? null,
    scry_rich:   scryRich,
  }, 200, 60)
}

async function fetchVerify(node) {
  const r = await fetchWithTimeout(
    `${DATA_BASE}/v1/verify/${encodeURIComponent(node)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // _lib's fetchWithTimeout doesn't auto-add UA; data.tunnelmind.ai
        // doesn't require one, but be polite + traceable.
        'User-Agent': 'TunnelMindCorpus/1.0 (+https://tunnelmind.ai)',
      },
      body: '{}',
    },
    6000,
  )
  if (!r.ok) return { __failed: true, error: 'verify_upstream', status: r.status }
  return r.json()
}

async function fetchScryIp(ip) {
  const r = await fetchWithTimeout(
    `${SCRY_BASE}/v1/check/${encodeURIComponent(ip)}`,
    { headers: { Accept: 'application/json' } },
    4000,
  )
  if (!r.ok) return { error: 'lookup_failed' }
  return trimScryCheck(await r.json())
}

async function fetchScryDomain(domain) {
  const r = await fetchWithTimeout(
    `${SCRY_BASE}/v1/check-domain/${encodeURIComponent(domain)}`,
    { headers: { Accept: 'application/json' } },
    4000,
  )
  if (!r.ok) return { error: 'lookup_failed' }
  return trimScryCheckDomain(await r.json())
}

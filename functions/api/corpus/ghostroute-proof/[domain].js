// GET /api/corpus/ghostroute-proof/:domain — GhostRoute CT-witness tab.
//
// The witnessability payoff made visible. Two reads off the data-api Worker,
// composed for one inspector tab:
//   - GET data.tunnelmind.ai/v1/ghostroute/proofs?domain=X  — per-cert inclusion
//     proofs for THIS host (each: "the exact cert it serves is proven in an
//     append-only CT log whose root TunnelMind signature-verified").
//   - GET data.tunnelmind.ai/v1/ghostroute/witness          — corpus-wide witness
//     health: how many trusted (non-Google) CT logs we independently witness, are
//     all their STH signatures verified, and were any append-only regressions
//     (rewind / fork / bad signature) detected.
//
// The proof read is host-specific; the witness read is the trust context that
// makes a single proof meaningful ("proven against N logs we hold our own roots
// for, 0 of which misbehaved"). Both are slow-moving — the corpus workers update
// proofs daily and heads twice a day — so a 5-minute edge cache is generous.

import { normalizeDomain, json, fetchWithTimeout } from '../_lib.js'

const DATA_BASE = 'https://data.tunnelmind.ai'

export async function onRequestGet(context) {
  const domain = normalizeDomain(context.params.domain)
  if (!domain) return json({ error: 'invalid_domain' }, 400)

  const [proofs, witness] = await Promise.all([
    fetchData(`/v1/ghostroute/proofs?domain=${encodeURIComponent(domain)}&limit=25`),
    fetchData('/v1/ghostroute/witness'),
  ])

  // The proofs read is the heart of this tab; if it hard-failed, surface a 502 so
  // the inspector's retry path kicks in. A witness miss only dims the context line.
  if (proofs.__failed) {
    return json({ error: 'ghostroute_unavailable', detail: proofs.detail }, 502)
  }

  return json({
    domain,
    proofs:  proofs.data  ?? null,
    witness: witness.__failed ? null : (witness.data ?? null),
  }, 200, 300)
}

async function fetchData(pathAndQuery) {
  try {
    const r = await fetchWithTimeout(`${DATA_BASE}${pathAndQuery}`, {
      headers: {
        Accept: 'application/json',
        // _lib's fetchWithTimeout doesn't auto-add a UA; data.tunnelmind.ai
        // doesn't require one, but be polite + traceable in its logs.
        'User-Agent': 'TunnelMindCorpus/1.0 (+https://tunnelmind.ai)',
      },
    }, 7000)
    if (!r.ok) return { __failed: true, detail: `upstream ${r.status}` }
    const body = await r.json()
    // data-api envelope is { ok, data, meta }; unwrap to the payload.
    if (body && body.ok === false) return { __failed: true, detail: body.error || 'upstream_error' }
    return { data: body && 'data' in body ? body.data : body }
  } catch (e) {
    return { __failed: true, detail: String((e && e.message) || e).slice(0, 200) }
  }
}

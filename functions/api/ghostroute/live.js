// GET /api/ghostroute/live — the GLASSBOX live routing-pulse feed.
//
// Read-only composition of three ALREADY-COLLECTED GhostRoute reads off the
// data-api Worker. The public page must never trigger collection (P-GLASSBOX
// §3); every read below is a fetch of stored corpus state, nothing more:
//   - GET /v1/ghostroute/proofs?limit=  — most-recent CT inclusion proofs, the
//     "verified glyph enters the lattice" event stream (RPC ghostroute_ct_proofs).
//   - GET /v1/ghostroute/witness         — corpus-wide witness health: how many
//     trusted CT logs we independently witness + whether any regressed. This is
//     the trust context that makes a single proof meaningful.
//   - GET /v1/ghostroute/alerts?limit=   — the CT equivocation feed. A healthy
//     corpus returns an EMPTY feed; any row is a serious trust event. An empty
//     list here is the honest healthy state, not a failure.
//
// All three are slow-moving (proofs daily, heads twice a day), so a 30s edge
// cache lets concurrent viewers share one upstream read. Honest connection
// state is the client's job (LIVE / reconnecting / idle); this endpoint just
// reports what it could and could not read so the client never fakes liveness.

import { json, fetchWithTimeout } from '../corpus/_lib.js'

const DATA_BASE = 'https://data.tunnelmind.ai'

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '12', 10) || 12, 1), 50)

  const [proofs, witness, alerts] = await Promise.all([
    fetchData(`/v1/ghostroute/proofs?limit=${limit}`),
    fetchData('/v1/ghostroute/witness'),
    fetchData(`/v1/ghostroute/alerts?limit=${limit}`),
  ])

  // The proofs read is the pulse. If it hard-failed, surface 503 so the client
  // shows an honest "reconnecting" rather than an empty lattice that lies.
  if (proofs.__failed) {
    return json({ error: 'ghostroute_unavailable', detail: proofs.detail }, 503)
  }

  return json({
    proofs:  proofs.data ?? null,
    // A witness/alerts miss only dims context — never fakes the pulse.
    witness: witness.__failed ? null : (witness.data ?? null),
    alerts:  alerts.__failed ? null : (alerts.data ?? null),
    as_of:   new Date().toISOString(),
  }, 200, 30)
}

async function fetchData(pathAndQuery) {
  try {
    const r = await fetchWithTimeout(`${DATA_BASE}${pathAndQuery}`, {
      headers: {
        Accept: 'application/json',
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

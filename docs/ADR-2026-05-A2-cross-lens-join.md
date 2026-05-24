# ADR — A2: Cross-lens join (Scry × Sigil)

| | |
|---|---|
| **Status**     | Accepted (PR #1 — route only; PR #2 MCP + PR #3 Radar UI pending) |
| **Date**       | 2026-05-24 |
| **Workstream** | A2 — gated behind D1 (now complete) |
| **Authors**    | Josh Moore + Claude |

## Context

D1 (the buy-side graph) shipped 2026-05-24. The Sigil supply graph now has 911K `exchange_seat`, 485K resolved owners, and 82K `resells` edges, plus the owner-resolver pipeline that keeps it growing. Scry independently has rich actor intelligence per IP (10-class actor model + Augur threat-intel overlap).

**Two physically separate databases** (Scry on Hetzner Postgres + Sigil on Supabase) — but conceptually one graph the open web sits on. No competitor owns both halves: GreyNoise / Spur own one side, DV / IAS / HUMAN / Pixalate own the other. The **fused verdict** is the moat.

Per the 2026-05-22 handoff Workstream A:
> *"This is the highest-value piece of this workstream."*

## Decision

Add **`POST /v1/verify/{node}`** on `data.tunnelmind.ai`. Single endpoint, one node key, three blocks in the response:

```json
{
  "node":  { "type": "domain", "value": "nytimes.com" },
  "scry":  { ...single-lens Scry view... },
  "sigil": { ...single-lens Sigil view... },
  "cross_lens": {
    "verdict": "pass",
    "trust_score": 0.78,
    "confidence": 0.94,
    "components": { ... },
    "signals": ["sigil.in_supply_graph=true", ...],
    "recommendations": []
  }
}
```

### Architectural choice — service-layer join, not DB merge

The Worker is the join layer. Both lenses keep their own storage; the cross-lens block is computed in Worker memory from parallel calls to:
- `https://api.tunnelmind.ai/v1/check/{ip}` (Scry)
- `https://{supabase}/rest/v1/...` (Sigil)

Alternatives rejected:
- **Cross-database FDW** — would tie release cadence of both backends together; introduces an availability dependency we don't want.
- **Periodic materialization** — staleness defeats the "real-time fused verdict" purpose.

### Fusion math

Weighted-mean over evaluated components, weights re-normalized when a component is unavailable:

| Component | Default weight | Source |
|---|---|---|
| `scry_hostility` (1 − actor_class hostility, 0..1) | 0.30 | Scry |
| `scry_augur_overlap` (1 − 0.25 × enrichment_promoted) | 0.15 | Scry |
| `sigil_supply_presence` (in_supply_graph → 1.0) | 0.10 | Sigil |
| `sigil_trust_score` (entity P36 trust) | 0.25 | Sigil (PR #1 reserves the slot; full integration in PR #2) |
| `co_observation_bonus` (both lenses flag → 0/1) | 0.20 | the join itself |

Per-request `weights` + `thresholds` overrides — same pattern as `sigil_verify_supply_path`.

### Per-node-type lens coverage (v1)

| node type | Scry | Sigil |
|---|---|---|
| IP        | full (existing `/v1/check`) | not_indexed (v2: reverse-DNS to known publisher/ssp/dsp domains) |
| domain    | not_evaluated v1 (v2: resolve to IPs and aggregate) | full (publisher / ssp / dsp / entity_domain bridge → entity) |
| ASN       | not_evaluated v1 (v2: aggregate from `/v1/recent`) | not_indexed |
| entity_slug | n/a | full (sell-side + buy-side presence, sources) |

### Failure semantics

- Each lens fails independently. Response stays 200; `cross_lens.confidence` drops to 0.55 when only one lens has data.
- Hard 503 ONLY when both lenses are unavailable.
- No lens is allowed to leak into the other's block — `scry` and `sigil` are presented separately for transparency per [[feedback_signal_class_separation]].

## Consequences

**Enables:**
- The moat narrative made queryable. A bad-actor IP that is *also* in the supply graph at scale is a higher-confidence fail than either signal alone — and no siloed incumbent can compute it.
- A single discoverable endpoint for agents (no need to learn Scry vs Sigil mental model).
- Future ATAP attestation wrap (planned for PR #2) — every cross-lens verdict can be turned into a signed replayable receipt.
- The next two roadmap items (`B3` MCP discoverability + `C3` observation-on-query) consume this endpoint instead of the lens-specific ones.

**Does not yet:**
- Domain → IP resolution for the Scry side (latency cost + cache design pending — A2.v2).
- Reverse-DNS the IP side to find supply-graph membership (A2.v2).
- Wrap in ATAP witness events (PR #2).
- Show up in the Radar UI (PR #3 — Reputation tab becomes cross-lens by default).
- Surface in MCP tools (PR #2).

## Risks

- **Latency**: two upstream calls per request. Mitigated by `Promise.all`; Scry p99 < 50ms, Sigil p99 < 80ms — combined p99 target < 250ms.
- **Asymmetric availability**: Scry on Hetzner can be down independently of Sigil on CF. Handled per "failure semantics" above.
- **Confidence calibration**: easy to overstate. Conservative bake: full confidence (0.94) requires both lenses; partial = 0.55.

## Related

- [project_a2_cross_lens_join](../../Obsidian%20Vault/Claude%20Memory/project_a2_cross_lens_join.md) — the plan
- [project_d1_buy_side_graph](../../Obsidian%20Vault/Claude%20Memory/project_d1_buy_side_graph.md) — the gate (now satisfied)
- [tunnelmind_question](../../Obsidian%20Vault/Claude%20Memory/tunnelmind_question.md) — A2 operationalizes all three pillars at once
- [feedback_signal_class_separation](../../Obsidian%20Vault/Claude%20Memory/feedback_signal_class_separation.md) — never merge heterogeneous signals into one opaque number
- `api/routes/cross-lens-verify.js` — the implementation
- `api/routes/sigil-supply-path.js` — the existing one-way Scry call this generalizes

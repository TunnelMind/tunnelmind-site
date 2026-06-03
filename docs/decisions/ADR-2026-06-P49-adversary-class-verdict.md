# ADR-2026-06-P49 — `adversary_class` on the cross-lens verdict

**Status:** Accepted · Shipped 2026-06-03
**Track:** Marti adversary-class ecosystem (P45–P49). Closes the track.
**Supersedes/extends:** [[ADR-2026-06-P46-attribution-cartel]], P47/P48 signal ADRs.

## Context

P45–P48 built the pieces: the curated `oai_adversary_class` table (P46, the
attribution cartel as `surveillance_bigtech`), and four read-only product signals
(P47 `tracker_density` + `dark_pool_risk`, P48 `halo_score` + `team_signal`). The
track's unifying goal is to name the scammer as one of three adversary classes,
each anchored by a different lens + north-star pillar:

- **human_hacker** — Scry lens (destination intelligence): a hostile actor in the
  attacker corpus (scanner / botnet / c2).
- **rogue_agent** — provenance/witnessability: attestation failure (invalid/absent
  OAI, revoked receipt, failed ATAP witness, preflight-deny).
- **surveillance_bigtech** — Tracker lens: the attribution cartel.

## Decision

**Extend the shipped `POST /v1/verify/{node}` (the A2 moat) rather than build a
parallel `/v1/check`.** The fused `cross_lens` block gains an `adversary_class`
object: `{ classification ∈ {human_hacker, rogue_agent, surveillance_bigtech,
clean, unknown}, confidence, anchored_by, pillar, curated, scry_signal,
corroboration, evidence, note }`.

### Classification rule (priority order, honest by construction)

1. **curated** — `adversary_curated_lookup(domain, entity_slug)` RPC (migration
   026) resolves the node against `oai_adversary_class`: a domain that equals or
   is a subdomain of a classified OAI's `record.domains[]`, or an entity_slug
   whose canonical alias `oai:{slug}` is in the OAI's `aliases[]`. Authoritative;
   confidence 0.9. Today this fires `surveillance_bigtech` for Google / Meta /
   Amazon / Microsoft. Class-agnostic — it is also the home for curated
   `rogue_agent` / `human_hacker` rows.
2. **human_hacker** — a live Scry observation that is hostile: a hostile
   `actor_class` (10-class model), Augur threat-intel agreement
   (`enrichment_promoted ≥ 1`), **or** a coarse `category: actor` corpus hit
   (the attacker corpus's own hostile label) unless a known-benign subclass
   (crawler / cdn / security-vendor / sinkhole) overrides it down.
3. **rogue_agent** — provenance / attestation failure. Curated today; the live
   OAI-revocation and failed-ATAP-witness hooks are wired to light up as that
   data lands. Never fabricated from absence.
4. **clean** — a node observed by some lens with no adversary signal.
5. **unknown** — no lens produced data.

A class is asserted **only** from a curated record or a live observation, never
inferred from missing data (the lowest-hallucination mandate). When the class is
`surveillance_bigtech`, the four P47/P48 signals are attached as `corroboration`
(in parallel) — so clean lookups pay no extra latency.

### Latency

The curated lookup runs **in parallel** with the two lens queries (it keys off
the node directly), so the always-on path adds no sequential round-trip. The
four-signal corroboration runs only on a `surveillance_bigtech` hit.

### Receipt evidence

The adversary classification rides every existing proof surface: it is in the
`cross_lens` block of the JSON verdict, pushed onto `cross_lens.signals`, and —
when an `ait` is supplied — written into the witness-tier `cross_lens:verified`
event payload (`adversary_class` / `adversary_confidence` / `adversary_anchored_by`)
so it is part of the replayable ATAP chain.

## Consequences

- The verdict now answers *who* is behind a node, not just *how trustworthy* it
  is — the track's payoff, on the moat endpoint, available on REST + both MCP
  rails (`cross_lens_verify` proxies the same response).
- `surveillance_bigtech` coverage is bounded by the seed OAIs' `record.domains[]`
  (DDG Tracker Radar). Common pixel domains absent from a seed record (e.g.
  `connect.facebook.net`) miss honestly — closing that is a data-enrichment task,
  not a logic change.
- IP nodes are not curated-classified (curation is domain/entity-anchored), so a
  cartel IP (e.g. `8.8.8.8`) reads `unknown` unless Scry has observed it. Honest.

## Files

- `tunnelmind-site/supabase/migrations/026_p49_adversary_curated_lookup.sql`
- `tunnelmind-data-api/api/routes/cross-lens-verify.js` — `classifyAdversary`,
  `curatedAdversaryLookup`, wired into `verifyCrossLens`; `openapi.yaml` response
  schema. Deployed worker version `bf0684e1`.

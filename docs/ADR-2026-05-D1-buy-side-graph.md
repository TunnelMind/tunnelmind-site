# ADR — D1: Sigil buy-side / DSP supply graph

| | |
|---|---|
| **Status**     | Accepted |
| **Date**       | 2026-05-22 |
| **Workstream** | D1 — first gated PR of the 2026-05-22 thesis-sharpening pivot |
| **Authors**    | Josh Moore + Claude |

## Context

The 2026-05-22 thesis-sharpening pivot reframes TunnelMind as the **verification layer for the AI-flooded internet**, with three lenses on one graph: Scry, **Sigil**, Tracker (see [project_tunnelmind_products](../../Obsidian%20Vault/Claude%20Memory/project_tunnelmind_products.md)). Sigil is the wedge — ad-tech has present pain and present budget. The first PR of the pivot, per the handoff's Section 8, must close the gap between Sigil's already-rich sell side and its empty buy side:

| Side | Rows (2026-05-22) | Source |
|---|---:|---|
| Publisher (sells) | 10,001 | ads.txt crawler |
| SSP | 2,594 | ads.txt crawler |
| `sells_through` | 1,704,296 | ads.txt crawler |
| **`exchange_seat`** | **0** | (no source yet) |
| **`owns_seat`** | **0** | (no source yet) |
| **`resells`** | **0** | (no source yet) |
| **`dsp`** | **0** → 33 | (no source until 014) |
| **`buys_through`** | **0** | (no source yet) |

The schema for all of this was already in place from migration 007 (October 2025) — D1 is **populate**, not design. The data is largely public (IAB sellers.json + OpenRTB SupplyChain Object); no licensed corpora required.

## Three decisions

### D1.1 — sellers.json crawler (PR #1)

> *https://github.com/TunnelMind/sigil-crawler/pull/1*

A new component in `sigil-crawler`, parallel to the existing ads.txt crawler. Pages through every `ssp` row (2,594), fetches `https://{ssp.domain}/sellers.json`, leniently parses, persists `exchange_seat` / `owns_seat` / `resells` + per-ssp enrichment (`seller_id_patterns`, `known_reseller_relationships`). 10 MB streaming body cap; off-domain redirect rule mirroring the ads.txt fetcher; `first_seen` preserved across runs via a per-SSP pre-read.

**Cadence: weekly, Sunday 06:00 UTC** — sellers.json changes far less often than ads.txt, so 7× crawl-load reduction is warranted without losing meaningful freshness. Independent cron (`run-sellers.sh`) and logfile (`/var/log/sigil-crawler-sellers.log`) so the daily ads.txt cycle and the weekly sellers.json cycle don't interleave.

### D1.2 — DSP catalog seed (PR #2 / migration 014)

> *https://github.com/TunnelMind/tunnelmind-site/pull/5*

There is no public free corpus that lists every DSP — but the set is small (well-known ~30–50 platforms). Migration 014 seeds 33 well-known DSPs (The Trade Desk, DV360, Xandr, Criteo, Amazon DSP, …) sourced from IAB Transparency Center + AdExchanger DSP map. `entity_slug=NULL` for all (entity resolution is a separate enrichment task; the FK is nullable). `atap_compatible=FALSE` initially; flip per row as ATAP integrations come online. `ON CONFLICT (domain) DO UPDATE` so the catalog can be extended later by re-applying with more rows.

### D1.3 — `resells` backfill from existing reseller `sells_through` (PR #3)

> *https://github.com/TunnelMind/sigil-crawler/pull/2*

The 1.2M `seller_type='reseller'` rows in `sells_through` already encode `(publisher → SSP_A → seller_id)`. With PR #1's `exchange_seat` populated, each reseller seller_id at SSP_A can be matched to a seat record. If that seat's `owner_entity_slug` resolves to another SSP, we have the next hop in the chain — write `resells(parent_ssp_id=A, child_ssp_id=resolved, seller_id)`.

**One-shot job, dry-run by default.** Idempotent on `(parent_ssp_id, child_ssp_id, seller_id)`. Produces zero rows today (both `exchange_seat` and `ssp.entity_slug` are empty). Becomes effective as soon as PR #1 has run AND a non-zero number of `ssp.entity_slug` values resolve — at which point each re-run picks up incremental edges with no double-writes.

### D1.4 — Opportunistic `buys_through` (PR #4)

> *https://github.com/TunnelMind/tunnelmind-data-api/pull/1*

`/verify/supply_path` and `/verify/supply_chain` accept an optional `buyer` block `{ entity_slug, dsp_domain | dsp_id }`. When present AND the verdict is not a hard fail, persist `buys_through(buyer_entity_slug, dsp_id)` opportunistically. Silent on every failure path (kill-switch, malformed input, unresolved DSP, Supabase hiccup) — this side-effect persistence path MUST NEVER break the user-visible verify response. Kill-switch: `env.SIGIL_BUYS_THROUGH_DISABLED`.

This **also gives us a first instance of [tunnelmind_question](../../Obsidian%20Vault/Claude%20Memory/tunnelmind_question.md) pillar 3 (witnessability)**: the `buys_through` row is a side effect of a verified, signed Sigil receipt path. Provenance is good by construction.

## Alternatives considered for `buys_through`

| Path | Decision | Reason |
|---|---|---|
| (a) Curated brand→DSP catalog from public sources (Adweek/ANA/agency disclosures) | Rejected | Lower confidence than observation-based data; ages fast; high manual upkeep |
| **(b) Opportunistic from SupplyChain Objects via `verify/supply_path` hook** | **Accepted** | Free data we already see; provenance by construction; no third-party dependencies |
| (c) Defer `buys_through` to H2 | Rejected | Throws away the signal that's already flowing through verify/supply_path |

## Consequences

**Enables:**
- **A2 cross-lens join (the moat)** — `POST /v1/verify/{node}` on `data.tunnelmind.ai` becomes queryable for the full bid path (buy + sell), not just sell. See [project_a2_cross_lens_join](../../Obsidian%20Vault/Claude%20Memory/project_a2_cross_lens_join.md).
- Existing verify routes (`verify/supply_chain`, `verify/ads_txt/batch`) gain "buyer has known DSP relationship" as an evidence dimension once PR #4's writes accumulate.
- Eats own dogfood ([feedback_eat_own_dogfood](../../Obsidian%20Vault/Claude%20Memory/feedback_eat_own_dogfood.md)) — PR #4 captures data that verify/supply_path already produces.

**Does not enable yet:**
- `owns_seat` rows at scale — requires the `supabase.js#resolveEntitySlug` no-op to gain coverage (pending `tracker_entities.website` backfill).
- A clean buyer→DSP graph from existing traffic — `verify/supply_chain` and `verify/supply_path` have never received a `buyer` block in any caller, so PR #4 writes zero today. It writes opportunistically as soon as any caller (ATAP-aware media buyers, integrations) supplies `buyer` context.

## Architectural notes

- **Two databases, no SQL join.** Scry corpus lives on Hetzner Postgres; Sigil graph lives on Supabase. The cross-lens join is a *service-layer* construct in the data-api Worker, not a SQL join. See A2 plan.
- **`first_seen` preservation.** Both PR #1 (`exchange_seat`) and PR #4 (`buys_through`) pre-read existing rows before each upsert because PostgREST `merge-duplicates` would otherwise clobber the prior first_seen.
- **Migration drift cleanup bundled.** Discovered during PR #2: four migrations were applied to production but missing on disk (005d, 005e, 009, 010 — not just the 009/010 the handoff named). All four are reconstructed in PR #2 with `IF NOT EXISTS` guards so a fresh-DB rebaseline reproduces production.

## Related

- [project_d1_buy_side_graph](../../Obsidian%20Vault/Claude%20Memory/project_d1_buy_side_graph.md) — the D1 plan
- [project_a2_cross_lens_join](../../Obsidian%20Vault/Claude%20Memory/project_a2_cross_lens_join.md) — the gated next workstream
- [project_tunnelmind_products](../../Obsidian%20Vault/Claude%20Memory/project_tunnelmind_products.md) — the three-lens thesis
- [session_2026-05-22_thesis_pivot_discovery](../../Obsidian%20Vault/Claude%20Memory/session_2026-05-22_thesis_pivot_discovery.md) — drift findings
- `supabase/migrations/007_supply_chain_entities.sql` — the schema D1 fills
- `supabase/migrations/014_sigil_dsp_seed.sql` — this ADR's DSP seed

# ADR-2026-06-P48 — `halo_score` + `team_signal` + MCP activation

Date: 2026-06-03
Status: Accepted + DEPLOYED LIVE 2026-06-03 (migrations 024 + 4 signal endpoints + MCP tools; offline- and production-verified)
Phase: P48 (Marti-integration adversary track P45–P49; see
`docs/decisions/ADR-2026-06-P47-adversary-signals.md` and the Claude Memory note
`project_p45_p49_adversary_track`).

## 1. Context

P47 shipped `tracker_density` + `dark_pool_risk`. P48 adds the last two
graph-derived product signals before the P49 classifier, and activates the MCP
surface for all four. As with P47 the source-doc formulas were never committed
(compacted out), so definitions were re-derived from the live schema and locked
with Josh on accuracy. Josh chose (AskUserQuestion 2026-06-03):

- **halo_score** → **peer-reputation halo** (over alternatives: adversary-proximity
  only / reach-weighted influence).
- **team_signal** → **shared-identifier clustering** (over: adversary-class cohort /
  shared-infrastructure co-occurrence).

## 2. Decision

Two read-only `GET` endpoints on `data.tunnelmind.ai`, backed by pure exported
functions in `api/routes/signals.js` and two `SECURITY DEFINER` SQL functions
(migration `024_p48_halo_team_fns.sql`, aggregate-only, row-cap-immune — same
pattern P47 was forced into):

```
GET /v1/signals/halo-score/{entity_slug}
GET /v1/signals/team-signal/{entity_slug}
```

### 2.1 halo_score — peer-reputation halo

Lights up the `peer_reputation` component reserved-but-unevaluated in the P36
trust engine (migration 011). Neighbours = the SSP operators an entity's
publishers sell through + the DSP operators it buys through. For each neighbour,
trust = avg `mv_entity_trust_scores.trust_score`; adversary neighbours are found
via `oai_registry.aliases && ARRAY['oai:'||slug]` → `oai_adversary_class` (P46).

Components (facts): neighbour count, scored count, mean/min neighbour trust,
adversary-neighbour count + classes + samples. Derived (`peer_reputation_v1`):

```
halo_score = round(100 · mean_neighbor_trust · (1 − 0.5 · adversary_ratio))   # 0–100, or null
```

`null` (not 0) when no neighbour has a computed trust — honest absence.
**Symmetric and not persisted** — evidence about an entity's company, never a
stored label: no profile poisoning (`feedback_no_poisoning`).

### 2.2 team_signal — shared-identifier clustering

Other entities that operate as a coordinated team: they share a **narrowly-held
direct seller account** or **co-own an exchange seat**.

The accuracy crux (and `feedback_signal_class_separation` again): the data shows a
single DIRECT seller account shared by **300+ entities** (network/house accounts).
That is not coordination. So only accounts shared by **2–8 entities** count as a
same-operator signal; accounts shared by >8 are separated into
`house_accounts_excluded` and **not** counted. RESELLER accounts are excluded
entirely (shared by design). This both sharpens the signal and bounds the query —
the un-thresholded form timed out (8s+) on a large multi-brand publisher.

Components: shared_direct_accounts, house_accounts_excluded, seller_mates,
coowned_seats, seat_mates, teammates{count,sample}, evidence_sample. Derived
(`shared_identifier_clustering_v1`):

```
team_signal = round(100 · (0.55·sat(teammates,25) + 0.25·sat(shared_direct,40) + 0.20·sat(coowned_seats,5)))
```

## 3. Consequences

- **No table changes** — two functions + two supporting indexes
  (`idx_sells_through_direct_ssp_seller` partial-on-direct;
  `idx_mv_entity_trust_scores_slug`). Additive, non-destructive.
- **Agent surface complete.** `openapi.yaml` has all four `/v1/signals/*` paths;
  `mcp/generate.js` derived `signal_tracker_density` / `signal_dark_pool_risk` /
  `signal_halo_score` / `signal_team_signal` → MCP worker now serves **53 tools**.
  (MCP worker reaches data-api via a **service binding**, so the #57 522 self-fetch
  bug does not apply.)
- **KV read-through cache** on all four signal handlers (`sig:<kind>:<key>`, 6h
  TTL — graph refreshes daily). `meta.cache = hit|miss|bypass`. Amortises the rare
  cold-publisher spike. KV-as-cache (not a counter) — within
  `feedback_no_freetier_loadbearing`.
- **P49-ready.** All four signal functions are exported for the classifier.

## 4. Verification

- `scripts/smoke-p47-signals.mjs` extended (offline, fetch-stub): halo math
  (54, with adversary drag), null-when-unscored, team (80, 75 teammates, 784 house
  accounts excluded). All green.
- Production: `halo-score/warner-bros-discovery-inc` → 406 neighbours, mean trust
  0.54, 1 adversary neighbour (microsoft/surveillance_bigtech), halo 54;
  `team-signal/...` → 75 teammates, 784 house accounts excluded, team 80; KV
  miss→hit confirmed. MCP `tools/call signal_team_signal` returns the same.

## 5. Deploy — DONE 2026-06-03

Migration 024 via PAT (`reference_supabase_pat_ddl_escape`). Data-api
`npm run deploy` (version `cb40314f`). MCP `npm run mcp:deploy`
(`tunnelmind-data-mcp`, version `9d08430d`).

Gotchas hit: `CREATE OR REPLACE FUNCTION` cannot change a function's return type
(needed `DROP FUNCTION` first when team_signal's signature changed); the slow
first cut had to be re-scoped to narrow-sharing (accuracy + perf in one fix).

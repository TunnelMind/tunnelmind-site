# ADR-2026-06-P47 — `tracker_density` + `dark_pool_risk` product signals

Date: 2026-06-03
Status: Accepted + DEPLOYED LIVE 2026-06-03 (additive read-only endpoints + migration 023 SQL function; offline- and production-verified)
Phase: P47 (Marti-integration adversary track P45–P49; see
`docs/decisions/ADR-2026-06-P46-attribution-cartel.md` and the Claude Memory note
`project_p45_p49_adversary_track`).

## 1. Context

The adversary track classifies any checked entity as one of
`{human_hacker, rogue_agent, surveillance_bigtech, clean}`. P46 gave
`surveillance_bigtech` a canonical anchor (the cartel OAIs + `oai_adversary_class`).
P47 builds the two **graph-derived product signals** that quantify *how much*
surveillance/opacity an entity or domain actually exhibits, so the P49 classifier
joins evidence rather than asserting a label:

- **`tracker_density`** — per tracker entity: how much of the surveillance supply
  graph the entity occupies.
- **`dark_pool_risk`** — per publisher domain: how much of its declared supply
  chain is undeclared or unconfirmed by the SSPs it claims to sell through.

The P47 source-doc formulas were never committed (lost in compaction). Rather than
reconstruct an unverifiable formula, the signal definitions were **re-derived from
the live schema and locked on the explicit test "what provides the most accurate
information"** (lowest-hallucination mandate), not "what is easiest to compute".

## 2. Decision

Two read-only `GET` endpoints on `data.tunnelmind.ai`, backed by pure exported
functions in `api/routes/signals.js` (so P49 / MCP / tests call them directly,
the same way `cross-lens-verify.js` exports `queryScry` / `querySigil`):

```
GET /v1/signals/tracker-density/{entity_slug}
GET /v1/signals/dark-pool-risk/{domain}
```

Both read the Sigil supply graph in Supabase via the service key (same access
pattern as `cross-lens-verify.js`), are rate-limited like the data routes, and
require no schema change. They emit **observed component facts first** and a
clearly-labelled **derived** roll-up second.

### 2.1 `tracker_density` — footprint blend (populated fields only)

Observed components (all directly populated, directly observed):

| component        | source                                            |
|------------------|---------------------------------------------------|
| `data_categories`| `tracker_entities.data_categories` (count + values) |
| `surfaces`       | exact counts of `ssp` + `publisher` + `dsp` + `owns_seat` + `buys_through` for the entity |
| `sources`        | `tracker_entities.sources` (count + values — provenance corroboration) |

Derived roll-up (labelled `derived`, `method: footprint_blend_v1`):

```
blend = 0.50·saturate(surfaces.total, 20)
      + 0.30·saturate(data_categories, 10)
      + 0.20·saturate(sources, 5)
tracker_density = round(blend · 100)     # 0–100
```

**`data_cost_usd` is deliberately EXCLUDED.** It is non-zero only for a
hand-curated seed (`ingestion/entity-resolution.js`); Disconnect rows set it to
`0`, IAB only estimates it. Weighting by a mostly-empty column would fabricate
precision — the opposite of accurate. The exclusion is recorded in the response
(`derived.excluded: ["data_cost_usd"]`).

### 2.2 `dark_pool_risk` — ads.txt opacity + sellers.json cross-check (two-sided)

The accuracy win over one-sided ads.txt opacity: a clean-looking ads.txt can
still hide an *unauthorized* resale path. We catch that by reconciling every sell
path the publisher declares (`sells_through`) against the SSP's own sellers.json
(`exchange_seat`). `exchange_seat.seat_id` **is** the sellers.json `seller_id`
(migration 021), so it joins directly to `sells_through.seller_id` for the same
`ssp_id`.

The classification runs **server-side in the `dark_pool_risk(p_domain)` SQL
function** (migration `023_p47_dark_pool_risk_fn.sql`, `SECURITY DEFINER`,
service-role-only). This was a *correctness* requirement, not an optimisation:
the first cut classified rows at the edge, but Supabase/PostgREST silently caps
any result set at `db-max-rows` (1000). cnn.com declares **3,688** sell paths and
its SSPs hold **4–5k seats each**, so the Worker saw <1000 seats and collapsed
`corroborated` to **0** while inflating `contradicted` — a fabricated number. The
RPC is aggregate-only (returns counts + a 12-item contradicted sample, never bulk
rows), row-cap-immune, and uses indexed `LEFT JOIN`s against the
`exchange_seat` `UNIQUE(seat_id, ssp_id)` btree. Post-fix cnn reads
`corroborated 2546 / contradicted 834 / unchecked 308`. Typical latency < 1s
(cold ~0.4–1s after a `crawled`-CTE rewrite that probes one index entry per
distinct SSP instead of scanning each SSP's full seat list).

Each path is bucketed into **three classes kept strictly separate**
(`feedback_signal_class_separation`):

| class          | meaning                                            | counts as risk? |
|----------------|----------------------------------------------------|-----------------|
| `corroborated` | seat present in the SSP's sellers.json             | no              |
| `contradicted` | SSP **was** crawled but this `seller_id` is absent | **yes**         |
| `unchecked`    | SSP's sellers.json **never crawled**               | **no**          |

Conflating `unchecked` with `contradicted` would manufacture false positives —
absence of a crawl is not evidence of fraud. `unchecked` lowers `confidence`
instead of raising risk.

Publisher-side opacity from `ads_txt_parse_status`:
`ok 0.0 · malformed 0.5 · blocked_robots 0.7 · unreachable 0.85 · not_found 1.0`;
`null/unknown → 1.0` (flagged); a nominally-`ok` ads.txt declaring zero sellers → `1.0`.

Derived roll-up (`method: opacity_plus_sellers_json_crosscheck_v1`):

```
risk = 0.50·(contradicted/total)      # two-sided — the moat
     + 0.30·ads_txt_opacity
     + 0.20·(reseller/total)
dark_pool_risk = round(risk · 100)    # 0–100

confidence = 0.4·(ok?1 : status?0.5 : 0)
           + 0.6·((corroborated+contradicted)/total)
```

## 3. Consequences

- **No schema change, additive, non-destructive.** Two new read paths only.
- **Honest by construction.** Raw observed counts lead; every roll-up is labelled
  `derived` with its weights and a `note`; the excluded/uncrawled inputs are
  surfaced, not hidden. No fabricated signatures (data-only).
- **P49-ready.** Both functions are exported; the classifier can fold
  `tracker_density` + `dark_pool_risk` into the `surveillance_bigtech` evidence
  alongside the P46 `oai_adversary_class` join.
- **Not yet on the OpenAPI/MCP surface.** Agent-facing exposure (OpenAPI entries +
  MCP tools) folds naturally into P48 ("endpoints+MCP"); deferred to keep P47
  scoped to the signal definitions.

## 4. Verification

`scripts/smoke-p47-signals.mjs` — offline, stubs `fetch` with a canned PostgREST
router. Asserts: exact surface counts; `data_cost_usd` never selected;
`corroborated`/`contradicted`/`unchecked` separation with only `contradicted`
in the numerator; the worked blend (80) and risk (23)/confidence (0.85) values;
and `in_supply_graph:false` (no fabricated score) on a miss. All green.

## 5. Deploy — DONE 2026-06-03

- Migration `023` applied to Supabase `ujosrvwcimdqofwjhnan` via the Management
  API PAT path (`reference_supabase_pat_ddl_escape`) — additive, non-destructive.
- Worker deployed (final version `51755493`). The documented `npm run deploy`
  path was restored in the same pass — see §6.
- Production-verified: `tracker-density/google` → 563 surfaces, density 54;
  `dark-pool-risk/cnn.com` → 3688 paths, 2546/834/308, risk 26, confidence 0.95,
  ~0.4s.

```
curl -s data.tunnelmind.ai/v1/signals/tracker-density/<entity_slug> | jq .data.derived
curl -s data.tunnelmind.ai/v1/signals/dark-pool-risk/<publisher_domain> | jq .data.supply_paths
```

## 6. Deploy-pipeline repair (done 2026-06-03)

`npm run deploy` was broken by two pre-existing, P47-independent faults; both fixed:

1. **OpenAPI 3.1 lint (7 errors).** Five `nullable: true` usages in
   `/v1/receipt/revoked` (removed keyword in 3.1 → `type: [string, "null"]`) and
   one unquoted, comma-containing `description` on the preflight `sigil_token`
   that flow-YAML split into two bogus property keys (quoted it). `npm run
   lint:api` now passes.
2. **Bare `wrangler` in scripts.** `deploy`/`dev`/`mcp:deploy`/`mcp:dev` called
   `wrangler` directly, but it is not a declared dep and not on PATH in the
   npm-script context (`wrangler: not found`). Switched them to `npx wrangler`,
   matching the file's existing `lint:api` → `npx @redocly/cli` convention.

Also added the two `/v1/signals/*` paths to `openapi.yaml`. `mcp/generate.js`
derives tools from the spec, so `signal_tracker_density` + `signal_dark_pool_risk`
are now generated into `mcp/server.js` (51 tools / 50 paths) — they go live on the
MCP worker at the next `npm run mcp:deploy` (P48's surface activation).

Verified: `npm run deploy` runs lint → MCP regen → `wrangler deploy` cleanly
(version `51755493`).

## 7. Remaining (genuinely optional)

- Activate the MCP tools (`npm run mcp:deploy`) — folded into P48.
- The first uncached hit on the very largest publishers can still spike if
  `exchange_seat` is cold in Supabase's shared buffers; a short KV cache in the
  handler (data refreshes daily) would amortise it if it proves necessary.

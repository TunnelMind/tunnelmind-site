# GLASSBOX-MANIFEST.md — GATE 1 discovery inventory

P-GLASSBOX requires that every on-screen claim map to a real file path or a live
endpoint **before** any display component is written (§1, GATE 1). This is that map.
Built by inspection of the repos at `/home/o2k/*` on 2026-06-23. Numbers are NOT
carried from memory — every metric below names a live endpoint that produces it.

## Platform (detected, not assumed)
- **Site:** `tunnelmind-site` — Vite 5 + React 18, Cloudflare Pages. Pages Functions
  under `functions/api/*` proxy to the two real backends. No re-platform; match this.
- **Backends:**
  - `data.tunnelmind.ai` — `tunnelmind-data-api` Worker (Supabase-backed). Envelope `{ ok, data, meta }`.
  - `api.tunnelmind.ai` — `scry-server` (Node, on the VPS — NOT a Worker, no service binding).
- **Stats spine already exists:** `src/config/facts.js` is the single-source-of-truth
  file; live numbers fetched at runtime via `/api/ecosystem-stats` → `/v1/stats`,
  literals there are fallback-only. GLASSBOX must extend this, never hardcode.

## Design system (DECIDED — keep current, 2026-06-23)
The P-GLASSBOX §0.5 "sacred-geometry is law" premise is **stale**: that skin was
deliberately reverted 2026-06-04. Operator confirmed: keep the shipped system.
- Display: **Crimson Pro** (serif). Mono: **JetBrains Mono** (NOT IBM Plex — barred as a new font).
- Ground: slate-navy `#0f172a` / `#1e293b`. Accents: scry cyan/blue · sigil green `#3dba8a` · tracker purple · ghostroute gold `#c9a84c`.
- **Survives and is reused:** `--phi-*` spacing scale; `--attest-*` tier ramp (`self-asserted → software → tee-tpm → silicon-root`, ordering load-bearing — `facts.js:ATTESTATION_TIERS`).
- No SVG sacred-geometry primitives exist in `src/`; none will be introduced. Exhibit goes data-forward, which fits "show the machine, no mystique" better than the occult skin.

## Receipt format (real implementation — NOT CBOR)
- `receipt-verify/src/jcs.ts` — RFC 8785 JSON Canonicalization Scheme (canonical body).
- `receipt-verify/src/index.ts` — Ed25519 verify path, key→signature chain.
- `receipt-verify/src/keys.ts` — key handling. `receipt-verify/src/revocation.ts` — revocation.
- GhostRoute receipts: `tunnelmind-data-api/api/lib/ghostroute/signing.js` (`signGhostRouteReceipt`, canonical JSON + Ed25519).
- Receipt generate/verify routes: `tunnelmind-data-api/api/routes/receipt.js` (`/v1/receipt/*`), `/v1/verdict/*`.
- **Display the JCS+Ed25519 reality.** The prompt's "CBOR/monotonic counter/log inclusion proof" is the aspirational spec; show what shipped, mark the rest blueprint per §0.2.

---

## The four lenses

### Scry — build-state: **LIVE**
- **Watches:** signed observations of hostile network actors (IPs, ASNs, behaviors, threat-feed overlap).
- **Pipeline:** honeypot fleet + threat feeds → `scry-augur` (ingest) / `scry-ingest` → `scry-server` (VPS) → Supabase → `api.tunnelmind.ai` serve.
- **Source files:** `/home/o2k/scry-server`, `/home/o2k/scry-augur`, `/home/o2k/scry-ingest`. Provenance label in `data-api/api/routes/explain.js:64` (`source: 'honeypot_fleet'`).
- **Serve routes:** `api.tunnelmind.ai/v1/recent`, `/v1/verify`, `/v1/stats` (proxied via site `/api/recent`, `/api/verify/[node]`, `/api/stats`).
- **MCP:** scry MCP, 12 tools (`facts.js:MCP_TOOLS.scry`).
- **Headline metric:** attacker corpus counts from `/v1/stats` `.scry`.
- **Specimen targets:** a collector/normalize excerpt from `scry-server`/`scry-augur`; a verify/serve excerpt from the `/v1/verify` handler.
- **OPSEC:** honeypot fingerprints/coords + Augur crawler signatures are KEYS — abstract (see REDACTION-LIST).

### Sigil — build-state: **LIVE**
- **Watches:** programmatic-ad supply-graph trust (publishers, SSPs, DSPs, entity scoring).
- **Pipeline:** `sigil-crawler` (ads.txt / sellers.json) → normalize → Supabase supply tables → data-api serve + scoring.
- **Source files:** `/home/o2k/sigil-crawler`, `/home/o2k/sigil-mcp`, `/home/o2k/sigil-harness`; `data-api/api/sigil-sync.js`, `api/routes/sigil-supply-path.js`, `api/routes/signals.js`.
- **Tables (real, counted in `/v1/stats`):** `exchange_seat` (~900K), `sells_through` (~1.7M), publisher/SSP/DSP entities. Confirm exact columns from `data-api/schema/` at component-build.
- **Serve routes:** `/v1/verify` (entity), `/api/corpus/cross-lens/[node]`. **MCP:** sigil, 12 tools.
- **Headline metric:** `/v1/stats` `.sigil` (publishers / SSPs / DSPs / sell paths / seats).
- **Specimen targets:** ads.txt/sellers.json parse excerpt from `sigil-crawler`; entity-scoring excerpt from data-api.

### Tracker — build-state: **LIVE** (upgraded from PARTIAL 2026-07-04)
- **Watches:** the demand-side graph of who watches whom on the open web.
- **Why LIVE now:** the previously missing Tracker-owned signed-receipt verify route exists and is deployed: `GET /v1/tracker/verify/{node}[?receipt=true]` (`data-api/api/routes/tracker-verify.js`) — per-node verdict over the DDG/IAB/Disconnect corpus, `tracking` true/false/null (ip/asn honestly null), optional Ed25519 Receipt v1.0 verifiable offline with `@tunnelmindai/receipt-verify`.
- **Tables:** `tracker_entities`, `entity_domain` (slug-keyed, counted in `/v1/stats` `.tracker`).
- **Serve paths:** `data-api/api/routes/tracker-verify.js` (lens-owned); site `/api/corpus/tracker/[domain]`; `cross-lens-verify.js`, `cross-lens-entity.js`. **MCP:** `tracker_verify`.
- **Render:** full SOURCE→SERVE pipeline shown live; no blueprint nodes remain.
- **Headline metric:** `/v1/stats` `.tracker` (entities / domains).

### GhostRoute — build-state: **LIVE**
- **Watches:** routing integrity + sovereignty — origin AS, RPKI validity, claimed-vs-actual jurisdiction, first-party CT witness.
- **Pipeline:** RPKI (VPS Routinator) + CT logs + AS-ownership → `ghostroute-corpus` workers → `api/lib/ghostroute/{pipeline,sovereignty,resolvers,zones,sanctions,signing,ai-matcher}.js` → Supabase → data-api serve.
- **Serve routes (`data-api/api/routes/ghostroute.js`):**
  - `GET /v1/ghostroute/check/:entity[?receipt=true]` — pipeline verdict; `?receipt=true` issues a signed GR-receipt.
  - `GET /v1/ghostroute/verify/:receipt_id` · `/asn/:asn` · `/cert/:domain` · `/ai/:entity` · `POST /batch`.
  - `GET /v1/ghostroute/proofs[?domain=&limit=]` — CT inclusion proofs (RPC `ghostroute_ct_proofs`, mig 031, row-cap-immune).
  - `GET /v1/ghostroute/alerts[?limit=]` — CT equivocation feed (RPC `ghostroute_ct_alerts_feed`, mig 032; empty = healthy).
  - `GET /v1/ghostroute/witness` — corpus-wide witness health.
- **Site proxies:** `/api/corpus/ghostroute-proof/[domain]`. **Viewer:** `/gr/:receipt_id` (confirm in routing at build).
- **Headline metric:** `/v1/stats` `.ghostroute`.

---

## §3 GhostRoute live surface — source decision
**No new endpoint required.** All three feeds read already-collected data and do not
trigger collection from the public page:
- `/v1/ghostroute/proofs` (recent CT inclusion proofs) — the "verified glyph enters the lattice" event stream.
- `/v1/ghostroute/witness` (health context) — what makes one proof meaningful.
- `/v1/ghostroute/alerts` (regression events) — empty feed is the honest healthy state.
- **Mechanism:** φ-derived **poll** of these via a new same-origin `functions/api/ghostroute/live.js` proxy (read-only composition of existing reads — no collection). The existing `/api/stream` SSE is scry-flavored; reuse its honest-connection-state pattern (`LIVE / reconnecting / idle`) but do not fake animation when the poll fails. → **operator-confirm per §6** (it's a new *read-only* proxy over existing reads, not new collection).

## Build-state legend rendered on site (§0.2)
- LIVE = real data through a real route. PARTIAL = part real, part blueprint. SCAFFOLDED = types/tables only.
- Scry LIVE · Sigil LIVE · Tracker LIVE (2026-07-04) · GhostRoute LIVE.

## Open / monetize split honored (§0.4)
- Open in full: receipt JCS format, verification logic, normalization/transform code, schemas (columns+types), endpoint shapes, languages, architecture.
- Gated: bulk graph rows (exchange_seat / sells_through / tracker_entities exports), honeypot/Augur identifiers, any secret. Schema shown; bulk rows are the product.

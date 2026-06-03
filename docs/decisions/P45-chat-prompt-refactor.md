# P45 — chat.tunnelmind.ai system prompt from /v1/config/analyst

Date: 2026-06-02
Status: Accepted (decision note; not a full ADR)
Phase: P45 (renumbered from the source doc's "P40" — current P40 is the in-flight
sensor-contract / sharpening pass, see ADR-2026-06-P40-sensor-contract.md, and it
already owns migrations 020/021. This Marti-integration track runs P45–P49.)

## Decision

`scry-chat` (the chat.tunnelmind.ai CF Worker) stops hardcoding its analyst persona as
the source of truth and instead fetches the system prompt from the BYOM config bundle at
`https://data.tunnelmind.ai/v1/config/analyst?format=anthropic` (the `system_prompts`
field), caching it in module memory for 5 minutes. The existing hardcoded string in
`src/system_prompt.js` (`SYSTEM_PROMPT`) is retained, renamed `FALLBACK_SYSTEM_PROMPT`,
and never deleted — archive-not-delete discipline. This is a refactor: zero visible
behavior change to users.

## Why

Single source of truth. After P39 the config bundle is already the authority for the
analyst's tools, attestation tiers, and persona for any BYOM consumer. Today the chat
worker carries its own copy of the persona, so a persona change must be made in two
places and can drift. Pulling from the bundle means analyst-persona changes propagate to
chat automatically.

## Corrections to the source spec (verified against the live system)

1. **Host.** The source doc fetches from `api.tunnelmind.ai/v1/config/analyst` — that host
   returns **404**. The route lives on `data.tunnelmind.ai/v1/config/analyst` (**200**).
   Use `data.`
2. **Repo / language.** The chat worker is `scry-chat` (plain JS CF Worker), not a
   TypeScript service. Hardcoded prompt is `export const SYSTEM_PROMPT` in
   `src/system_prompt.js`; the Anthropic call is in `src/anthropic.js`; request handling in
   `src/worker.js`.
3. **Public /prompt route.** `src/system_prompt.js` is also served publicly at
   `chat.tunnelmind.ai/prompt` ("public system prompt as differentiator"). The refactor
   must keep `/prompt` answering — it should serve the *effective* prompt actually in use
   (fetched-or-fallback), so the public artifact never lies about what the model is running.

## Risk + mitigation

- **Cold-start / fetch-failure latency.** A slow or failed config fetch must never block or
  delay a chat response. Mitigations: (a) 3-second hard timeout on the config fetch via
  `AbortController`; (b) on failure with a warm cache, serve stale cache + `console.warn`;
  (c) on failure with no cache, serve `FALLBACK_SYSTEM_PROMPT`. The chat path degrades to
  exactly today's behavior, never worse.
- **Stale persona.** Bounded by the cache TTL.

## Cache TTL

`CONFIG_TTL_MS = 5 * 60 * 1000` — a named constant, not a magic number. 5 minutes is fresh
enough that persona edits propagate within one coffee, fast enough that we hit the network
at most ~12×/hour per warm isolate.

## Expanded scope (Josh: "go big and complete", 2026-06-02)

Investigation during GATE 2 found the refactor could not be a literal no-op, and the
honest fix is bigger than the chat worker. Findings + what shipped:

1. **The bundle persona was surface-blind and hallucination-prone.** `analyst-bundle.js`
   had a single `SYSTEM_PROMPT_CORE` prescribing the data-API "five-call golden path"
   (`preflight → verify → receipt → EAT → revocation`) and a required `receipts[]` to
   EVERY surface. But `chat.tunnelmind.ai` fetches `surface=scry` and holds only the 12
   read-only `scry_*` corpus tools (verified against `mcp.tunnelmind.ai` tools/list) — it
   cannot generate receipts or run verify. Shipping that persona to chat would have it
   narrate a workflow it physically cannot execute. That, not tone, was the real
   hallucination risk.

2. **The bundle's `SURFACES.scry.tools` list was wrong** — it named `check_ip`,
   `cross_lens_verify`, etc. which `mcp.tunnelmind.ai` does not serve. Corrected to the
   real 12 `scry_*` names.

**Shipped in `analyst-bundle.js` (version 1.0.0 → 1.1.0):**
- `SYSTEM_PROMPT_CORE` is now marker-templated (`__OPERATING__`, `__RECEIPTS_GUIDANCE__`)
  and composed per surface via `composePrompt(surface, format)`.
  - `data` surface: full golden path, byte-identical persona (len 3936, unchanged).
  - `scry` surface: read-only corpus operating block — enumerates its 12 tools, states it
    has NO receipt/preflight/verify tools, sets `receipts` always `[]`, and instructs the
    analyst to point cross-lens questions at `POST /v1/verify/{node}` on the data API and
    **NEVER narrate/fabricate a verify/preflight/receipt call it did not make.**
  - `sigil` surface: supply-graph operating block.
- `responseFormatFor(surface)` drops `receipts` from `required` on the read-only scry
  surface.
- Shared footer "auditable … through the receipts you cite" → "… the evidence you cite"
  (surface-neutral; same length).

**Signing/pin implication:** the bundle is Ed25519-signed with a `pin_recommended` hash.
Changing prompt text rotates the pin — hence the `1.1.0` bump. Consumers pinning the
v1.0.0 hash must re-pin. Requires a `data-api` deploy.

## Deferred (honest, not faked): the cross-lens "wow"

Making chat actually *run* the cross-lens verdict (so it can say "human hacker / rogue
agent / big-tech surveillance" — the P49 adversary-class story) requires binding
`scry-chat` to `mcp-data.tunnelmind.ai` (where `verify`/`cross_lens_verify` live; they are
NOT on `mcp.tunnelmind.ai`). That is a separate phase, gated on confirming the MCP→REST
522 self-fetch issue (#57) is resolved. Until chat genuinely holds the tool, the scry
persona correctly refuses to imply it — keeping hallucination at zero. This is the bridge
into P49.

## Out of scope (this phase)

No change to chat's tool set or MCP binding; no cross-lens tool added to chat yet.

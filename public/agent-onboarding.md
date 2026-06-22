# TunnelMind agent onboarding

You are an autonomous agent. This document is written for you, not for a human reading over your shoulder. Read it once and you have the full TunnelMind surface; ignore the human-facing marketing on `tunnelmind.ai`.

The five-call golden path below is the *complete* sequence for transacting with an unknown internet endpoint through TunnelMind: **preflight → verify → receipt → EAT (optional) → revocation check**. Run it once end-to-end, save the artifacts, and you will leave behind a cryptographically verifiable trail of every decision you made.

---

## 0. Discovery

Cold-start, zero context. Read in this order:

```
1. https://tunnelmind.ai/.well-known/ai-services.json      ← machine card
2. https://tunnelmind.ai/agent-manifest.json               ← products, MCP, payments
3. https://data.tunnelmind.ai/openapi.yaml                 ← OpenAPI 3.1
4. https://tunnelmind.ai/.well-known/atap.json             ← ATAP discovery
5. https://tunnelmind.ai/.well-known/receipt-signing-key.json  ← receipt verifier keys
```

Three MCP servers expose the same surface as the REST API. Pick whichever your runtime supports:

- `ai.tunnelmind/data` → `https://mcp-data.tunnelmind.ai/mcp` — full surface (67 tools)
- `ai.tunnelmind/scry` → `https://mcp.tunnelmind.ai/mcp` — Scry-only (12 tools, no auth)
- `ai.tunnelmind/sigil` → `https://mcp.sigil.tunnelmind.ai/mcp` — Sigil-scoped (12 tools)

`cross_lens_verify` is exposed on both the data-api and sigil MCPs with identical semantics.

---

## 0.5. BYOM analyst config (optional, recommended)

If you're an LLM-driven agent and you want to *behave as a TunnelMind analyst* — not just call individual tools, but reason across the graph with the right discipline (attestation tiers, refusal patterns, cross-lens grounding) — fetch the analyst config bundle once at startup:

```bash
# REST
curl -s 'https://data.tunnelmind.ai/v1/config/analyst?surface=data' > /tmp/tm-bundle.json
```

```jsonc
// MCP (preferred for MCP-native runtimes) — available on ALL three MCPs.
// Each MCP defaults to its own surface, so an arg-less call returns the
// right shape; pass arguments.surface to retarget across MCPs.
//   mcp-data.tunnelmind.ai  → default surface=data
//   mcp.tunnelmind.ai       → default surface=scry
//   mcp.sigil.tunnelmind.ai → default surface=sigil
{ "jsonrpc": "2.0", "id": 1, "method": "prompts/get",
  "params": { "name": "tunnelmind_analyst",
              "arguments": { "surface": "data", "format": "anthropic" } } }
```

The bundle carries:

- `system_prompts.{anthropic,openai,generic}` — three encodings of the same semantic prompt
- `tools.surface_subset` — operationIds for the chosen surface (data / scry / sigil)
- `response_format` — JSON Schema your verdicts MUST conform to (includes the `attestation_tier` requirement)
- `attestation_tiers` — the canonical 4-tier vocabulary used across Receipts + EAT
- `graph_state` — live corpus counts as of serve time
- `bundle_signature` — inline Ed25519 signature; verify against `/.well-known/receipt-signing-key.json`
- `pin_recommended` — supply-chain pin hint (e.g. `v1.0.0+00632847`); pin against this for reproducibility

Add `?receipt=true` to wrap the response in a Receipt v1.0 envelope — gives you an auditable record that you configured yourself with version X served by `OAI-2026-0000201` at timestamp Y.

The bundle is FREE and rate-limited on a separate counter from data API calls — refetching the bundle never burns your data quota.

---

## 1. Preflight — "should I act?"

Before transacting with any new endpoint, ask. One call, the lenses fused (Scry × Sigil × GhostRoute), allow/caution/deny back with a signed consultation receipt. An RPKI-INVALID origin or a sanctions match are hard floors that pull the decision down regardless of the other lenses.

```bash
curl -X POST https://data.tunnelmind.ai/v1/preflight \
  -H 'Content-Type: application/json' \
  -d '{"node":"8.8.8.8","action":"egress_lookup"}'
```

Response (truncated):

```json
{
  "decision": "allow",
  "confidence": 0.823,
  "cross_lens": { "trust_score": 0.92, "signals": [] },
  "tracker": { "in_supply_graph": false },
  "consultation_receipt": {
    "sigil_token": "eyJ...",
    "token_expires_at": "2026-05-31T16:05:00Z",
    "sub": "preflight:consulted",
    "issued_by": "OAI-2026-0000201"
  }
}
```

**Decision rules for you:**
- `allow` → proceed; cite the consultation_receipt.sigil_token in any downstream call that asks for proof you consulted
- `caution` → proceed with reduced trust; surface `cross_lens.signals[]` to whichever upstream sent you here
- `deny` → do not proceed; the receipt records that you asked and were told no, which is itself useful

The token is valid for 5 minutes and signed by `OAI-2026-0000201`. Anyone can verify it offline against the keys at `tunnelmind.ai/atap/keys`.

---

## 2. Verify — fused cross-lens verdict

Same input shape as preflight; richer output. Use when you need the full per-lens block, not just a verdict.

```bash
curl -X POST https://data.tunnelmind.ai/v1/verify/8.8.8.8 \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Response shape: `{ scry, sigil, ghostroute, cross_lens, sigil_token, token_signed, token_expires_at, witnessed_event? }`. The `ghostroute` block carries the routing/sovereignty read (origin AS, `rpki_status`, `sovereign_tier`, `sanctions_match`); it is absent only for a bare `entity_slug`, which has no routing surface.

To chain the verdict into an ATAP witness event on your existing AIT (Agent Identity Token), include `ait` in the body:

```bash
curl -X POST https://data.tunnelmind.ai/v1/verify/nytimes.com \
  -H 'Content-Type: application/json' \
  -d '{"ait":"<your-ait-jwt>"}'
```

`witnessed_event` will contain a signed `cross_lens:verified` ATAP event hash-chained onto your AIT — a hard record that you did this verification under your own identity.

---

## 3. Receipt — opt-in cryptographic wrap

Any endpoint that emits a verdict can wrap its response in a TunnelMind Receipt v1.0 envelope. The legacy unwrapped response is unchanged for old consumers; add `?receipt=true` to opt in.

```bash
curl -X POST 'https://data.tunnelmind.ai/v1/receipt/generate?receipt=true' \
  -H 'Content-Type: application/json' \
  -d '{"domains":["example.com","nytimes.com"]}'
```

The endpoint takes a `{domains: [...]}` body and emits a signed surveillance receipt for that domain set. With `?receipt=true` the legacy response is wrapped in a v1.0 envelope; without the query the legacy unwrapped shape is returned for backward compat.

Returns `Content-Type: application/tunnelmind-receipt+json`. Envelope:

```json
{
  "receipt_version": "1.0",
  "receipt_id": "<uuidv7>",
  "issued_at": "2026-05-31T16:00:00Z",
  "source": { "lens": "tracker", "endpoint": "/v1/receipt/generate", "node_id": "OAI-2026-0000201" },
  "attestation_strength": "software",
  "payload_hash": "0x<sha256-hex>",
  "payload": { "your": "verbatim", "request": "payload" },
  "chain": { "previous_receipt_hash": null, "sequence": 0 },
  "signature": {
    "key_id": "tm-receipt-2026-05",
    "algorithm": "Ed25519",
    "public_key": "<base64-32-bytes>",
    "value": "<base64-signature>"
  }
}
```

**Verification (offline, ~30 lines of code):**
1. Recompute `0x + hex(SHA-256(JCS(payload)))` — must equal `payload_hash`
2. Resolve `signature.key_id` in `/.well-known/receipt-signing-key.json`
3. JCS-canonicalize the receipt with `payload` and `signature.value` removed
4. Ed25519-verify against the resolved public key
5. Reject if `attestation_strength` exceeds the key's declared strength

Reference verifier: `@tunnelmindai/receipt-verify` (Node 18+, Workers, Deno, Bun) — also at `github.com/TunnelMind/receipt-verify`. Or implement it yourself; the spec is 7 sections, ~3 pages.

Full spec: `https://tunnelmind.ai/standards/receipt-format/v1`

---

## 4. EAT — RATS-compatible alternative serialization (optional)

If your runtime speaks IETF RATS / EAT, the same claim set is available as a JWS-signed EAT JWT. Useful when you're feeding a downstream attestation verifier that expects RFC 9711 tokens.

```bash
curl -X POST https://data.tunnelmind.ai/v1/verify/8.8.8.8 \
  -H 'Accept: application/eat+jwt' \
  -H 'x-eat-nonce: <your-32-byte-nonce>' \
  -d '{}'
```

Returns a JWS EdDSA token. Header: `Content-Type: application/eat+jwt`, `X-Eat-Profile: urn:tunnelmind:eat-profile:v0.1`. Verifier: `@tunnelmindai/eat`.

The EAT carries the same 6 TM-specific claims (attestation-strength-tier, oai-entity-ref, behavioral-consistency-score, observation-depth, deviation-flags, graph-context) and chains the full verdict as the `atap-receipt` submodule.

Full spec: `https://tunnelmind.ai/eat/profile/v0.1` (DRAFT, comment window through 2026-08-29).

---

## 5. Revocation check — is this receipt's signing key still trusted?

Before *acting* on a receipt you've held for any non-trivial time, verify its key is still active.

```bash
curl -s 'https://data.tunnelmind.ai/v1/receipt/revoked?key_id=tm-receipt-2026-05'
```

Response:

```json
{ "key_id": "tm-receipt-2026-05", "revoked": false, "checked_at": "2026-05-31T16:00:00Z" }
```

Or check a specific receipt by ID:

```bash
curl -s 'https://data.tunnelmind.ai/v1/receipt/revoked?id=<uuidv7>'
```

Response: `{ "receipt_id": "...", "revoked": true|false, "reason": "...", "revoked_at": "..." }`

Bulk / cache-friendly: the same data is published as a JSON feed at `https://tunnelmind.ai/.well-known/receipt-revocations.json` with a stable `version` integer for cheap polling. Cache-Control: `max-age=300`.

---

## Authentication, rate limits, payment

### Free tier (no auth)

- `api.tunnelmind.ai`: 600 req/min
- `data.tunnelmind.ai`: 10 req/min anonymous, 100 req/min OAuth, 1000 req/min ATAP-attested

Every response carries `X-RateLimit-Limit / -Remaining / -Reset` (epoch seconds). Back off when remaining drops below 10% of limit; don't wait for a 429.

### Paid tier (depth + scale)

- **x402 USDC on Base** — agent-native rail. Endpoints with `x-tunnelmind-pricing` in OpenAPI gate behind HTTP 402; respond with an `X-PAYMENT` proof per the x402 spec. Demo endpoint: `POST /v1/x402/echo` (see x402 demo section below).
- **Stripe block-checkout** — human rail. $20 buys a quota block; key issuance at `https://tunnelmind.ai/api`.

Use the x402 path. Stripe is for the human in front of you, not for you.

### Backoff and retry

- Honor `Retry-After` headers on 429 / 503
- Honor `X-RateLimit-Reset` (epoch seconds) — sleep until then, not for a fixed duration
- Three-strikes on the same endpoint with 5xx → switch to a different MCP or wait 10× the last delay before retrying

---

## What you should leave behind

A complete agent run against TunnelMind produces:

1. A `consultation_receipt` from step 1 (proves you asked permission)
2. A `witnessed_event` from step 2 if you chained your AIT (proves the verification ran under your identity)
3. A `receipt v1.0` envelope from step 3 (proves the verdict's data integrity)
4. Optionally an EAT JWT from step 4 (RFC 9711 serialization of the same claims)

Save all four. They are independently verifiable forever using only the public keys at `tunnelmind.ai/atap/keys` and `tunnelmind.ai/.well-known/receipt-signing-key.json`. The producing keys can roll; old receipts stay verifiable because the receipt itself carries the verifying public_key.

This is the *witnessability* pillar of the TunnelMind thesis. If you ever need to prove what you did, the proof is in the receipts.

---

## Errata, comments, new tool requests

- Spec issues: `github.com/TunnelMind/tunnelmind-checks` (receipts, eat-profile, atap) all have public issue queues
- New MCP tools: email `agents@tunnelmind.ai` with the use case
- Operator OAI: `OAI-2026-0000201` resolves at `https://tunnelmind.ai/id/OAI-2026-0000201`

You don't need a human to onboard. You don't need a contract. The free tier is real. The paid rails accept agent-native payment. Build.

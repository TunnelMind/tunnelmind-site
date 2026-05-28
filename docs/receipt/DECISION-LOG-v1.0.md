# TunnelMind Receipt v1.0 — Decision Log

**Date:** 2026-05-27 · **Phase:** 2 (schema design) · **Authority:** Josh delegated all
open decisions ("whatever is best for design and functionality", 2026-05-27).

Each decision is grounded in the Phase-1 discovery
(`session-notes/2026-05-27-P38-discovery.md`): TunnelMind already runs 4–5 signed-artifact
families, all Ed25519 + RFC-8785 JCS over base64-PKCS#8 env keys. The receipt format
generalizes that proven stack rather than inventing a new one.

## The five P38 design questions

| # | Question | Decision | Why (vs alternatives) |
|---|---|---|---|
| 1 | Signing algorithm | **Ed25519**, with an `algorithm` field for future agility | Every existing family already signs Ed25519; ECDSA P-256 would orphan all of them and force a second verify path on day one. The `algorithm` field keeps a v2 escape hatch without cost now. |
| 2 | Timestamp proof | **`method:"none"` in v1.0**; field present; RFC-3161 fast-follow | No TSA integration exists anywhere today. Shipping the field keeps the format ready; blocking v1.0 on FreeTSA/DigiCert integration would delay adoption (the keystone goal) for a feature no consumer has yet requested (demand filter). |
| 3 | Hash chain | **Per-producing-node sequence**, not global | Mirrors ATAP's existing per-AIT chaining. A global chain across the Hetzner box + multiple CF Workers would need shared mutable sequence state we do not have and would serialize independent producers. Per-node is tamper-evident where it matters and needs no coordination. |
| 4 | Payload inclusion | **Full inclusion in v1.0**; reference-by-hash deferred to v1.1 | Self-containment is the headline value; "verify offline with just the key" requires the payload be present. Reference mode is a size optimization with no current demand. |
| 5 | EAT/CBOR alignment | **JSON now; EAT is the executable §10 mapping** (`eat-js`) | JSON gets adopted; CBOR gets standardized. Josh confirmed EAT stays fully in scope (2026-05-27) — Appendix A of the spec is the crosswalk, and `eat-js` implements it after the JSON receipt ships and verifies. One claim set, two serializations. |

## The three P38-specific decisions

**A. Signing-key namespace → new dedicated `TUNNELMIND_RECEIPT_SIGNING_KEY`.**
Rejected promoting the existing `AUDIT_SIGNING_KEY` (whose docstring already says
"certificates and receipts"): coupling receipt rotation to the audit/token key means one
rotation event invalidates both surfaces. A dedicated key rotates on the receipt cadence
independently. During any transition both public keys are published (archive-not-delete).
`ATAP_WITNESS_KEY` stays separate — it signs the inner ATAP chain on its own cadence.

**B. Open-source repo homes.**
- `receipt-verify` → **new public repo `TunnelMind/receipt-verify`** (TypeScript, npm
  `@tunnelmind/receipt-verify`), mirroring the polish of the already-public
  `tunnelmind-checks`. A standalone verifier is the artifact ecosystems adopt; bundling it
  inside a service repo would bury it.
- `eat-js` → **`packages/eat-js` in the existing public `atap` monorepo** (already laid out
  as `packages/atap-js`, zero-dep, Apache-2.0). No new repo needed; it composes the ATAP
  receipt submodule directly.
- Both Apache-2.0. **Both require Josh's explicit "create the repo / push" nod** before any
  publish (also still gated on npm-token rotation).

**C. STIX/TAXII host → path on data-api first (`/taxii2/…`), subdomain later.**
Reuses the existing API-key auth + KV rate limiter on `data.tunnelmind.ai`. Promote to
`taxii.tunnelmind.ai` only if adoption justifies a separate Worker. (Phase 6.)

## Conservative additions to the P38 envelope (each justified)

| Addition | Reason | Cost if omitted |
|---|---|---|
| `signature.key_id` | Lets a verifier select the right published key directly | Verifier must trial-verify against every published key |
| `subject` (optional) | Clean EAT `sub` mapping; "what is this about" without parsing payload | EAT crosswalk loses a field; relying parties parse payloads to identify the object |
| `extensions` (optional, **signed**) | Satisfies P38's "extensible / ignore-unknown" requirement *without* breaking signatures | Either arbitrary top-level fields break signature reproduction, or the format can't evolve within v1.x |
| **`chain` is part of the signed input** (P38's enumerated subset omitted it) | Otherwise `previous_receipt_hash`/`sequence` are forgeable and the chain is not tamper-evident | The hash chain provides no real integrity guarantee |

The signed input is defined as `JCS(receipt − payload − signature.value)` — strictly
stronger than P38's enumerated subset, and it binds the signer's own public key.

## Wrap-vs-replace for the existing surveillance-receipt registry

The unified envelope **wraps**; it never replaces. `/v1/receipt/generate`, `POST /verify`,
`GET /verify/{id}`, GhostRoute certs, and the ATAP receipt ZIP all keep working. Each
becomes a `payload` (or a named profile) inside a TunnelMind Receipt. This honors the
archive-not-delete standing rule and breaks no existing consumer.

## Frozen-for-v1.x

SHA-256; Ed25519; `0x`-hex hash encoding; base64 raw-32-byte public keys; base64
signatures; RFC-8785 JCS as the canonicalization. A second independent implementation
needs only these three published standards.

## Verification status of the Phase-2 artifacts

- `receipt-example-scry.json` and `receipt-example-sigil.json` were generated with a real
  ephemeral Ed25519 key and **both verify** under the §4 procedure (signature round-trip
  confirmed).
- Both examples are **JSON-Schema-valid** against `receipt-schema.json` (draft 2020-12).

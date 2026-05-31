# TunnelMind Receipt Format v1.0

**Status:** PUBLISHED 2026-05-31 · 90-day public-comment window closes 2026-08-29.
**License:** spec CC BY 4.0 · reference code Apache-2.0.
**Canonical URL:** https://tunnelmind.ai/standards/receipt-format/v1
**Key bundle:** https://tunnelmind.ai/.well-known/receipt-signing-key.json
**Reference verifier:** https://github.com/TunnelMind/receipt-verify (Apache-2.0)
**Companion:** [EAT Profile v0.1](https://tunnelmind.ai/eat/profile/v0.1) is the RATS-aligned (CWT/JWT)
serialization of this same claim set. This document is the JSON serialization — the
adoption vehicle.

A **TunnelMind Receipt** is a signed JSON wrapper around any TunnelMind API response. It
turns an ordinary response into a verifiable attestation: a relying party holding only the
published public key can confirm *who* produced the data, *when*, under *what trust root*,
and that the payload is *byte-for-byte intact* — entirely offline.

This format **unifies** the signed-artifact mechanisms TunnelMind already runs (ATAP
witness receipts, the surveillance-receipt registry, GhostRoute certificates, Familiar
signed observations). Those become *payloads* or *profiles* of this envelope; none is
removed (archive-not-delete).

## 1. Design goals

- **Self-contained** — everything needed to verify is in the receipt or reachable from the
  one published key endpoint.
- **Offline-verifiable** — a verifier with the public key validates without calling TunnelMind.
- **Trivial to reimplement** — a competent developer writes a verifier in an afternoon
  using only three published standards: RFC 8785 (JCS), Ed25519 (RFC 8032), SHA-256.
- **Extensible without breaking verifiers** — additive fields go in `extensions` (which is
  signed); unknown keys inside `extensions` are ignored by older verifiers.
- **Attestation-strength from commit 1** — every receipt declares its trust root.

## 2. Envelope

```jsonc
{
  "receipt_version": "1.0",
  "receipt_id": "<uuidv7>",                 // RFC 9562; inherits ATAP time-ordering
  "timestamp": "<RFC 3339 UTC>",            // issuance time
  "timestamp_proof": {
    "method": "none" | "rfc3161",
    "tsa_url": "<url>",                      // rfc3161 only
    "token": "<base64>"                      // rfc3161 only
  },
  "source": {
    "lens": "scry" | "sigil" | "tracker" | "oai",
    "endpoint": "<request path>",
    "node_id": "<OAI of the producing node>" // e.g. OAI-2026-0000201 — RESOLVE, don't trust verbatim
  },
  "subject": "<identifier of the attested object>",  // OPTIONAL; e.g. ip:1.2.3.4, a URL
  "attestation_strength": "self-asserted" | "software" | "tee-tpm" | "silicon-root",
  "payload_hash": "0x<64 hex>",             // sha256( JCS(payload) )
  "payload": { /* the actual API response */ },
  "chain": {
    "previous_receipt_hash": "0x<64 hex>" | null,  // links the producing node's sequence
    "sequence": <non-negative integer>
  },
  "extensions": { /* OPTIONAL, signed, free-form additive fields */ },
  "signature": {
    "algorithm": "Ed25519",
    "key_id": "<published key id>",          // selects the key at the well-known endpoint
    "public_key": "<base64 raw 32-byte Ed25519>",
    "value": "<base64 signature>"
  }
}
```

### 2.1 Field notes

- **`source.node_id`** is an OAI. It is a *resolver* reference (`/id/{OAI}` → identity +
  reputation), **never** an identity-issuance claim. A verifier resolves it; it does not
  trust the string by itself. (Non-negotiable: OAI stays a resolver.)
- **`attestation_strength`** is the declared trust root of the producing node, ordered
  weakest→strongest. A verifier **MUST reject** a receipt whose declared strength exceeds
  the *key's* declared strength at the well-known endpoint (the key is the ceiling). Today
  all production nodes run in OS-isolated/containerized environments → `"software"`.
- **`subject`** (optional) names what the receipt is about. It maps to the EAT `sub` claim
  and lets a relying party key on the attested object without parsing the payload.
- **`extensions`** (optional) is the *only* place additive fields belong. It is part of the
  signed input, so additions stay tamper-evident; verifiers ignore keys they don't know.
- Hashes are `0x` + 64 lowercase hex (SHA-256), matching the existing ATAP corpus.

## 3. Signing procedure

1. Compute `payload_hash = "0x" + hex( SHA-256( JCS(payload) ) )` and set it on the receipt.
2. Build the **signing object**: the receipt with the `payload` field omitted (it is bound
   via `payload_hash`) and `signature.value` omitted (`algorithm`, `key_id`, `public_key`
   present).
3. `signing_input = utf8( JCS(signing_object) )`.
4. `signature.value = base64( Ed25519-Sign(private_key, signing_input) )`.

The signature therefore covers **every field except the raw payload bytes** — including
`source`, `attestation_strength`, `chain`, `subject`, `extensions`, and the signer's own
`public_key`/`key_id`. The payload is bound transitively through `payload_hash`.

## 4. Verification procedure

A relying party **MUST**:

1. Recompute `"0x" + hex(SHA-256(JCS(payload)))` and reject if it ≠ `payload_hash`.
2. Resolve the public key: fetch `https://tunnelmind.ai/.well-known/receipt-signing-key.json`,
   find the active key whose `key_id` matches `signature.key_id`, and confirm its
   `public_key` matches the receipt's. Reject on unknown/revoked key, or mismatch.
3. Reconstruct the signing object (§3 step 2), JCS-canonicalize it, and verify
   `signature.value` (Ed25519) against the resolved public key. Reject on failure.
4. Reject if `attestation_strength` exceeds the key's declared strength (ceiling rule).
5. If `chain.previous_receipt_hash` is non-null and the verifier holds the prior receipt,
   confirm the link (§5). A broken or skipped link lowers trust but does not by itself
   invalidate a single receipt.
6. Surface the verified payload plus any accumulated warnings.

A reference verifier (`@tunnelmind/receipt-verify`, Phase 5) encapsulates steps 1–5 and
returns `{ valid: boolean, errors: string[], warnings: string[] }`.

## 5. Chain semantics

Each producing node maintains a per-node monotonic `sequence`. `previous_receipt_hash` =
`"0x" + hex( SHA-256( utf8( previous_receipt.signature.value ) ) )`. Because the previous
signature commits to the previous receipt's entire signing input (which binds its payload
via hash), hashing it transitively commits to the whole prior receipt with a single small
value — no need to retain prior payloads to validate a link. The genesis receipt of a node
sets `previous_receipt_hash: null, sequence: 0`. Chaining is **per-node, not global** —
there is no shared cross-node sequence.

## 6. Conveyance

Receipt wrapping is **opt-in and additive**. Endpoints accept `?receipt=true` (default
`false`); the unwrapped legacy response is unchanged for every existing consumer. When
requested, the response `Content-Type` is `application/tunnelmind-receipt+json` and the
body is the envelope above with the legacy response carried verbatim in `payload`.

## 7. Versioning

`receipt_version` is `"1.0"`. Verifiers MUST reject a major version they don't implement
and MAY accept a higher minor version (minor versions are additive-only, via new optional
fields or `extensions`). SHA-256 and Ed25519 are fixed for all of v1.x; algorithm agility
is carried by `signature.algorithm` for a future v2.

## 8. Revocation

Revocation answers two operationally distinct questions:

1. **Key revocation** — "Is the signing key that produced this receipt still trusted by
   the issuer?" A key is revoked when the issuer believes it has been compromised, or
   when it is rotated out of service. Receipts signed *before* `revoked_at` remain
   provisionally valid; receipts signed *after* `revoked_at` MUST be rejected.
2. **Receipt revocation** — "Has the issuer retracted this specific receipt?" Used when
   the issuer made a mistake (erroneous payload, out-of-policy emission) and wants to
   inform downstream verifiers without rotating the underlying key.

### 8.1 Discovery — the well-known feed

The full revocation set is published at:

```
https://tunnelmind.ai/.well-known/receipt-revocations.json
```

Schema:

```json
{
  "feed_version": <int, monotonically increasing>,
  "updated_at": "<ISO 8601 UTC>",
  "revoked_keys": [
    {
      "key_id": "<the receipt-format key_id>",
      "revoked_at": "<ISO 8601 UTC>",
      "reason": "<human-readable>",
      "replacement_key_id": "<optional pointer to the rotated successor>"
    }
  ],
  "revoked_receipts": [
    {
      "receipt_id": "<uuidv7>",
      "revoked_at": "<ISO 8601 UTC>",
      "reason": "<human-readable>"
    }
  ]
}
```

Verifiers SHOULD cache this feed (Cache-Control: `max-age=300`) and poll `feed_version`
to detect changes. Both arrays are empty at launch; an empty array is authoritative,
not a placeholder.

### 8.2 Lookup — the query endpoint

For verifiers that don't want to maintain a local mirror, the data API offers single-item
lookup at:

```
GET https://data.tunnelmind.ai/v1/receipt/revoked?key_id=<key_id>
GET https://data.tunnelmind.ai/v1/receipt/revoked?id=<receipt_id>
```

Response shape:

```json
{ "key_id": "tm-receipt-2026-05",  "revoked": false, "checked_at": "..." }
{ "receipt_id": "<uuidv7>",        "revoked": false, "checked_at": "..." }
```

When `revoked: true`, the response also carries `revoked_at` and `reason`. The endpoint
is rate-limited but free; verifiers can call it on every receipt validation.

### 8.3 Verifier obligations

A relying party SHOULD:

1. On every verification, check `signature.key_id` against the `revoked_keys` set.
2. If a `key_id` is revoked and the receipt's `issued_at` precedes `revoked_at`, the
   receipt remains valid but verifiers SHOULD attach a `key-rotated-out-of-service`
   warning.
3. If a `key_id` is revoked and the receipt's `issued_at` is on-or-after `revoked_at`,
   reject the receipt with reason `revoked_key`.
4. Optionally check `receipt_id` against `revoked_receipts`; reject with reason
   `revoked_receipt` if present.

The reference verifier (`@tunnelmindai/receipt-verify`) implements steps 1–4
automatically against the well-known feed.

## Appendix A — EAT crosswalk (informative)

The same claim set serializes to an [EAT Profile v0.1](../EAT-PROFILE-v0.1.md) token.
Mapping:

| Receipt field | EAT claim |
|---|---|
| `receipt_id` | `cti` / `jti` |
| `timestamp` | `iat` |
| `timestamp` + 300 s default | `exp` |
| `subject` | `sub` |
| `source.node_id` (OAI) | `iss` (URL form) + `tunnelmind-oai-entity-ref` |
| `attestation_strength` | `tunnelmind-attestation-strength-tier` |
| `payload` (when an ATAP receipt) | `submods["atap-receipt"]` |
| `chain.previous_receipt_hash` | `tunnelmind-chain-head-hash` |
| `signature` (Ed25519 over JCS) | outer COSE_Sign1 (CWT) / JWS (JWT), EdDSA |
| (profile identifier) | `profile = urn:tunnelmind:eat-profile:v0.1` |

A receipt and its EAT token carry identical semantics; the wire format is the only
difference. JSON is the adoption path; EAT is the standards-interoperability path.

## Appendix B — examples

- [`receipt-example-scry.json`](./receipt-example-scry.json) — a Scry IP observation,
  mid-chain (`sequence: 41`).
- [`receipt-example-sigil.json`](./receipt-example-sigil.json) — a Sigil supply-path
  verdict, genesis (`sequence: 0`), with an `extensions` field.

Both are signed with a **doc-only ephemeral key** (`key_id` prefix `receipt-example-`) and
verify under the §4 procedure. They are *not* signed by the production receipt key.

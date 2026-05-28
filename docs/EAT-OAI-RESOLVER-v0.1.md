# OAI resolver — EAT support, v0.1 (draft)

**Status:** DRAFT. Not yet implemented.
**Companion to:** [EAT Profile v0.1](./EAT-PROFILE-v0.1.md), [OAI v1.0](./OAI-STANDARD-v1.md)
**License:** CC BY 4.0.

This document specifies the changes to the OAI resolver at
`https://tunnelmind.ai/id/{OAI}` required to serve EAT-formatted
responses alongside its existing JSON representation. It is the
companion spec to the [TunnelMind EAT Profile](./EAT-PROFILE-v0.1.md);
the profile defines what an EAT token looks like, this document
defines when and how the resolver issues one.

## 1. Backward compatibility

The default behavior of `/id/{OAI}` does not change. Clients that issue
a plain `GET` with no `Accept` header (or with `Accept: application/json`,
or with `Accept: */*`) continue to receive the legacy JSON response
shape documented in [OAI v1.0] §6. No legacy field is moved, renamed,
or removed. No behavioral change is observable to any current consumer.

## 2. Triggering an EAT response

An EAT response is issued only when the client sends an `Accept` header
that explicitly includes one of the EAT media types ([RFC 9782]):

- `Accept: application/eat+cwt` → CBOR/CWT body
- `Accept: application/eat+jwt` → JSON/JWT body

When both are listed, the higher-quality value wins; ties resolve in
favor of `application/eat+cwt` (smaller, faster). When neither is
listed, the legacy JSON path is used regardless of any other accept
preferences.

## 3. Optional freshness anchor

A relying party MAY include a freshness nonce on the request:

- as a query parameter: `?nonce=<base64url>`, or
- as a header: `X-Eat-Nonce: <base64url>`

The header takes precedence when both are present. Nonces MUST be at
most 64 bytes. The resolver echoes the supplied nonce verbatim into
the `nonce` claim ([RFC 9711] §4.2.1) of the issued token. When no
nonce is supplied, the `nonce` claim is omitted and the token is
replayable within its `exp` window.

## 4. Claim population

The issued EAT carries the standard claims from EAT Profile §8 with
the following resolver-specific population:

| Claim | Source |
|---|---|
| `iss` | The resolver's own OAI in URL form. Single value for the production resolver: `https://tunnelmind.ai/id/OAI-2026-0000201`. |
| `sub` | The resolved entity's OAI in URL form: `https://tunnelmind.ai/id/{OAI}`. |
| `iat` | Resolver wall-clock at token issuance. |
| `exp` | `iat` + 300 seconds. |
| `cti` / `jti` | uuidv7 generated at issuance. |
| `nonce` | Echo of request nonce per §3, or omitted. |
| `profile` | `urn:tunnelmind:eat-profile:v0.1`. |
| `ueid` | The raw bytes of the resolved OAI (text-form sub-string between `OAI-` and end). |
| `tunnelmind-oai-entity-ref` | The resolved OAI in bare form (e.g. `OAI-2026-0000201`). |
| `tunnelmind-attestation-strength-tier` | The resolver's own tier (`software` for the production CF Worker resolver). |
| `tunnelmind-behavioral-consistency-score` | Optional. Present only when the resolved entity has accumulated observations under the identity-attestation system (Phase 5). Otherwise omitted. |
| `tunnelmind-observation-depth` | Same conditional rule as the consistency score. |
| `tunnelmind-deviation-flags` | Empty array when present (no behavioral data) or omitted entirely when the entity has no observation history. |
| `tunnelmind-graph-context` | Optional. Present only when cross-lens enrichment yields non-trivial signal. |

The `submods` field is omitted on plain OAI lookups; the resolver does
not generate ATAP receipts on its own (Sigil does that). When the
caller wants a receipt-carrying EAT, they should call the relevant
Sigil verify endpoint with `Accept: application/eat+cwt`, not the OAI
resolver.

## 5. Status codes

| Code | When |
|---|---|
| 200 | EAT issued for a registered, active OAI. |
| 404 | The OAI is not in the registry. Body: JSON error per legacy. EAT is not issued for not-found because the EAT profile requires `sub` to refer to an existing entity. |
| 410 | The OAI was registered and later revoked. Body: legacy JSON. |
| 406 | The `Accept` header lists only media types the resolver cannot satisfy. |
| 422 | The supplied nonce is malformed (over 64 bytes, not base64url, etc.). |

A 4xx response body is JSON regardless of the `Accept` header; EAT is
reserved for successful resolutions.

## 6. Caching

EAT responses MUST NOT be cached by intermediaries. The resolver SHOULD
emit `Cache-Control: no-store` on every EAT response, because:

- the `iat`/`exp` claims pin the token to a specific moment;
- the `nonce` echo prevents legitimate cache hits;
- the underlying entity reputation can change between calls.

The legacy JSON response continues to use its current cache rules.

## 7. Key material

The resolver signs EAT responses with its own Ed25519 key, published at
`tunnelmind.ai/atap/keys` under the resolver's OAI. The same key
infrastructure used by ATAP witnesses serves the resolver. No new key
endpoint is introduced; no key ceremony is required to launch this
feature.

A relying party verifying the EAT signature MUST fetch
`tunnelmind.ai/atap/keys`, locate the active key whose `witness` field
matches `iss`, and check the COSE_Sign1 (or JWS) signature against
that key's `public_key`.

## 8. Implementation surface

Concretely, two changes land in `oai-resolver`:

1. New content-negotiation branch at the top of the `GET /id/:oai`
   handler. If the request `Accept` header matches an EAT media type
   AND the lookup succeeds, build an EAT response object and sign it.
2. New module `eat.js` housing the claim assembly, COSE/JWS signing,
   and CBOR/JSON encoding. Imports `@tunnelmindai/atap` (already a
   dep) for the key material loader and adds `@tunnelmindai/eat` (the
   library planned in EAT Profile Appendix C) for the encoder.

No new routes are added. No existing route's URL or query semantics
change.

## 9. Cross-references

- [EAT Profile v0.1](./EAT-PROFILE-v0.1.md) — claim set, signing,
  submodule layout
- [OAI v1.0](./OAI-STANDARD-v1.md) — registry behavior, OAI format
- [EAT IANA registration draft](./EAT-IANA-REGISTRATION-v0.1.md) — claim
  allocation ledger
- [EAT migration plan](./EAT-MIGRATION-PLAN-v0.1.md) — consumer-side
  evolution

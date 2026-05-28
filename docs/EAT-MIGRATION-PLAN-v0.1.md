# EAT Profile — migration plan for existing consumers

**Status:** DRAFT.
**Companion to:** [EAT Profile v0.1](./EAT-PROFILE-v0.1.md), [EAT OAI Resolver](./EAT-OAI-RESOLVER-v0.1.md)
**License:** CC BY 4.0.

This document describes how existing TunnelMind API consumers (Scry,
Sigil, OAI resolver) experience the rollout of the EAT Profile, so
that no consumer is forced to change client code on TunnelMind's
schedule. The core promise: **EAT is additive**. Every existing JSON
response continues to work, byte-for-byte, until the consumer opts in
to an EAT representation via `Accept`.

## 1. Migration principle

Existing consumers see:

- No URL change for any endpoint.
- No status-code change for any successful response.
- No removal, rename, or repositioning of any existing JSON field.
- No new required headers on requests.
- No new failure mode unless the consumer explicitly opts into EAT.

EAT support is conveyed by HTTP content negotiation on existing
endpoints. A consumer that never sends an EAT media type in `Accept`
will never receive an EAT response and will never know the feature
exists.

## 2. Per-endpoint behavior

### 2.1 OAI resolver — `GET /id/{OAI}`

| Consumer sends `Accept:` | Resolver returns |
|---|---|
| (absent), `application/json`, `*/*`, or anything not an EAT media type | Legacy JSON response per OAI v1.0 §6. Unchanged. |
| `application/eat+cwt` | CWT body per EAT Profile §11. New behavior. |
| `application/eat+jwt` | JWT body per EAT Profile §11. New behavior. |
| Multiple EAT media types with q-values | Higher q wins; ties go to CWT. |

See [EAT OAI Resolver](./EAT-OAI-RESOLVER-v0.1.md) for the full
behavior contract.

### 2.2 Sigil verify endpoints

The following endpoints on `data.tunnelmind.ai` gain EAT representations:

- `POST /verify/supply_path`
- `POST /verify/ads_txt`
- `POST /verify/ads_txt/batch`
- `POST /verify/ip_type`
- `POST /verify/app_bundle`
- `POST /verify/supply_chain`
- `POST /verify/adscert`

All currently return Sigil verdict JSON. Under EAT content negotiation
they additionally return an EAT token carrying the verdict + ATAP
receipt (as a submodule) + behavioral claims (when available).

| Consumer sends `Accept:` | Endpoint returns |
|---|---|
| (default) | Existing Sigil verdict JSON, plus the existing ATAP receipt download URL in the response body. Unchanged. |
| `application/eat+cwt` | CWT carrying the verdict, the ATAP receipt as `submods["atap-receipt"]`, and the relevant behavioral claims. |
| `application/eat+jwt` | JWT equivalent. |

### 2.3 ATAP witness — `POST /atap/witness`

Today the witness endpoint returns the freshly minted receipt as a
JSON manifest plus a downloadable ZIP. Under EAT content negotiation
it additionally returns a CWT/JWT in which the manifest is carried as
the `atap-receipt` submodule.

This is the closest existing surface to native EAT issuance — the only
new claim layered on top is `tunnelmind-attestation-strength-tier`,
which is *already* on the manifest and is simply lifted to the outer
EAT.

### 2.4 ATAP keys — `GET /atap/keys`

Returns the published witness key list. Under EAT content negotiation
the resolver returns a CWT bundle, one COSE_Key per registered
witness, anchored by `ueid` and carrying the
`tunnelmind-attestation-strength-tier`. The CWT-form keys bundle is
itself signed by an editor key whose fingerprint is committed to the
`atap` GitHub repository at well-known relative path, allowing
offline key-bundle verification.

The legacy JSON list at `/atap/keys` is unchanged.

## 3. Rollout phases

The implementation work proceeds in three phases, mirroring EAT
Profile Appendix C. Each phase is independently deployable; consumers
see no breaking change at any phase boundary.

### Phase A — library + spec ship

- `@tunnelmindai/eat` published to npm (Apache-2.0).
- Spec, IANA registration draft, this migration plan, and OAI
  resolver update spec on `tunnelmind.ai/eat/profile/v0.1`.
- No production endpoints touched.

**Consumer impact:** none.

### Phase B — single endpoint EAT-enabled

- Pick one Sigil endpoint as the pilot (proposed:
  `POST /verify/supply_path`).
- Wire content negotiation through the request handler.
- Run sigil-harness with an EAT-aware assertion suite.
- Deploy to `data.tunnelmind.ai`.

**Consumer impact:** none unless they opt into EAT on this one
endpoint. The existing JSON response is byte-identical to the prior
deploy for any default request.

### Phase C — full surface EAT-enabled

- All Sigil verify endpoints, the OAI resolver, the ATAP witness
  endpoint, and the ATAP keys endpoint.
- Add the EAT media types to the published API documentation at
  `tunnelmind.ai/docs/`.
- Reference verifier `verify-eat.sh` published alongside the existing
  `verify.sh`.

**Consumer impact:** still none for default requests. Consumers who
*want* RATS-style attestation start opting in.

## 4. Versioning + deprecation policy

This document covers the v0.1 profile. The legacy JSON representations
on every endpoint above are designated **stable for the lifetime of
v0.1.x** of this profile and for the lifetime of OAI v1.x / ATAP v0.x.

When TunnelMind retires a legacy JSON representation (the earliest
this would happen is the v1.0 publish of the EAT profile and only
after IANA registration), it MUST:

1. Announce the deprecation at least 12 months in advance via
   `tunnelmind.ai/changelog`, the `atap` GitHub repository
   Discussions, and a `Deprecation` HTTP header per [RFC 8594] on
   every affected endpoint.
2. Maintain the legacy representation through the announced window.
3. Provide a one-line code-mod (e.g.
   `Accept: application/eat+jwt`) that lets a consumer move to the
   EAT representation without restructuring their client.

There is no plan to ever remove the OAI v1.0 JSON resolution
shape — the registry is the moat, not the wire format.

## 5. Client guidance

A new consumer building against TunnelMind today can:

- Use the legacy JSON path and never touch EAT — fully supported.
- Use the EAT path from day one — request `application/eat+jwt` for
  web/dev work, `application/eat+cwt` for high-throughput paths.
- Mix — JSON for cheap reads, EAT when an audit trail is needed.

A consumer migrating from JSON to EAT should:

1. Add `@tunnelmindai/eat` (or any EAT library) to their stack.
2. Change one `Accept` header at a time, starting with the lowest-
   traffic endpoint.
3. Verify the EAT signature on every response (don't trust the bytes
   without verifying the COSE_Sign1).
4. Compare the EAT claim values against the legacy JSON fields for a
   sample period; the equivalence is documented in EAT Profile §10.
5. Switch over at their own pace.

## 6. Risks acknowledged

- **Body-size growth.** EAT bodies are larger than the equivalent
  JSON when they carry submodules. The CBOR serialization mitigates
  this for the receipt-carrying case; the JWT path will be ~40–60%
  larger than the legacy JSON. Consumers with bandwidth constraints
  should prefer CWT.
- **Verification complexity.** A consumer that ignores the EAT
  signature is no better off than they were with the legacy JSON.
  Verification is the entire value. The reference verifier is the
  recommended path; libraries beyond `@tunnelmindai/eat` are welcome.
- **CBOR keys may shift.** Per the IANA registration draft, the
  private-use CBOR keys in EAT Profile §9 are placeholders. A
  consumer that hard-codes the integers MUST re-pin when v0.2
  publishes. Using the JSON names (string-keyed claims) sidesteps
  this; the JSON names are stable.

## 7. References

- [EAT Profile v0.1](./EAT-PROFILE-v0.1.md)
- [EAT OAI Resolver](./EAT-OAI-RESOLVER-v0.1.md)
- [EAT IANA registration draft](./EAT-IANA-REGISTRATION-v0.1.md)
- [ATAP v0.1.2](./ATAP-v0.1.md)
- [OAI v1.0](./OAI-STANDARD-v1.md)
- [RFC 8594] — The Deprecation HTTP Header Field

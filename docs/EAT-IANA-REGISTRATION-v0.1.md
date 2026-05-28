# IANA registration request — TunnelMind EAT Profile v0.1

**Status:** DRAFT. Not yet submitted to IANA.
**Companion to:** [EAT Profile v0.1](./EAT-PROFILE-v0.1.md)
**License:** CC BY 4.0.

This document is the registration template for the six TunnelMind-
specific claims defined in §9 of the EAT Profile, formatted to match the
expectations of the EAT Claims Registry described in [RFC 9711] §10. It
is not itself a registration: it is the source text from which
registration entries are taken if and when TunnelMind submits the
profile to IANA.

## A. Profile URI registration

Per [RFC 9711] §10 (EAT Profiles Registry):

| Field | Value |
|---|---|
| Profile URI | `urn:tunnelmind:eat-profile:v0.1` |
| Description | TunnelMind EAT Profile — serialization of ATAP receipts and Scry cross-lens enrichments as an Entity Attestation Token. ATAP receipt is carried as a submodule; six TunnelMind-specific claims layer on top. |
| Profile specification | `https://tunnelmind.ai/eat/profile/v0.1` |
| Reference verifier | `@tunnelmindai/eat` (planned), `verify-eat.sh` (planned) |
| Change controller | TunnelMind |
| Contact | `standards@tunnelmind.ai` |

## B. Claims registrations

Six claims. Each one carries: JSON name, CBOR key (requested, in the
private-use range pending IANA assignment), value type, claim
description, change controller, and reference.

The numeric CBOR keys below are *requested*; final values will be
assigned by IANA at registration time. Implementations conforming to
this draft MUST use the requested values; implementations conforming
to a post-IANA published version MUST use the assigned values.

### B.1 `tunnelmind-attestation-strength-tier`

| Field | Value |
|---|---|
| Claim Name | `tunnelmind-attestation-strength-tier` |
| Claim Description | Trust root the witness service ran under for the period covered by this attestation. Weakest-to-strongest. |
| JWT Claim Name | `tunnelmind-attestation-strength-tier` |
| CWT Claim Key | -65531 (requested, private-use) |
| Claim Value Type | text string |
| Permitted Values | `"self-asserted"`, `"software"`, `"tee-tpm"`, `"silicon-root"` |
| Change Controller | TunnelMind |
| Specification Document(s) | `https://tunnelmind.ai/eat/profile/v0.1` §9.1 |

### B.2 `tunnelmind-oai-entity-ref`

| Field | Value |
|---|---|
| Claim Name | `tunnelmind-oai-entity-ref` |
| Claim Description | The canonical OAI (Observed Actor Identifier, OAI v1) of the entity this attestation concerns. |
| JWT Claim Name | `tunnelmind-oai-entity-ref` |
| CWT Claim Key | -65532 (requested, private-use) |
| Claim Value Type | text string, matching pattern `^OAI-[0-9]{4}-[0-9]{7}$` |
| Change Controller | TunnelMind |
| Specification Document(s) | `https://tunnelmind.ai/eat/profile/v0.1` §9.2 |

### B.3 `tunnelmind-behavioral-consistency-score`

| Field | Value |
|---|---|
| Claim Name | `tunnelmind-behavioral-consistency-score` |
| Claim Description | How consistent the entity's behavior in the observation window is with its historical baseline. 1.0 = perfectly consistent; 0.0 = total deviation. |
| JWT Claim Name | `tunnelmind-behavioral-consistency-score` |
| CWT Claim Key | -65533 (requested, private-use) |
| Claim Value Type | floating point, range [0.0, 1.0] |
| Change Controller | TunnelMind |
| Specification Document(s) | `https://tunnelmind.ai/eat/profile/v0.1` §9.3 |

### B.4 `tunnelmind-observation-depth`

| Field | Value |
|---|---|
| Claim Name | `tunnelmind-observation-depth` |
| Claim Description | How much history backs the attestation. Carries first-observed timestamp, total-sessions count, and observation-window-days. |
| JWT Claim Name | `tunnelmind-observation-depth` |
| CWT Claim Key | -65534 (requested, private-use) |
| Claim Value Type | map / JSON object |
| Change Controller | TunnelMind |
| Specification Document(s) | `https://tunnelmind.ai/eat/profile/v0.1` §9.4 |

Map members:

| Member name | Type | Required |
|---|---|---|
| `first-observed` | text string, RFC 3339 date-time | yes |
| `total-sessions` | non-negative integer | yes |
| `observation-window-days` | positive integer | yes |

### B.5 `tunnelmind-deviation-flags`

| Field | Value |
|---|---|
| Claim Name | `tunnelmind-deviation-flags` |
| Claim Description | Named behavioral anomalies detected during the observation window. Empty array = clean. |
| JWT Claim Name | `tunnelmind-deviation-flags` |
| CWT Claim Key | -65535 (requested, private-use) |
| Claim Value Type | array of text strings |
| Change Controller | TunnelMind |
| Specification Document(s) | `https://tunnelmind.ai/eat/profile/v0.1` §9.5 |

Initial value enum (extensible):

- `infrastructure-change`
- `cadence-shift`
- `coordination-pattern`
- `known-malicious-association`
- `credential-rotation-anomaly`

### B.6 `tunnelmind-graph-context`

| Field | Value |
|---|---|
| Claim Name | `tunnelmind-graph-context` |
| Claim Description | The entity's position in the TunnelMind reputation graph: known associations count, malicious adjacency score, optional cluster id. |
| JWT Claim Name | `tunnelmind-graph-context` |
| CWT Claim Key | -65536 (requested, private-use) |
| Claim Value Type | map / JSON object |
| Change Controller | TunnelMind |
| Specification Document(s) | `https://tunnelmind.ai/eat/profile/v0.1` §9.6 |

Map members:

| Member name | Type | Required |
|---|---|---|
| `known-associations` | non-negative integer | yes |
| `malicious-adjacency-score` | float [0.0, 1.0] | yes |
| `cluster-id` | text string | no |

## C. Media types

This profile does NOT register new media types. It uses the existing
EAT media types registered by [RFC 9782]:

- `application/eat+cwt`
- `application/eat+jwt`

## D. Submission plan

When TunnelMind elects to submit this registration:

1. File an internet-draft (`draft-tunnelmind-eat-profile-00`) carrying
   §A and §B verbatim, with the body of the EAT Profile spec inlined as
   informative reference.
2. Request expert review per [RFC 9711] §10.
3. On approval, the CBOR keys in §B may shift from the private-use
   placeholders to assigned values; the JSON names are preserved
   verbatim per [RFC 9711] §7.1.
4. Publish `v0.2` of the EAT Profile reflecting the assigned keys.
   Implementations of `v0.1` continue to work until the v0.2 grace
   window closes.

Until submission, this document is the canonical claim-allocation
ledger and SHOULD be updated whenever the EAT Profile spec adds,
removes, or renames a claim.

## E. References

- [RFC 9711] — The Entity Attestation Token (EAT)
- [RFC 9782] — EAT Media Types
- [EAT Profile v0.1] — `https://tunnelmind.ai/eat/profile/v0.1`
- [OAI v1] — `https://tunnelmind.ai/oai/standard`
- [ATAP v0.1.2] — `https://tunnelmind.ai/atap/standard`

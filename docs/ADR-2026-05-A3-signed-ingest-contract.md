# ADR — A3: freeze the signed-ingest wire contract at v1.0.0

| | |
|---|---|
| **Status**     | Accepted |
| **Date**       | 2026-05-30 |
| **Workstream** | A3 — parallel H1 item of the 2026-05-22 thesis-sharpening pivot |
| **Authors**    | Josh Moore + Claude |

## Context

`POST /api/v1/ingest` on `ingest.tunnelmind.ai` is the **only** path that adds a row to the Scry corpus that is provenance-trustable. Today the producer is Familiar (the Rust sensor binary running on the bootstrap fleet of 5 nodes — see [project_fleet_scaling](../../Obsidian%20Vault/Claude%20Memory/project_fleet_scaling.md)). Tomorrow it will also be:

- **H2 D6** — productized Familiar fleet on commodity hardware
- **H2 D7** — contribute-and-earn signed-submission path (third-party agents / Familiar instances submit signed records for credit)
- **H3** — Rust microkernel sensor with attestation pushed to silicon

All three future producers must speak the *same* wire format the bootstrap Familiar speaks today, or we either fork the registry, fork the verifier, or break archived signatures. None of those is acceptable. This ADR captures the wire format Familiar emits today and pins it at semver **v1.0.0** so producer evolution stays additive, not breaking.

The contract has been stable since P19 (October 2025) — eight months of production traffic, ~500K observations archived to R2 against the same canonicalization rules, zero schema drift. The frozen version IS what's already running; no behavior change.

## The contract

### Wire shape

```http
POST /api/v1/ingest
Authorization: Bearer {INGEST_TOKEN}      # optional shared transport gate
Content-Type: application/json

{
  "records": [
    {
      "record": {
        "id":             "<uuid v4>",
        "ts_ms":          <int>,
        "node_id":        "<string>",
        "source_ip":      "<ipv4 or ipv6>",
        "source_port":    <int>,
        "dest_port":      <int>,
        "protocol":       "<ssh|http|https|smtp|ftp|telnet|redis|mongodb|elasticsearch|mysql>",
        "banner_sha256":  "<64 hex>",
        "payload_sha256": "<64 hex>",
        "payload_len":    <int>,
        "duration_ms":    <int>,
        "tls_ja4":        "<string|null>",
        "metadata":       <object|null>
      },
      "signature":   "<128 hex — Ed25519 over canonical(record)>",
      "node_pubkey": "<64 hex — Ed25519 public key, 32 bytes>"
    }
    /* up to 1000 records per batch */
  ]
}
```

Per-record verdict + a batch summary are returned with HTTP 202. The schema lives in `scry-ingest/openapi.yaml`; the JSON Schema for the signed record is published at `https://tunnelmind.ai/standards/signed-observation/v1.json`.

### Canonicalization

The signed bytes are the **compact UTF-8 JSON serialization of `record`**:

- No whitespace between tokens.
- Field order is the struct's declared order in Familiar's Rust type. JS verifier preserves the order through `JSON.parse → JSON.stringify` (both no-whitespace by default).
- No trailing newline.
- `metadata` may be `null` or an object; if an object, keys are in insertion order from Rust's `serde_json`.

This is the **only** load-bearing piece of the contract. Any drift here invalidates archived signatures, so we treat it like a wire-format hash — frozen forever at v1.0.0.

### Identity

`node_pubkey` is the producer identity. The registry (`node_registry` table) does not record *what kind* of producer it is — Familiar, microkernel, third-party — only that the pubkey is enrolled and not revoked. This is the load-bearing producer-agnosticism: H2 D7's contribute-and-earn path enrolls third-party pubkeys against the same registry, no new endpoint, no new signing protocol.

## Versioning policy

Semver applied to the **wire format**, not the worker code:

| Change | Bump | Example |
|---|---|---|
| Add a sibling field to the envelope (next to `records`) | MINOR | `envelope_version`, `batch_priority` |
| Add an optional response field | MINOR | a new field on `verdicts[].*` |
| Add a new value to the `protocol` enum | MINOR | adding `postgres` |
| Add a new optional field on `record` *that current Familiars never emit* | MINOR ⚠️ | But it must remain optional forever; old verifiers must still verify. |
| Add a new **required** field on `record` | MAJOR | bumps to v2.0.0; all producers must update |
| Change canonicalization rules | MAJOR | forks the corpus — strongly avoided |
| Remove or rename a required field | MAJOR | strongly avoided |
| Tighten validation that previously passed | MAJOR | strongly avoided |
| Loosen validation | PATCH | bug fix |

**The default disposition for the next two years is MINOR or PATCH only.** A MAJOR bump means every producer in the wild (commodity Familiars, microkernels, contribute-and-earn third parties) has to update — which is the cost we accept by issuing a v1.

### How clients detect server version

Every `/api/v1/ingest` response carries:

```
Sec-Tunnelmind-Ingest-Version: 1.0.0
```

Clients SHOULD warn if the server major differs from theirs; MUST refuse to send records signed against a major they can't speak.

### Producer evolution path

| Producer | Status | Wire change required |
|---|---|---|
| Familiar (Rust, bootstrap fleet) | live, v1 | none |
| Familiar on commodity hardware (H2 D6) | planned | none |
| Contribute-and-earn third parties (H2 D7) | planned | none beyond enrolling pubkey |
| Microkernel + iSIM identity (H3) | speculative | `metadata.attestation` slot — already accepted as object |

`metadata` is the deliberate forward-compatibility slot: it's typed as a free-form object, so a microkernel producer can include `{attestation: {kind: "tpm2-quote", evidence: "..."}}` today and a future evaluator can read it without a wire-version bump.

## Consequences

- **No behavior change at v1.0.0 ship time.** The contract pin is descriptive of what's already running; the only code changes are the version-header emission and a known-vector regression test (so future canonicalization changes break the build, not the corpus).
- **The 2,594 SSPs + 10K publishers from D1 already carry no Ed25519 signature** — they came from public crawls. This ADR explicitly does NOT apply to crawl-derived data; the signed-ingest contract is for first-party sensor evidence only.
- **R2 archive is the audit trail** — every `{record, signature, node_pubkey}` lands in R2 keyed by `batch_id/record_id`. Every signature is replayable against the v1 verifier indefinitely.
- **Familiar will not be rebuilt** for this ADR. The v1 freeze IS what Familiar already emits.
- **A future ADR-A4 (extend OAI to device identity)** will define how `node_pubkey` registration may *additionally* carry an OAI claim — that is an extension on the registry side, not a wire-format change.

## Cross-references

- `scry-ingest/openapi.yaml` — the OpenAPI form of this contract (now `info.version: 1.0.0`)
- `scry-ingest/src/verify.js` — the canonicalization implementation
- `scry-ingest/test/verify.test.js` — the cross-impl test against the real Familiar binary
- `scry-ingest/test/wire-vector.test.js` — frozen-vector regression test added with this ADR
- `https://tunnelmind.ai/standards/signed-observation/v1.json` — published JSON Schema for `record`
- [project_fleet_scaling](../../Obsidian%20Vault/Claude%20Memory/project_fleet_scaling.md) — fleet status
- [tunnelmind_question](../../Obsidian%20Vault/Claude%20Memory/tunnelmind_question.md) — pillar 3 (witnessability) — signed ingest is the on-ramp
- [project_tunnelmind_roadmap](../../Obsidian%20Vault/Claude%20Memory/project_tunnelmind_roadmap.md) — H1 #8 (this), H1 #9 (A4 device identity), H2 #28-29 (D6 Familiar fleet, D7 contribute-and-earn), H3 #34 (microkernel)

# ADR-2026-06-P64 — Do not register API endpoints in the OAI registry; no `Service` `@type`

- **Status:** Accepted (2026-06-08)
- **Context tag:** P64 (GhostRoute fourth lens, entity cross-reference)
- **Supersedes / relates:** [ADR-2026-05-A4-oai-device-identity](ADR-2026-05-A4-oai-device-identity.md), [OAI-STANDARD-v1](OAI-STANDARD-v1.md)
- **Decision owner:** delegated to Claude by Josh (2026-06-08, "do your recommendations")

## Context

P64 added a read-only GhostRoute lens to `GET /v1/entity/{node}` and otherwise
completed the fourth-lens entity cross-reference. The one open sub-item was a
**hard stop**: whether GhostRoute's REST endpoints (and, by extension, API
endpoints in general) should be registered in the OAI registry so they carry a
canonical `OAI-…` identifier.

This is blocked by the standard, not by code. `oai_registry.record` is
schema-locked: per `OAI-STANDARD-v1` §7, every registry entry is JSON-LD with
`@type` **const `ObservedActor`**, and the v1 record schema is **frozen at ship**
(§11). Sensors are explicitly held in a **separate namespace** (§9 — "Sensors …
live in a separate namespace from entity OAIs"). An API endpoint is neither an
observed actor (an entity seen in the corpus) nor a sensor (an attested
observation endpoint). To register one we would have to either bend it into the
`ObservedActor` type (a category error) or introduce a new `Service` `@type`
(a v2 schema break).

## Decision

**Drop it.** API endpoints — GhostRoute's or any TunnelMind product surface's —
are **not** registered in the OAI registry, and we do **not** add a `Service`
`@type` to the standard. The frozen v1 OAI schema is left untouched.

## Rationale

1. **Semantic integrity.** OAI = *Observed Actor* Identifier. Its meaning is "an
   entity observed in the corpus." A product endpoint is a surface we operate,
   not an actor we observed. Minting OAIs for our own endpoints dilutes the one
   thing the identifier is for.
2. **The schema is frozen for a reason.** Adding a `Service` `@type` is a v2
   break to a published, comment-period standard to satisfy a need no customer
   has pulled — the worst trade: protocol churn for an internal convenience.
3. **No identifier gap actually exists.** GhostRoute already has its own
   identifier namespace — receipt ids `GR-YYYY-NNNNNNN`. Sensors have
   `OAI-SENSOR-*`. Endpoints don't need a third namespace.
4. **Agent-first.** An agent doesn't need the *endpoint* to carry an OAI; it
   needs the *verdict the endpoint returns* to carry provenance. That is already
   solved — every verdict-bearing response can emit an Ed25519-signed Receipt
   v1.0 (signed with `AUDIT_SIGNING_KEY`). Provenance rides the receipt, not the
   URL.
5. **Namespace discipline.** Two namespaces (entity OAIs + OAI-SENSOR) are
   already the documented model. A third (`Service`) is sprawl with no
   corresponding demand.

## Consequences

- `OAI-STANDARD-v1` is unchanged; no migration; no comment-period reopen.
- GhostRoute (and all product endpoints) remain identified by their own receipt
  / route conventions; provenance is carried by signed receipts, not by an OAI.
- If a future, *customer-pulled* need to canonically name services emerges, it is
  a deliberate v2 OAI design item (define `Service` `@type` + its attestation
  semantics) — re-opened on demand, not pre-built here.
- P64's hard stop is **closed**.

## Alternatives considered

- **Define a `Service` `@type` now** — rejected: v2 schema break against a frozen,
  published standard for an unpulled need (rationale 2).
- **Reuse `ObservedActor` for endpoints** — rejected: category error that erodes
  the identifier's meaning (rationale 1).

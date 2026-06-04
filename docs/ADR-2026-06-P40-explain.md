# ADR — P40 Phase 9: `/v1/explain` — the signed evidence chain behind a verdict

| | |
|---|---|
| **Status**     | Accepted |
| **Date**       | 2026-06-03 |
| **Workstream** | P40 Phase 9 — verdict explainability |
| **Authors**    | Josh Moore + Claude |

## Context

P40's Phase 9 had no surviving spec — the discovery doc
(`session-notes/P40-discovery.md`) marks it "TBD" and never maps a net-new item
to it. Josh's gate guidance: "what is the best for the agent/human; difficulty
and size don't matter."

Three candidates were weighed (entity timeline; agent event-subscriptions;
verdict explainability). **Explainability won** because it operationalizes the
core thesis — "data that cannot prove where it came from is an opinion, not
evidence" — into one dependable, synchronous call an agent can use *inside* its
decision loop: it learns the verdict AND why, acts defensibly, and emits a
verifiable trail in the same request. It serves agent and human (compliance /
audit) symmetrically, deepens the moat (signed evidence) rather than adding a
delivery convenience, and — unlike event-subscriptions — does not front-run the
already-gated compliance-ledger bet (#56) or contribute-and-earn (#29).
Subscriptions are recorded as the natural follow-on once a customer pulls.

## Decision

`POST /v1/explain/{node}` — same key space and same fused verdict as
`/v1/verify/{node}`, so the explanation can never disagree with the verdict it
explains. It reuses `cross-lens-verify.js`'s exported `fuse()`, `parseNode`,
`DEFAULT_WEIGHTS`, `DEFAULT_THRESHOLDS`, and `ACTOR_HOSTILITY` — no scoring is
reinvented (single source of truth).

It adds a **traced evidence chain**: an ordered array where every claim is
attributed to its origin —

- **scry** — the attested sensor fleet (with `attestation_tier` + issuing OAI),
  each Augur threat feed **named individually** (`augur:urlhaus`, not a lumped
  count), Shodan exposed surface;
- **sigil** — sellers.json/ads.txt supply-graph presence + roles;
- **cross_lens** — the co-observation join no single-lens vendor can compute;
- **tracker** — DDG/IAB corpus presence (supplementary).

Each item carries `supports: risk|trust|neutral` and `weight` — the component
weight it contributed to the fused verdict, or `null` for supplementary evidence
that informs the reader but is not scored (tracker). No corpus presence yields a
single honest `none` item, never a fabricated reason
(`feedback_signal_class_separation` discipline: don't manufacture signal).

**Provenance commitment.** The response carries `evidence_digest` — a
`0x`-prefixed sha256 over the canonical evidence array (the repo's receipt-hash
convention) — and the P38 signed receipt commits to `{node, verdict,
trust_score, confidence, evidence_count, evidence_digest}`. The signature
therefore proves the verdict *and* that the returned evidence chain was not
altered. Additive: an unsigned explanation is still returned if the signing key
is absent.

MCP: `explain_verdict`, auto-derived from `openapi.yaml` onto mcp-data
(56→57 tools), `x-tunnelmind-atap: witness`.

## Consequences

- The provenance pillar becomes a first-class, dependable surface: an agent can
  cite *signed* evidence for any verdict, and a human auditor can trace it.
- Pure read + reuse of existing lens primitives → no new storage, no migration;
  ships on the (gated) Worker deploy alone.
- Tracker is surfaced as evidence but deliberately excluded from the scored
  verdict (the verdict stays the Scry × Sigil fusion `/v1/verify` defines), so
  explain and verify never disagree.
- Follow-ons: optional `?token=` expansion of a prior `sigil_token` into its
  evidence chain; agent event-subscriptions when customer-pulled.

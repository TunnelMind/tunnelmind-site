# EAT Profile v0.1 — decision sheet for Josh

**Purpose:** every load-bearing call in the 544-line draft, surfaced for one-pass review. Walk down the table; if the recommendation reads right, you're done. If anything is wrong, mark it and Claude reworks just that section.

**Spec:** `docs/EAT-PROFILE-v0.1.md`
**Recommended action after this sheet:** approve → Claude proceeds with implementation per Appendix C migration plan in the spec.

---

## Calls baked into the draft

| # | Call | My recommendation | Why |
|---|---|---|---|
| 1 | **Form: serialization-over-ATAP, not a replacement.** ATAP receipt stays canonical; EAT is a parallel view over it. | ✅ Keep | Already decided 2026-05-27 per [[project_open_protocol_layer]]. The whole spec is built on this premise. Reversing means a rewrite. |
| 2 | **Two serializations: CBOR/CWT (primary) + JSON/JWT (secondary).** Verifier MUST emit both; relying parties MAY accept either. | ✅ Keep | CBOR for confidential-computing / TEE stacks that already speak it; JSON for web / MCP / debug. Cost is 1 extra serializer; benefit is reaching both audiences. |
| 3 | **Signing algorithm frozen at EdDSA/Ed25519** for both serializations. | ✅ Keep | Reuses existing ATAP key material at `tunnelmind.ai/atap/keys`. Zero new key infra. |
| 4 | **Six TunnelMind-specific claims** (strength-tier, oai-entity-ref, consistency-score, observation-depth, deviation-flags, graph-context). 4 of 6 are NEW signal beyond ATAP. | ✅ Keep | The new signals (consistency-score + observation-depth + deviation-flags + graph-context) ARE the cross-lens enrichment from A2 — they're the differentiated thing. Cutting any of them would weaken the agent value prop. |
| 5 | **Behavioral-consistency-score: algorithm private, output auditable.** Scoring weights stay closed (paid edge); the score itself MUST be reproducible by replay. | ✅ Keep | Exact embodiment of the open-protocol layer / paid-edge line from [[project_open_protocol_layer]]. |
| 6 | **CBOR keys in private-use range [-65536, -1]** pending IANA registration. Spec is explicit that keys may renumber on IANA assignment. | ✅ Keep, defer IANA | Pre-registering is months of process; deferring lets v0.1 ship now. Implementers pin to a version-suffixed URL per §1. |
| 7 | **Submodule structure: outer EAT (verifier-signed) + inner `atap-receipt` (witness-signed); `sensor-evidence` reserved for v0.2+ Familiar.** | ✅ Keep | Lets a relying party verify "the composition" separately from "the evidence." Reservation for sensor-evidence is honest — hardware-anchored claims aren't real until A4 grows hardware roots. |
| 8 | **License: CC BY 4.0** on the spec text (matches ATAP). | ✅ Keep | Consistent with [[project_open_protocol_layer]] — open spec, paid edge. |
| 9 | **Profile URN: `urn:tunnelmind:eat-profile:v0.1`** + URL `https://tunnelmind.ai/eat/profile/v0.1`. | ✅ Keep | Standard URN form. URL doubles as canonical reference. |
| 10 | **Public-comment window TBD.** Spec leaves dates blank. | **Set to 90 days from spec publication.** | Matches ATAP + OAI public-comment windows. Auto-decision unless you want different. |

---

## Calls NOT in the draft — your call before publish

| # | Open question | Default if you don't decide | Cost to revisit |
|---|---|---|---|
| A | **Should we pre-publish to `tunnelmind.ai/eat/profile/v0.1` now**, or wait for implementation? | Publish the spec now as DRAFT; comment window starts on publish; implementation lands during the window. | Low — publishing now sets the canonical URL; tooling can lag. |
| B | **GitHub repo for the spec.** `TunnelMind/eat-profile` mirroring `TunnelMind/atap`? | Yes. Same Apache-2.0 / CC-BY-4.0 split as atap. | Low — repo creation is trivial. |
| C | **Reference verifier**: `@tunnelmindai/eat` npm package + `verify.sh`? Or piggyback on `@tunnelmindai/atap`? | New package — keeps ATAP a stable artifact; lets EAT version on its own cadence. | Medium — bundling later means a breaking-change bump. |
| D | **Endpoint adds**: `data.tunnelmind.ai` verify endpoints add EAT representations via `Accept: application/eat+jwt` etc.? Or new `/v1/eat/...` paths? | Content-negotiate on existing endpoints (per spec §7) — fewer surfaces, no new MCP tools needed. | High to revisit — clients code against the response shape. |

---

## What unblocks once approved

1. **Spec ships** to `tunnelmind.ai/eat/profile/v0.1` (CC-BY-4.0). Open-comment window opens.
2. **GitHub repo** `TunnelMind/eat-profile` published (per Q-B).
3. **Reference verifier scaffold** in `@tunnelmindai/eat` (per Q-C) — CWT decode + JWS verify + submodule recursion.
4. **Endpoint conveyance** on `data.tunnelmind.ai/v1/verify/{node}` and `/v1/sigil/verify/*` — content negotiation per §7.
5. **MCP** — no new tools; existing `cross_lens_verify` and `preflight_should_i_act` learn to emit EAT when the client sends `Accept: application/eat+jwt`.
6. **EAT examples** at `github.com/TunnelMind/eat-profile/examples/` — one for each TunnelMind-specific claim, one for the full composition.

All six are Claude-actionable once you bless the spec; total estimated work: ~2 sessions for spec publish + verifier + endpoint conveyance, longer if you want comprehensive examples.

---

## TL;DR

The draft is consistent with the [[project_open_protocol_layer]] thesis and the A2 cross-lens story. The 10 baked-in calls are all conservative defaults; the 4 open calls (A-D) are short questions. Recommend: **approve all 10 baked-in calls as-is, answer A-D in one round, then Claude proceeds with implementation.**

# ADR — #52: Sigil leads the external narrative

| | |
|---|---|
| **Status**     | ⚠️ SUPERSEDED 2026-06-03 by `ADR-2026-06-P-LAND-trust-leads-narrative.md` |
| **Date**       | 2026-05-30 |
| **Workstream** | Audit candidate #52 from `session_2026-05-24_outside_in_audit` |
| **Authors**    | Josh Moore + Claude |

> **Superseded.** The external narrative now **leads with trust attestation**, with each
> lens (Scry / Sigil / Tracker) given its own equal spotlight rather than Sigil-as-headline.
> Josh's call 2026-06-03: "lead with trust — but everything has its place to shine."
> The reasoning below is preserved as the record of why Sigil-first was tried first.
> See `ADR-2026-06-P-LAND-trust-leads-narrative.md` for the current decision.

## Context

TunnelMind ships three product lines on one signed corpus:

- **Scry** — *who is attacking?* — adversarial actor intelligence.
- **Sigil** — *who can you trust?* — supply-chain verification for AI agents.
- **Tracker Data API** — *who is watching?* — corporate surveillance intelligence.

Internally that trinity is correct: every roadmap item, every data-model decision, every cross-lens fusion call traces back to which lens(es) the work serves. The 2026-05-22 thesis pivot ([[project_tunnelmind_products]]) is structured around it. The Radar landing page surfaces it (`.tm-lens-strip` block, shipped 2026-05-24).

But the 2026-05-24 outside-in audit ([[session_2026-05-24_outside_in_audit]]) found four independent signals that **outsiders don't parse the trinity on first contact** — a cold arrival from Show HN, an `ads.txt verification API` search, an agent crawling our MCP registry entry, or an ad-tech operator hearing about us at a conference all reach a homepage selling a *category* ("intelligence layer for the agentic internet") rather than a *product*.

Three of the lenses have asymmetric outside-in pull:

| Lens   | Cold-arrival pull | Why |
|---|---|---|
| Sigil  | **Strongest** | Present pain (programmatic ad fraud), present budget (~$80B/yr in IVT spend), and a verb form ("verify this ads.txt"). |
| Scry   | Medium | Defensible "actor radar" demo, but the buyer category is crowded and most arrivals don't have a *purchase* need on first contact. |
| Tracker | Niche | Strong for journalists / regulators / researchers; not the agent-buyer wedge. |

The audit also surfaced (#50) that *agents* benefit from the unified cross-lens fan-out, which is now live, but *humans* arriving cold need a single-noun answer to "what does this do?"

## Decision

**Lead the external narrative with Sigil.** Externally, we are the supply-chain verification layer for AI agents in programmatic advertising. The other two lenses are surfaced as *evidence the platform works* — Scry shows the depth of our actor corpus; the Tracker Data API shows the depth of our entity graph — but neither is the headline.

Internally, the three-lens framing is unchanged. Roadmap horizons, ADRs, and engineering decisions continue to operate on the trinity. **The pivot is presentation, not engineering.**

### Concretely

1. **Homepage hero** (tunnelmind.ai `/`) — keep the Scry radar as the live demo because it's still the most visually compelling proof of the corpus, but the H1 / subhead pair moves from *"intelligence layer for the agentic internet"* to a Sigil-first framing along the lines of: *"Verify supply paths before agents bid. Ad-fraud-grade verification, signed receipts, MCP-native."*

2. **`/standards` page** — order is now **Sigil → ATAP → OAI → Scry** rather than the protocol-first order. ATAP is positioned as "the protocol Sigil uses to sign receipts" rather than as a standalone artifact.

3. **GitHub repos** — the consistent product-line tag header (shipped 2026-05-30, see roadmap #38) already does this work *inside* each repo. No additional change.

4. **MCP registry entries** — `ai.tunnelmind/sigil` description should lead the `ai.tunnelmind/*` family; `data` and `scry` descriptions cross-reference Sigil. The `cross_lens_lookup` tool added with #50 sits in `/data` but its description should explicitly say "use this when an agent needs to check a destination before transacting" — the Sigil framing.

5. **Inbound posts** (audit items #48 / #49 still open) — the Show HN / Lobsters / writeup work, when it fires, should lead with a **specific ad-tech verification claim** and the cross-lens evidence behind it, NOT with the platform thesis.

### What this is NOT

- **Not a product-line consolidation.** Scry and Tracker stay as separate product lines with their own roadmaps. The data they produce is needed for Sigil's cross-lens join — without Scry there is no `cross_lens.co_observed`; without Tracker there is no entity graph to resolve Sigil's `seller_domain` against. Removing them would gut the moat.

- **Not a deprecation of the three-lens internal model.** Every PR, ADR, and roadmap entry continues to identify which lens(es) it serves. The Radar lens-strip on the landing page also stays — it's the *frame* the rest of the site reads against once a visitor scrolls past the hero.

- **Not exclusive to one persona.** Agents and humans see the same homepage. The narrative just stops trying to be everything to everyone on first contact.

## Consequences

**Positive:**

- Cold human arrivals from Show HN / search land on a *category they know* (ad fraud / IVT) with a *verifiable demo* (the radar) and a *concrete next step* (`/v1/sigil/verify/ads_txt`).
- Inbound copy work (#48 / #49) gets a forcing function: lead with Sigil, the rest follows.
- The cross-lens moat is more legible: Sigil agents *demand* Scry data; Scry without Sigil is one more "actor radar."

**Negative:**

- Scry's defensive standalone narrative loses headline real estate. The Scry crowd (security researchers, etc.) may take longer to find the right entry point. Mitigated by keeping the radar as the live demo and surfacing Scry through it.
- Tracker arrivals (journalists, regulators) require an explicit secondary page. Mitigated by keeping `/v1/entities` and `/v1/domains` as first-class API surfaces with their own docs.
- If Sigil's ad-tech wedge stalls (no named reference customer in H1 timeline), the external narrative also stalls — there's no "platform" fallback the way the previous framing offered.

**Reversibility:** High. The decision lives in copy + a handful of page-order changes. Reversing means re-ordering the same copy. The engineering substrate is unchanged.

## Cross-references

- [[project_tunnelmind_products]] — the three-lens thesis (rewritten 2026-05-22)
- [[session_2026-05-24_outside_in_audit]] — the audit that surfaced this decision
- [[project_a2_cross_lens_join]] — the moat that makes the three lenses better together
- [[project_d1_buy_side_graph]] — the Sigil-specific data work that produced the wedge case
- ADR-2026-05-A2-cross-lens-join.md — the engineering ADR for the join itself

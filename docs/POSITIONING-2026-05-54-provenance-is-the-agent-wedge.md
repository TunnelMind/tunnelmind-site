# Positioning — #54: provenance is the agent-buyer wedge, not the human funnel

| | |
|---|---|
| **Status**     | Decided 2026-05-30 |
| **Workstream** | Audit candidate #54 from `session_2026-05-24_outside_in_audit` |
| **Authors**    | Josh Moore + Claude |

## TL;DR

TunnelMind's hardest-to-copy differentiator is **provenance / witnessability** — every cross-lens verdict carries a signed receipt and an issuer OAI, every Familiar observation is canonical-byte signed, every ATAP event is hash-chained. That sequence of design choices is a real moat against the broader "intelligence layer" category.

It is *also* the wrong thing to lead with for cold humans on the website. **Provenance is an agent-buyer wedge, not a human funnel.**

## Why provenance doesn't pull humans

The audit asked: "what wedge gets a curious human past the homepage in 30 seconds?" Provenance answers were the lowest-scoring across every candidate:

- *"Every verdict is signed."* — A skeptical human reads this as "fine, but does it work?"
- *"Tamper-evident receipts."* — Hard to map to a problem they have.
- *"OAI-resolvable issuer."* — Requires explaining what OAI is before the value is visible.
- *"You can re-verify the chain offline with the bundled verify.sh."* — Pure security-engineer pitch.

Humans on Show HN, in search results, or coming from a conference don't carry a *receipt-verification* need into their first 30 seconds. They carry a *what does this do for me* need. Per [[ADR-2026-05-52-sigil-leads-external-narrative]], that's where Sigil leads.

## Why provenance *is* the agent-buyer wedge

The buyer who has *already* decided to deploy agents — an ad-tech vendor wiring an MCP integration, a compliance officer scoping AI-action governance, an enterprise architect choosing which agent-platform contracts to sign — has the opposite need profile:

- They are accountable to a regulator, an auditor, or an SLA-paying customer for what the agent does.
- They cannot accept *"trust me, I checked"* from any agent or any tool the agent calls.
- They will be asked, after the fact, to *prove* the agent's behavior. A signed, replayable, hash-chained record of every consultation is the thing they were going to have to build anyway.

For that buyer, every line of `provenance` copy is *load-bearing*. The signed-ingest wire contract ([[project_a3_signed_ingest_contract]]), ATAP receipt format ([[project_p38_atap]]), and the cross-lens witness chain ([[project_a2_cross_lens_join]]) compose into a literal answer to a literal compliance question.

This is also why **strategic bet #56** (compliance-grade agent-action ledger) is gated on a named compliance-mandate prospect rather than built speculatively — without that named customer, the *paid* version of provenance hasn't found its buyer yet. The *open-protocol* version (ATAP + verify.sh + standards/signed-observation/v1.json) is shipped and is the credibility floor under the buyer narrative.

## What this means in practice

| Audience          | Lead with                                  | Provenance role |
|---|---|---|
| Cold humans       | Sigil / ad-tech verification               | Mentioned once, evidence-grade footnote ("signed receipts, MCP-native") |
| Agents (cold)     | `cross_lens_verify` / `cross_lens_lookup`  | Implicit — the receipt is *in the response*, no copy needed |
| Agent-deployers   | Pre-flight hook (#55) + signed receipts    | Headline differentiator |
| Compliance buyers | Compliance-grade ledger (#56, gated)       | Whole product |
| Regulators / press | "We never asked agents to trust us."       | Headline differentiator |

The headline copy on `/` and `/standards` (per ADR #52) does *not* lead with provenance. The agent-facing tool descriptions, the MCP registry cards, and the future agent-deployer landing page (a future audit-candidate item — not yet filed) *should* lead with provenance because that audience has already opted into the relevant problem.

## What we are NOT saying

- **Provenance is not "nice to have."** It is the structural moat against the broader category. Removing it would collapse the buyer narrative even if the verification surface itself stayed identical.
- **Provenance is not just for compliance.** Agent-platform vendors (the Anthropic-category buyer per [[feedback_claude_first]]) need it whether or not regulation is on the table — they need it because *their* customers will ask.
- **Provenance is not a near-term revenue line on its own.** It enables H1 #56 if/when the gate condition fires (named compliance-mandate prospect), but until then it is *credibility infrastructure*, not a paid SKU.

## Cross-references

- [[ADR-2026-05-52-sigil-leads-external-narrative]] — what humans see on first contact
- [[tunnelmind_question]] — pillar 3 (witnessability) names provenance as the gap
- [[project_a3_signed_ingest_contract]] — the wire-level provenance floor
- [[project_p38_atap]] — the receipt format provenance rides on
- [[project_a2_cross_lens_join]] — the cross-lens receipt chain (`cross_lens:verified` witness events)
- [[project_tunnelmind_roadmap]] strategic bet #56 — the gated paid form of this positioning

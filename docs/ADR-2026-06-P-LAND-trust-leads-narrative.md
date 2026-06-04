# ADR — Trust attestation leads the external narrative; each lens shines in its place

| | |
|---|---|
| **Status**     | Accepted |
| **Date**       | 2026-06-03 |
| **Workstream** | P-LAND landing rewrite + roadmap/strategy refresh |
| **Authors**    | Josh Moore + Claude |
| **Supersedes** | ADR-2026-05-52 (Sigil leads the external narrative) |

## Context

ADR-52 (2026-05-30) decided the external narrative should **lead with Sigil** — the
supply-chain verification wedge — with Scry and Tracker demoted to "evidence the platform
works." The reasoning was sound at the time: a cold human arrival needs a single-noun
answer, and Sigil has the strongest cold-arrival pull (present ad-fraud pain, present
budget, a verb form).

Since then two things changed the calculus:

1. **P-LAND shipped** (2026-06-03). The landing now leads with the unifying thesis —
   *"The internet has no memory. We're building one."* / **Trust Attestation Layer** — then
   gives Scry / Sigil / Tracker each an equal panel in the `.tm-lens-strip`, then surfaces
   the cross-lens join (the moat). The strategy + roadmap docs were refreshed to the same
   trust-attestation framing the same day.

2. **Josh's call (2026-06-03):** *"I want to lead with trust — I think that is the key to
   all this — but I want everything to have its place to shine."* Trust attestation is the
   roof over all three lenses; it is also the most honest description of the product (the
   signed observation is the atom; the cross-lens verdict + receipt is the thing only we
   can produce). Leading with one lens undersells the moat, which **is** the join.

The tension ADR-52 was solving — "outsiders don't parse the trinity on first contact" —
is real, but the fix is not to subordinate two lenses to a third. It is to lead with the
*unifying* idea (trust) and let each lens be unmistakably itself underneath it.

## Decision

**Lead the external narrative with trust attestation.** We are the trust attestation layer
for the agentic internet: one correlated graph of *who is attacking, who is watching, and
who can be trusted*, where every verdict carries a signed, replayable receipt.

**Each lens shines in its own place** — Scry, Sigil, and Tracker are presented as three
equal, named apertures on one graph, not as headline-plus-evidence. The cross-lens join is
the flagship: the verdict no siloed incumbent can compute.

Internally nothing changes — the three-lens model still drives every roadmap item, ADR, and
fusion call. As with ADR-52, **the decision is presentation, not engineering.**

### Where each lens shines (so "everything has its place")

| Lens | Its spotlight | Primary audience |
|---|---|---|
| **Scry** | The live radar — the visceral, real-time proof the corpus is real. | Security / SOC, the curious |
| **Sigil** | The ad-tech wedge — present pain, present budget, the verb "verify this supply path." | AI media-buying agents, ad-tech operators |
| **Tracker** | Surveillance transparency — who is watching / paying whom on the open web. | Journalists, regulators, researchers |
| **Cross-lens** | The roof and the flagship — fused verdict + signed receipt; the join only we can compute. | Agents (Claude first), compliance buyers |

### Concretely (revisiting ADR-52's five actions under the new lead)

1. **Homepage hero** — ✅ **done via P-LAND.** Leads with the trust thesis + "Trust
   Attestation Layer" eyebrow; the three-lens strip gives each lens an equal panel; the
   cross-lens join is named as the moat. Supersedes ADR-52's Sigil-first H1.
2. **`/standards` page** — order reflects the trust thesis: lead with the **attestation
   rails** (Receipt Format v1.0, ATAP, OAI, EAT) as "how trust is signed," then the lenses
   that produce the verdicts. (ADR-52's Sigil→ATAP→OAI→Scry order is retired.) Copy-only;
   not yet executed — tracked as follow-up.
3. **GitHub repos** — unchanged. The three-lens tag header (roadmap #38) already gives each
   lens its place inside every repo.
4. **MCP registry entries** — each server description stands on its own (Scry / Data /
   Sigil), unified by the trust framing rather than leading the family with Sigil. The
   `cross_lens_*` tools are described as "check whether a destination can be trusted before
   transacting." Minor copy follow-up; sampled descriptions are already agent-decision
   oriented (P40 Phase 6 finding).
5. **Inbound posts (#48 / #49)** — still lead each *channel* with its most searchable,
   specific claim (e.g. "ads.txt / sellers.json verification API" for SEO), but tie the
   claim back to the trust-attestation thesis and the cross-lens evidence. Both/and, not
   Sigil-only.

## What this is NOT

- **Not a demotion of Sigil.** Sigil remains the revenue wedge with the strongest cold
  pull; it gets a full spotlight. Trust leading does not mean Sigil whispering.
- **Not a product-line consolidation.** Three lenses, three roadmaps; the data each
  produces is what makes the cross-lens join possible.
- **Not a return to category-selling.** "Trust attestation layer" is a product claim with a
  demo (the radar), a verb (verify), and a receipt — not the old vague "intelligence layer."

## Consequences

**Positive:** the homepage tells the true story (the moat is the join, not one lens); each
lens has a clear, non-competing spotlight; the framing matches the shipped P-LAND landing,
the refreshed STRATEGY/ROADMAP docs, and the public /roadmap page (all 2026-06-03), so the
whole surface is finally coherent.

**Negative:** "trust attestation layer" is one abstraction step above "ad-fraud
verification," so the most search-ready single claim still has to come from the per-channel
inbound copy (#48/#49), not the homepage H1. Mitigated by keeping Sigil's concrete verb
forms in the lens panel and inbound posts.

**Reversibility:** High — copy + a little page ordering, same as ADR-52.

## Cross-references

- ADR-2026-05-52-sigil-leads-external-narrative.md — superseded by this ADR
- `Claude Memory/tunnelmind_question.md` — the trust thesis (north star)
- `Claude Memory/project_tunnelmind_products.md` — three lenses, the cross-lens join is the product
- `TunnelMind/session-notes/2026-06-03-P-LAND.md` — the landing rewrite this ratifies
- `TunnelMind/docs/STRATEGY-2026-05.md`, `ROADMAP-2026-05.md` — refreshed to this framing

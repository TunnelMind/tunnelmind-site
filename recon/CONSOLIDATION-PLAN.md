# recon/CONSOLIDATION-PLAN.md — Sprawl map (Phase 1 check 8)

> Honest finding: **the site is not heavily sprawled.** It is disciplined — one homepage,
> a distinct manifesto, a tight product/standards set, and 6 legal pages. The big wins here
> are **truth + single-sourcing**, not mass deletion. Page-count reduction is modest and real.

## Current surface
- SPA routes: **17** (11 content + 6 legal)
- Static published pages: **9**
- Repo-only docs: many (ADRs, specs, 1 relic)

## Merge / delete / keep

| Action | Target | Rationale | Δ |
|---|---|---|---|
| **DELETE** | `docs/audit-2026-04.md` | Pre-pivot relic (Shadow Graph, Alloy, Stripe Connect, payout, contribution_ledger). Repo-only (not served), but it is the single largest concentration of killed concepts on the repo surface and misleads anyone reading `docs/`. Move to vault `Archive/` or delete. | −1 doc |
| **MERGE (review)** | `/whitepapers` → `/standards` | `Whitepapers.jsx` is thin and overlaps the `/standards` index (both point at ATAP/OAI/receipt specs). Folding it removes a redundant nav item and one route. **Gated on Q5.** | −1 route (if approved) |
| **KEEP** | `/vision` (Landing.jsx) | Distinct long-form manifesto, not a duplicate of the radar homepage. | 0 |
| **KEEP** | all 6 legal pages | Each serves a distinct legal purpose. (Terms still needs the H4 truth fix, not deletion.) | 0 |
| **KEEP** | all 9 static standards pages | Live, canonical, on-thesis (tier ordering correct). | 0 |
| **KEEP** | `tunnelmind-radar` repo | 301'd alias; out of mutation scope (Q3). | 0 |

## Net page count
- Before → after: **17 → 16 routes** (if `/whitepapers` folds), **+ 1 repo relic deleted**.
- This satisfies §10 "page count is down" modestly and honestly. I will **not** manufacture deeper cuts the content doesn't justify.

## Orphans / dead pages
- No orphan SPA routes found (all reachable from `TopNav`/`Footer`).
- No duplicate marketing pages (the `/` vs `/vision` pair is intentional: demo vs essay).
- `sitemap.xml` is *incomplete* (M5), the inverse problem — under-listing real pages, not over-listing dead ones.

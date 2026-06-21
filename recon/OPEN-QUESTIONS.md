# recon/OPEN-QUESTIONS.md — needs Josh's decision before Phase 2+

**Q1 — Design system (BLOCKS Phases 3 & 4). 🔴**
§2 instructs Cinzel / IBM Plex Mono / cosmic near-black / six sacred-geometry primitives / Golden-Spiral tier mapping. Vault + repo + live show this **P-GEO design was reverted 2026-06-04** to slate-navy + Crimson Pro + JetBrains Mono, symbols removed (`session_2026-06-04_site_revert`; CSS revert comments). **Which is authoritative?**
- *Recommended:* current reverted design is canonical → build the hero/assets in slate-navy + Crimson Pro + JetBrains Mono; do **not** rebuild the golden-spiral/sacred-geometry hero. (§2's design block is stale, not authoritative.)
- *Alternative:* you want P-GEO back — then that is a separate design decision, not part of this recon.

**Q2 — Visual models (BLOCKS Phase 4). 🔴**
`VISUAL_MODEL_1` and `VISUAL_MODEL_2` are still unset. Name the two tools/CLIs/APIs (and any auth) before Phase 4. Not needed for Phases 0–2.

**Q3 — Mutation scope. 🟠**
Confirmed read-only inventory covers `tunnelmind-site` (+ radar/chat/mcp noted). Mutation target = **`tunnelmind-site` only**? `chat.tunnelmind.ai` and `mcp*.tunnelmind.ai` have **no source repo in `/home/o2k`** (Workers in data-api/scry-server). `tunnelmind-radar` (`radar.git`) is 301'd. Include any of these, or site-only?

**Q4 — ATAP canonical expansion. 🟡**
Confirm **"Agent Trust Attestation Protocol"** (matches the published standard) as the single source. Then `Whitepapers.jsx` ("Adversarial Telemetry…") and the stray "Agentic" in index.html get corrected to it.

**Q5 — `/whitepapers` fate. 🟡**
Fold into `/standards` (removes one route + nav item) or keep distinct? (See CONSOLIDATION-PLAN.)

**Q6 — Privacy Policy VPN clause. 🟠**
`PrivacyPolicy.jsx:23` still says a WireGuard key/tunnel IP is "required to operate the VPN." NetShell/VPN is shelved. Is there still any VPN/WireGuard offering that needs this clause, or remove it?

**Q7 — Checkout key-reveal bug (H2). 🔴**
I can't run a live paid Stripe checkout. Does a real post-payment redirect currently show the one-time API key? If you confirm it's broken (hash param stripped by the clean-URL redirect), the fix is in scope for Phase 2 (`checkout.js` + `Pricing.jsx`).

**Q8 — Single-source-of-truth module. 🟡**
OK to add **one** constants module (e.g. `src/config/facts.js`) for the lens list, tier ordering, MCP tool counts, and stat fallbacks, referenced everywhere instead of duplicated? (No new dependency; just consolidation.)

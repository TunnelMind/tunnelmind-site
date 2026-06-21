# recon/STALENESS-REPORT.md — Phase 1 findings (checks 1–7, 10)

> Severity: 🔴 high · 🟠 medium · 🟡 low. Each finding = file:line + fix. Read-only; nothing changed.
> Canonical truth = vault (P-LAND framing, 2026-06-04 design revert, three pillars) reconciled against repo + live.

## 🔴 HIGH

**H1 — Design-system anchor (§2) contradicts the live design (blocks Phases 3 & 4).**
§2 says build the hero/assets in Cinzel + IBM Plex Mono + cosmic near-black + six sacred-geometry primitives + Golden-Spiral tier mapping. That is the **P-GEO design, shipped 2026-06-03 and reverted 2026-06-04** (`session_2026-06-04_site_revert`; CSS comments `src/index.css` say so directly). Live design = slate-navy `#0f172a` + Crimson Pro serif + JetBrains Mono, symbols removed. Building §2's hero would re-introduce killed design. → **Decision required, see OPEN-QUESTIONS Q1. Do not act until resolved.**

**H2 — Paid checkout key-reveal likely broken by the hash→clean-URL migration.** `functions/api/checkout.js:62-64` sets `success_url`/`cancel_url` to `https://tunnelmind.ai/#/pricing?checkout=...`. `Pricing.jsx:705-711 readCheckoutParams()` reads the query from `window.location.hash`. But `App.jsx:37` rewrites any `#/…` to a clean URL on load, moving the query into `location.search` and clearing the hash — so the success banner / one-time API-key reveal may never render for a paying customer. → Fix: emit clean `success_url` and read from `location.search` (or read both). **Verify with a real Stripe test checkout** before asserting broken.

**H3 — "observability layer" framing is stale on PUBLIC, agent-facing surfaces.** Canonical is "trust attestation layer for the agentic internet" (P-LAND, 2026-06-03; supersedes "observability layer").
- `public/llms.txt:3` — "The observability layer for the agentic internet" — **live & agent-facing**; contradicts the live `index.html`.
- `scripts/build-route-stubs.js:36` — generates SEO meta with "observability layer" (propagates to all route stubs — edit the generator, re-grep stubs per `reference_route_stub_meta_gotcha`).
→ Fix: paraphrase to the trust-attestation framing; keep the four-lens sentence.

**H4 — Killed "Defender / Team" monthly subscription tiers still in the legal Terms.** `src/pages/legal/TermsOfService.jsx:36, 61, 73` — "The Defender and Team tiers… billed monthly… a first-time Defender subscriber… refund within 14 days of the initial charge." These tiers were killed; the model is $20 Stripe blocks + x402 (Pricing.jsx says "No tiers, no sales calls"). A legal doc describing a nonexistent product. → Fix: rewrite refund/billing clauses to the block + x402 model.

**H5 — "Defender tier" label on the homepage.** `src/pages/Radar.jsx:291, 446-452` — section titled "Defender tier" (copy routes to the $20-block pricing). Contradicts Pricing "No tiers." → Fix: rename (e.g. "Go deeper — the full corpus").

## 🟠 MEDIUM

**M1 — ATAP expanded three different ways.** Canonical (published `public/atap/standard.html`, `docs/ATAP-v0.1.md`, profiles, ai-services.json) = **"Agent Trust Attestation Protocol"**. Outliers: `src/pages/Whitepapers.jsx:6` "**Adversarial Telemetry** Attestation Protocol" (wrong); one stray "**Agentic** Trust Attestation Protocol" in `index.html` (noscript list). → Normalize to "Agent Trust Attestation Protocol".

**M2 — Tracker missing from the Products four-lens registry.** `src/pages/Products.jsx` GROUPS present Scry/Sigil/GhostRoute but no Tracker card; the four-lens model should be representable. → Add a Tracker entry (or a note that it is scaffolded), matching the homepage strip.

**M3 — Drift-prone stats hardcoded / duplicated (single-source candidates).**
- `src/pages/Compare.jsx:354-356` fallbacks `~911K / ~1.7M / ~59K` are behind live (`970,759 / 1,787,537 / 59,212`). Page fetches live so display is fine, but refresh the literals.
- `src/pages/Compare.jsx:521` — "100K publisher relationships" hardcoded in prose.
- MCP tool counts **43 / 12 / 11** repeated in `public/robots.txt` and `index.html` noscript (and §2 claims a stale "~34 across two workers"). → Single-source (see CONSOLIDATION-PLAN §4).

**M4 — Hash-route remnants after the clean-URL migration.** `src/components/shared/Footer.jsx` (`LINKS`/`LEGAL_LINKS` use `/#/…`); `src/pages/Pricing.jsx:237` (`#/api`), `:423` (`#/terms`); `Pricing.AgentCard` `#/api`. They still work via the redirect but are inconsistent and fragile. → Convert to clean `/…` paths.

**M5 — sitemap.xml stale / incomplete.** `public/sitemap.xml` omits `/skills`, `/compare`, `/standards/reconciliation-verdict/v1`, `/standards/compliance-ledger/v1`; every `lastmod` frozen at `2026-05-31`. → Add missing routes; refresh lastmod on changed pages.

**M6 — Privacy Policy references operating "the VPN".** `src/pages/legal/PrivacyPolicy.jsx:23` — "WireGuard public key and assigned tunnel IP (10.10.0.x) — required to operate the VPN." NetShell/VPN is shelved. → Confirm whether any VPN/WireGuard offering remains (OPEN-QUESTIONS Q6); remove or scope the clause if not.

## 🟡 LOW

**L1 — Stale code comments** "observability layer": `Products.jsx:5`, `Landing.jsx:4` (internal only).

**L2 — Partial-revert P-GEO residue in CSS.** `src/index.css:4, 22, 289` comments say "three lens(es)" / "cosmic near-black" (now four lenses, slate-navy); leftover `--geo-line` gold, `--attest-*` ramp, φ-spacing tokens, and `Radar.jsx:97` "P-GEO accent" comment. Tokens are harmless but misleading; clean up comments + unused tokens. **Also: `@fontsource/cinzel` is still a `package.json` dependency though Cinzel was reverted** — dead dep (confirm before removing; Cinzel may still be referenced).

**L3 — `src/lib/radar/initRadar.js:882` `vpn_consumer: 'consumer VPN egress'`** — an observed-actor taxonomy label, not a product claim. **Keep** (noted so it isn't mistaken for a killed-concept hit).

## Killed-concept scan result (check 2)
Full blocklist swept across `src public docs functions index.html scripts`. **No live product framing** for: consumer/privacy VPN (except M6 legal clause + L3 taxonomy label), contribution economy/Alloy, Shadow Graph, closed protocol, crypto token/coin, Stripe Connect/payout. All `Alloy`/`Shadow Graph`/`Stripe Connect`/`payout` hits are confined to the repo-only relic `docs/audit-2026-04.md` (see CONSOLIDATION-PLAN). `investors`/`token` hits are the correct *disclaimers* ("no board, no token, no investor"). **No `ad-tach` typo** anywhere (check 3). "ad-tech" appears only as the industry descriptor for Sigil's customer — allowed.

## Tier-ordering (check 4) — PASS
`self-asserted → software → tee-tpm → silicon-root` correct in `public/atap/standard.html:891`, `ATAP-v0.1.md:383`, and the `--attest-*` CSS ramp. No misordered occurrences found.

## Rune-coupling (check 5) — PASS
Zero `Rune` references in live surfaces. Properly decoupled.

## Link / asset integrity (check 10)
- Hash links (M4) — work via redirect, flagged.
- Checkout redirect (H2) — the one functional risk.
- sitemap gaps (M5).
- No broken-image findings surfaced in the static scan (OG image generated at build).

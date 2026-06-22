# P-SITE-RECON — Phase 4 visual assets

Generated 2026-06-21 on branch `site-recon/2026-06-21`.

## Decision: code-based SVG → PNG (no external image-gen)

Both visual models were left to my judgement (§0 said don't guess; the user
delegated the choice). I chose **hand-authored SVG rendered to PNG via the
existing `sharp` dependency** for both the customer- and investor-facing
assets, rather than naming two external image/diagram tools.

Rationale:
- **Brand fidelity** — pulls exact tokens from `src/index.css` + `src/config/facts.js`
  (slate-navy `#0f172a`, lens colors, Crimson-Pro-class serif + JetBrains-Mono-class
  mono via generic fallbacks). No drift from the live design system, no P-GEO.
- **Reproducible** — pure string templates, deterministic output, byte-stable across
  builds. Same pattern as the existing `build-og-image.js`.
- **Version-controlled & editable** — SVG source ships alongside the PNG; copy/colors
  change in one file.
- **No-big-tech / no external dependency** — consistent with the project's standing
  constraints; no cloud image model in the pipeline.

## Assets

| File | Audience | Message | Source |
|---|---|---|---|
| `public/assets/how-it-works.{svg,png}` | Customer-facing | "One query. Four lenses. One signed verdict." — the product in one frame: `verify(destination)` → Scry/Sigil/Tracker/GhostRoute → cross-lens `ALLOW` verdict + Ed25519 receipt + attestation tier ladder (`self-asserted → software → tee-tpm → silicon-root`). | `scripts/build-brand-assets.js` → `howItWorks()` |
| `public/assets/the-moat.{svg,png}` | Investor-facing | "Four lenses on one graph. The join is the moat." — four lenses feeding one corpus core; callout: the cross-lens join is agent-native, signed, witnessable; open protocol on the edge, the data graph is paid. | `scripts/build-brand-assets.js` → `theMoat()` |

Both are 1600×1000. Regenerate with `npm run build:assets` (also wired into `npm run build`).

## Provenance / integrity

- Lens names + colors + tier order are mirrored from `src/config/facts.js`; a comment
  in the generator notes they must stay in lockstep.
- No third-party model, no stock imagery, no licensed fonts embedded — only generic
  serif/mono fallbacks, so output is reproducible on any builder.
- Every claim on the frames is true of the live product as of 2026-06-21 (four lenses,
  cross-lens verdict, Ed25519 receipts, attestation tiers, open-edge/paid-graph split).

## Not done / open

- These are not yet placed in any page — they exist as standalone share/deck assets.
  If desired, `how-it-works.png` is a natural fit for `/products` or the landing
  "how it works" band, and `the-moat.png` for an investor one-pager. Placement was
  left out of this pass to avoid layout churn in the truth-pass PR; can follow up.

# tunnelmind-site

Frontend for [TunnelMind](https://tunnelmind.ai) — the intelligence API for the agentic internet.

**Stack:** Vite + React 18 · Cloudflare Pages · Supabase

## What TunnelMind is

TunnelMind is the intelligence layer AI agents call before they trust anything on
the internet. Three product lines — one signed corpus, one attestation layer
(ATAP), one developer contract (OpenAPI 3.1 + MCP):

- **Tracker Data API** — *who is watching?* — corporate surveillance intelligence.
- **Scry** — *who is attacking?* — adversarial actor intelligence.
- **Sigil** — *who can you trust?* — supply-chain verification for AI agents.

Consumed by agents (MCP + x402 micropayments) and humans (chat + prepaid API
call blocks).

## What this repo is

The public website at `tunnelmind.ai` — a Vite + React SPA whose landing page is
the live Scry attacker radar. Routes: radar (landing), Vision, Tools, API,
Standards, Roadmap, Pricing, About, and the legal pages. Cloudflare Pages
Functions in `functions/` proxy the corpus APIs and handle Stripe checkout.

## Related repos

- `tunnelmind-data-api` — `data.tunnelmind.ai`: Tracker Data API + all Sigil endpoints (CF Worker)
- `scry-server` — `api.tunnelmind.ai`: the Scry adversarial-actor corpus API (VPS)
- `oai-resolver`, `atap`, `sigil-mcp` — open standards and agent-facing surfaces
- `tunnelmind-legacy` — components retired in the P34 focus alignment (archive)

## Deploy

Push to `main` triggers CI deploy to Cloudflare Pages via `wrangler-action`.

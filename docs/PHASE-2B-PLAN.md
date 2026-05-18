# Phase 2b — Defender tier goes live

The plan for turning the Defender tier from a "join the waitlist" placeholder
into a real, purchasable product. Drafted 2026-05-17.

## Principle

**Build the thing → gate the thing → bill for the thing.** Stripe is the *last*
step, not the first. Selling access to a corpus view that does not yet exist is
selling vapor.

## Pricing (set 2026-05-17)

| Tier | Price | Notes |
|------|-------|-------|
| Free | $0 forever | Radar sample, chat, free API tier, MCP |
| Defender | **$49 / month** | Individual security researcher / small team. Self-serve Stripe checkout. |
| Team / Enterprise | **from $1,500 / month** | Billed annually, custom-scoped. Contact sales. |

Stripe only — no crypto, ever (see memory: `feedback_no_crypto_payments`).

## What the Defender tier unlocks (the gated corpus surface)

All behind a Bearer API key:

- **Full campaign membership** — the actual member-IP list per campaign
  (`campaign_actors`); withheld from the public API today.
- **Full payload hashes + tool fingerprints** — not just the 8-char prefix.
- **Unsampled `/v1/recent`** — no public cap, no per-IP rate limit.
- **Bulk export** — JSON / CSV dumps of the corpus.
- **ASN / country slicing at scale** — the rollup endpoints, unmetered.

## Status

- **2026-05-17 — steps 1 + 2 SHIPPED.** scry-server `a29dbc5`: schema 004
  `api_keys`, `apiKeyMiddleware` on `/v1/*` (60 s resolution cache), per-key
  rate ceiling, gated `/v1/campaign/{id}/members` + `/v1/export` (JSON/CSV),
  full hashes/fingerprints for paid keys, `issue/revoke/list-keys.js` CLI.
  Deployed to the VPS and verified end-to-end (401 keyless, 200 keyed,
  revoke). Free tier unchanged.
- Next: step 3 (Stripe) — **needs Josh's Stripe account**.

## Task chain (dependency-ordered)

1. ✅ **Defender-only corpus surface** (`scry-server`) — build/confirm the
   keyed endpoints + fields above. *Gate: nothing is sellable until this is
   real.*
2. ✅ **API-key entitlement system** (`scry-server`) — `api_keys` table
   (key hash → Stripe customer/subscription → status → entitlements); Bearer
   auth middleware on `/v1/*`; a valid Defender key bypasses sampling + rate
   limit and unlocks the gated surface; revocation path. Keys never stored
   plaintext.
3. **Stripe checkout + webhook** (`tunnelmind-site`) — Defender Product/Price
   in Stripe (live mode); server-side Checkout Session function; webhook
   handler (verify signature → `checkout.session.completed` issues a key,
   `subscription.deleted/updated` revokes). Secrets in CF env.
4. **Key delivery + customer management** — email the issued key; Stripe
   Customer Portal link for self-serve cancel/update. No full account system
   for v1.
5. **Legal** — paid-tier clause + refund policy + acceptable-use-of-data terms
   in the ToS; decide on Stripe Tax. *Runs in parallel.*
6. **Concurrent load / stress test** — prove the stack holds with everything at
   once: anonymous radar viewers (SSE + `/api/*`), free-tier callers, paid
   Defender keys on the full corpus, Team keys, the DO rate limiter. Load-test
   `scry-server` (Postgres pool, geo LATERAL joins, materializer cron), the CF
   Pages functions, the rate limiter. Find the ceiling, fix bottlenecks,
   document headroom. *Gates go-live.*
7. **End-to-end test + go live** — Stripe test mode full loop (subscribe →
   webhook → key issued → key unlocks corpus → cancel → key revoked), then flip
   `Pricing.jsx` to live checkout and drop the waitlist framing.

## What needs Josh

- A **Stripe account** with the Defender Product/Price created (live mode), plus
  the secret key + webhook signing secret — for step 3.
- Sign-off on **bulk-export format/limits** and the **API-key format**.
- The **VPS** deploy for every `scry-server` change (see
  `deploy/ship-*.sh` pattern).

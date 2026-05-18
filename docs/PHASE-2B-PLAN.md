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
- **2026-05-17 — step 5 (legal) SHIPPED + step 3 partially.** `tunnelmind-site`
  `80008d1`: ToS rewritten for the paid corpus product (API-key terms,
  subscriptions+refunds, corpus data license). `functions/api/checkout.js`
  built (Stripe Checkout session, plain REST, mirrors `tunnelmind-data-api`);
  Pricing page Defender CTA wired to it, falls back to waitlist on 503.
- **2026-05-18 — steps 3 + 4 code-complete.** Key-issuance path built and
  deployed both ends:
  - `scry-server`: `src/routes/keys_admin.js` — `POST /api/v1/keys/issue`
    (idempotent on `stripe_subscription`) + `POST /api/v1/keys/revoke`,
    guarded by `KEY_ADMIN_SECRET` (a dedicated secret, NOT the IP-allowlisted
    `ADMIN_KEY` — the caller's CF egress IP rotates). Deployed via
    `deploy/ship-key-issuance.sh`; 6/6 smoke tests green; reachable at
    `api.tunnelmind.ai/api/v1/keys/*`.
  - `tunnelmind-site`: `functions/api/stripe-webhook.js` (v1 HMAC-SHA256
    signature verify → `checkout.session.completed` issues a key,
    `customer.subscription.deleted` revokes), `functions/api/checkout-session.js`
    (success page retrieves the session, provisions the key, returns it once),
    `_scry-keys.js` + `_email.js` helpers. Pricing page success banner now
    reveals the key inline with a copy button. Email (Resend) is optional —
    unset `RESEND_API_KEY` ⇒ key shown on the success page only.
- **Stripe account already exists** — `acct_1TIYF74F1SLqPO88`, restricted key
  `rk_live_…`, the proven checkout/webhook pattern lives in
  `tunnelmind-data-api`. See vault `TunnelMind/Credentials.md` §"Stripe".
- **To open Defender checkout (remaining — all manual / dashboard):**
  (a) create the Defender product + $49/mo recurring price in Stripe →
  note the `price_…` id; (b) add the webhook endpoint
  `https://tunnelmind.ai/api/stripe-webhook` in Stripe (events:
  `checkout.session.completed`, `customer.subscription.deleted`) → note the
  signing secret; (c) set on the CF Pages project: `STRIPE_SECRET_KEY`,
  `STRIPE_PRICE_DEFENDER`, `STRIPE_WEBHOOK_SECRET`, `KEY_ADMIN_SECRET`
  (must match the VPS value), and optionally `RESEND_API_KEY` + `RESEND_FROM`.
  Until (c), `/api/checkout` 503s and the CTA stays on the waitlist fallback.

## Task chain (dependency-ordered)

1. ✅ **Defender-only corpus surface** (`scry-server`) — build/confirm the
   keyed endpoints + fields above. *Gate: nothing is sellable until this is
   real.*
2. ✅ **API-key entitlement system** (`scry-server`) — `api_keys` table
   (key hash → Stripe customer/subscription → status → entitlements); Bearer
   auth middleware on `/v1/*`; a valid Defender key bypasses sampling + rate
   limit and unlocks the gated surface; revocation path. Keys never stored
   plaintext.
3. ✅ **Stripe checkout + webhook** (`tunnelmind-site`) — Checkout Session
   function + webhook handler (verify signature → `checkout.session.completed`
   issues a key, `customer.subscription.deleted` revokes) + the
   `scry-server` key-issuance routes the webhook calls. *Code-complete and
   deployed. Creating the Stripe Product/Price + setting the CF env secrets
   are dashboard steps — see "To open Defender checkout" above and step 7.*
4. ✅ **Key delivery + customer management** — the success page reveals the
   key once (copy button); the webhook emails it via Resend as a backstop
   (optional — degrades to success-page-only if `RESEND_API_KEY` is unset).
   Stripe Customer Portal handles self-serve cancel/update. No full account
   system for v1.
5. ✅ **Legal** — paid-tier clause + refund policy + acceptable-use-of-data
   terms in the ToS (`80008d1`); decide on Stripe Tax.
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

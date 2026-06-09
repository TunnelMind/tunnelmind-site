# Block checkout — prepaid $20 API-call blocks

P34 replaced the Free / Defender / Team tier model with two payment rails
(see `src/config/pricing.js`). This doc covers the **human rail**: prepaid
$20 blocks of API calls, bought through Stripe.

## Model

- A block is **$20 = 25,000 API calls**, stackable, no expiry.
- Once a buyer's **lifetime spend reaches $100**, every block bought after
  that credits **50,000 calls** for the same $20 — permanently.
- The volume rate is computed **server-side from Stripe charge history**,
  not stored as a second Stripe price. A single multi-block purchase can
  straddle the threshold; `callsForPurchase()` rates each block by the
  cumulative spend at the moment it is bought.

## Flow (this repo — `tunnelmind-site`)

1. `POST /api/checkout` (`functions/api/checkout.js`) — creates a Stripe
   one-time **payment** Checkout Session, one `STRIPE_PRICE_BLOCK` line
   item with adjustable quantity 1–100. Reuses an existing Stripe Customer
   matched by email so lifetime spend accumulates on one customer.
2. Buyer pays on Stripe's hosted page.
3. `checkout.session.completed` →
   - `functions/api/stripe-webhook.js` (backstop), and
   - `functions/api/checkout-session.js` (success-page redirect)
   both: derive block count from `amount_subtotal`, compute prior lifetime
   spend from the customer's charges, call `callsForPurchase()`, and credit
   the calls via `creditScryCalls()`. Idempotent on the Checkout Session id.
4. First purchase → a key is minted and shown once / emailed. Repeat
   purchase → calls are added to the existing key.

Block math lives once in `src/config/pricing.js` (`callsForPurchase`) and
is shared with the Functions via `functions/api/_blocks.js`.

## Code side — ✅ BUILT, DEPLOYED & DB-MIGRATED (verified live 2026-06-09)

The scry-server credit endpoint that this doc once listed as "NOT yet built"
is **done and live**. Verified end-to-end:

- **`POST /api/v1/keys/credit`** — implemented in
  `scry-server/src/routes/keys_admin.js` (`postCreditKey`), routed in
  `src/index.js`, guarded by Bearer `KEY_ADMIN_SECRET`. Idempotent on
  `idempotency_key` (the Stripe Checkout Session id) via a `UNIQUE`
  constraint on `key_credits`; first credit for a `stripe_customer` mints a
  key and returns the raw key once, subsequent credits accumulate balance
  and return the prefix only. Concurrent first-credits for one customer are
  serialized by a per-customer pg advisory lock. Response
  `{ ok, key?, prefix, calls_remaining, already_credited }`.
  *Live check:* the endpoint returns `401 unauthorized` (route present,
  secret-gated) on `api.tunnelmind.ai`.
- **Hot-path balance** — `scry-server/src/lib/api_key.js` (`chargeBlock`)
  atomically `calls_remaining = calls_remaining - 1 … WHERE calls_remaining > 0`
  on every `/v1/*` request for a `block`-tier key (runs on cache hit *and*
  miss so the 60 s identity cache can't leak free calls), and returns
  **HTTP 402 "block exhausted"** at zero. Counter lives in VPS Postgres per
  `feedback_no_freetier_loadbearing`, never in KV.
- **Migration `005_block_credits`** — applied to the live `scry` DB
  (verified 2026-06-09): `api_keys.calls_remaining` column + `block` tier in
  the tier CHECK + the `key_credits` idempotency ledger all present.

The contract is also documented at the top of `functions/api/_scry-keys.js`.

## Remaining before go-live — ALL Josh-gated (no code left)

### 1. Stripe dashboard (Josh)

- Create a one-time **product + $20 price** ("TunnelMind API call block").
- Set these **Cloudflare Pages → tunnelmind-site → Settings → Environment
  variables (Production)**, then redeploy so Functions pick them up:
  - `STRIPE_SECRET_KEY` — Stripe live secret key (`sk_live_…`).
  - `STRIPE_PRICE_BLOCK` — the $20 price id (`price_…`).
  - `STRIPE_WEBHOOK_SECRET` — signing secret from the webhook in step 2 (`whsec_…`).
  - `KEY_ADMIN_SECRET` — **must byte-match** scry-server's `KEY_ADMIN_SECRET`
    in `/opt/tunnelmind/deploy/.env` (this is the bearer the Functions use to
    call `/api/v1/keys/credit`). If scry-server's is unset, set both sides to
    the same fresh random value and restart `tmd-scry-server`.
  - `RESEND_API_KEY` — for emailing the freshly-minted key on first purchase.
- Point a Stripe webhook at `https://tunnelmind.ai/api/stripe-webhook` for the
  **`checkout.session.completed`** event; copy its signing secret into
  `STRIPE_WEBHOOK_SECRET` above.

### 2. Flip the switch (one line — do this LAST)

Set `PRICING.human.checkoutEnabled = true` in `src/config/pricing.js` **only
after** step 1 is fully done. Until then the pricing page shows "Checkout
opens at launch" and `/api/checkout` returns `503 checkout_unavailable`
(graceful — `checkout.js` already 503s when `STRIPE_SECRET_KEY` /
`STRIPE_PRICE_BLOCK` are unset, so a premature flip degrades safely rather
than erroring).

### 3. Smoke test after go-live

1. Buy one block in Stripe **test mode** → confirm a key is minted + emailed
   and `calls_remaining` = 25,000.
2. Buy a second block on the same email → confirm balance accumulates on the
   **same** key (no second key minted).
3. Replay the webhook for one session id → confirm `already_credited: true`
   and no double-credit.
4. Drain a test key to 0 → confirm `/v1/*` returns **HTTP 402**.

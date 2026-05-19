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

## NOT yet built — required before go-live

### 1. scry-server: `POST /api/v1/keys/credit`

scry-server owns the `api_keys` table. It currently exposes
`/api/v1/keys/issue` + `/api/v1/keys/revoke` (subscription-shaped, now
unused). The block model needs a **credit** endpoint and a **call balance**:

- Add a `calls_remaining` column (bigint) to `api_keys`.
- `POST /api/v1/keys/credit`, Bearer `KEY_ADMIN_SECRET`:
  - request: `{ stripe_customer, label, calls, idempotency_key }`
  - idempotent on `idempotency_key` (the Stripe Checkout Session id) — a
    replay credits nothing and returns the current state.
  - first credit for a `stripe_customer`: mint a key, set balance to
    `calls`, return the raw key **once**.
  - subsequent credit: find that customer's key, add `calls`, return the
    prefix only.
  - response: `{ ok, key?, prefix, calls_remaining, already_credited }`
- Decrement `calls_remaining` on the request hot path; reject at zero.
  Per `feedback_no_freetier_loadbearing` the counter belongs in VPS
  Postgres (where `api_keys` already lives), never in KV.

The contract is also documented at the top of `functions/api/_scry-keys.js`.

### 2. Stripe dashboard (Josh)

- Create a one-time **product + $20 price** ("TunnelMind API call block").
- Set Pages env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BLOCK`,
  `STRIPE_WEBHOOK_SECRET`, `KEY_ADMIN_SECRET`, `RESEND_API_KEY`.
- Point a webhook at `https://tunnelmind.ai/api/stripe-webhook` for
  `checkout.session.completed`.

### 3. Flip the switch

Set `PRICING.human.checkoutEnabled = true` in `src/config/pricing.js` once
1 and 2 are done. Until then the pricing page shows "Checkout opens at
launch" and `/api/checkout` returns `503 checkout_unavailable`.

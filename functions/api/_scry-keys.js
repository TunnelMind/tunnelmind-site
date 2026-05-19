// functions/api/_scry-keys.js — credit prepaid call blocks in scry-server.
//
// scry-server (the corpus API on the VPS, reached at api.tunnelmind.ai)
// owns the api_keys table and the per-key call balance. Underscore-
// prefixed: not a route, import-only.
//
// ── REQUIRED scry-server endpoint (NOT yet built — block-checkout) ───────
// POST /api/v1/keys/credit   guarded by Bearer KEY_ADMIN_SECRET
//   request:  { stripe_customer, label, calls, idempotency_key }
//   behaviour:
//     - idempotent on idempotency_key (the Stripe Checkout Session id):
//       a replay returns the current state and credits nothing further.
//     - first credit for a stripe_customer: mint a new key, set its
//       balance to `calls`, return the raw key ONCE.
//     - subsequent credit: find that customer's key, add `calls` to its
//       balance, return the prefix only (the raw key is unrecoverable).
//   response: { ok, key?, prefix, calls_remaining, already_credited }
//     key                — present ONLY on a freshly-minted key
//     prefix             — always (e.g. "tmk_ab12")
//     calls_remaining    — the key's balance after this credit
//     already_credited   — true when idempotency_key was already seen
//
// scry-server must also decrement calls_remaining on the request hot path
// and reject at zero. Per feedback_no_freetier_loadbearing the counter
// belongs in VPS Postgres (where api_keys already lives), never in KV.

const SCRY_ORIGIN = 'https://api.tunnelmind.ai'

function base(env) {
  return env.SCRY_KEY_API_BASE || SCRY_ORIGIN
}

/**
 * Credit `calls` API calls to the key for a Stripe customer, minting the
 * key on the customer's first purchase. Idempotent on idempotencyKey, so
 * the webhook and the success page may both call this for one checkout
 * without double-crediting.
 *
 * Returns { ok, status, key?, prefix?, calls_remaining?, already_credited?,
 * error? }. A successful call with NO `key` means either a top-up of an
 * existing key or an idempotent replay — never re-deliver a key in that
 * case; there is no raw key to deliver.
 */
export async function creditScryCalls(env, { stripeCustomer, label, calls, idempotencyKey }) {
  const secret = env.KEY_ADMIN_SECRET
  if (!secret) return { ok: false, status: 0, error: 'key_admin_unconfigured' }
  if (!Number.isFinite(calls) || calls < 1) {
    return { ok: false, status: 0, error: 'no_calls' }
  }

  let resp
  try {
    resp = await fetch(base(env) + '/api/v1/keys/credit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stripe_customer: stripeCustomer || null,
        label: label || null,
        calls,
        idempotency_key: idempotencyKey || null,
      }),
    })
  } catch {
    return { ok: false, status: 0, error: 'scry_unreachable' }
  }

  const data = await resp.json().catch(() => ({}))
  return { ok: resp.ok, status: resp.status, ...data }
}

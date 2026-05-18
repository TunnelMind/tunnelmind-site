// functions/api/_scry-keys.js — provision Defender keys in scry-server.
//
// scry-server (the corpus API on the VPS, reached at api.tunnelmind.ai)
// owns the api_keys table. It exposes two webhook-callable routes guarded
// by KEY_ADMIN_SECRET:
//   POST /api/v1/keys/issue   — mint a key (idempotent on stripe_subscription)
//   POST /api/v1/keys/revoke  — revoke every key for a subscription
//
// Both the Stripe webhook and the checkout success page provision keys
// through here. Underscore-prefixed: not a route, import-only.

const SCRY_ORIGIN = 'https://api.tunnelmind.ai'

function base(env) {
  return env.SCRY_KEY_API_BASE || SCRY_ORIGIN
}

/**
 * Mint a paid key. scry-server is idempotent on stripe_subscription, so the
 * webhook and the success page can both call this for one checkout without
 * minting a duplicate.
 *
 * Returns { ok, status, key?, prefix?, tier?, already_issued, error? }.
 * A successful call with NO `key` means the subscription was already
 * provisioned — do not re-deliver.
 */
export async function issueScryKey(env, { tier, label, stripeCustomer, stripeSubscription }) {
  const secret = env.KEY_ADMIN_SECRET
  if (!secret) return { ok: false, status: 0, error: 'key_admin_unconfigured' }

  let resp
  try {
    resp = await fetch(base(env) + '/api/v1/keys/issue', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tier: tier || 'defender',
        label: label || null,
        stripe_customer: stripeCustomer || null,
        stripe_subscription: stripeSubscription || null,
      }),
    })
  } catch {
    return { ok: false, status: 0, error: 'scry_unreachable' }
  }

  const data = await resp.json().catch(() => ({}))
  return { ok: resp.ok, status: resp.status, ...data }
}

/**
 * Revoke every active key for a Stripe subscription. Used on
 * customer.subscription.deleted. Returns { ok, status, revoked?, error? }.
 */
export async function revokeScryKey(env, stripeSubscription) {
  const secret = env.KEY_ADMIN_SECRET
  if (!secret) return { ok: false, status: 0, error: 'key_admin_unconfigured' }
  if (!stripeSubscription) return { ok: false, status: 0, error: 'no_subscription' }

  let resp
  try {
    resp = await fetch(base(env) + '/api/v1/keys/revoke', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stripe_subscription: stripeSubscription }),
    })
  } catch {
    return { ok: false, status: 0, error: 'scry_unreachable' }
  }

  const data = await resp.json().catch(() => ({}))
  return { ok: resp.ok, status: resp.status, ...data }
}

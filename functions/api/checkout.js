// POST /api/checkout — start a Stripe Checkout session for a prepaid
// block purchase (P34 block model).
//
// One-time payment, NOT a subscription. One line item — the $20 "API call
// block" price — with adjustable quantity, so the buyer chooses how many
// blocks (1..100) on Stripe's hosted page. Stripe is the human payment
// rail; agents pay per query on the separate x402 rail (TunnelMind/docs/
// X402-SPEC.md).
//
// To make a buyer's lifetime spend queryable later (the volume rate at
// $100 cumulative depends on it), every checkout is tied to a stable
// Stripe Customer: we reuse an existing customer with the same email if
// one exists, otherwise Stripe creates one. The webhook and the success
// page read that customer's charge history to rate the purchase.
//
// Returns { url } on success — the caller redirects the browser to it.
// Returns 503 { error:'checkout_unavailable' } when STRIPE_SECRET_KEY or
// STRIPE_PRICE_BLOCK are unset, so the pricing page falls back cleanly to
// the email CTA. Keep those vars UNSET until the webhook
// (functions/api/stripe-webhook.js) AND scry-server's /api/v1/keys/credit
// endpoint are live — a live checkout with no way to credit calls would
// take payment and deliver nothing.
//
// Calls are credited by the webhook / success page on
// checkout.session.completed, not here.

export async function onRequestPost(context) {
  const { request, env } = context

  const secret = env.STRIPE_SECRET_KEY
  const priceId = env.STRIPE_PRICE_BLOCK
  if (!secret || !priceId) {
    return json(
      {
        error: 'checkout_unavailable',
        message: 'Block checkout is not enabled yet.',
      },
      503
    )
  }

  let body = {}
  try {
    body = await request.json()
  } catch {
    // email is optional — an empty/invalid body is fine.
  }
  const emailRaw = typeof body?.email === 'string' ? body.email.trim() : ''
  const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw) ? emailRaw : ''

  // Reuse an existing Stripe Customer for this email so lifetime spend
  // accumulates on one customer across repeat purchases.
  const customerId = email ? await findCustomerByEmail(secret, email) : null

  const params = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'line_items[0][adjustable_quantity][enabled]': 'true',
    'line_items[0][adjustable_quantity][minimum]': '1',
    'line_items[0][adjustable_quantity][maximum]': '100',
    success_url:
      'https://tunnelmind.ai/pricing?checkout=success&session={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://tunnelmind.ai/pricing?checkout=cancelled',
    'metadata[kind]': 'block_purchase',
    // Promotion codes are deliberately OFF: the volume threshold is keyed
    // to dollars actually spent, and a discount would desync block count
    // from spend. Re-enable only alongside spend-vs-blocks reconciliation.
  })

  if (customerId) {
    params.set('customer', customerId)
  } else {
    // No existing customer — let Checkout create one so the next purchase
    // can find it. customer_creation is only valid when no customer is set.
    params.set('customer_creation', 'always')
    if (email) params.set('customer_email', email)
  }

  let resp
  try {
    resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
  } catch {
    return json({ error: 'stripe_error', message: 'Could not reach Stripe.' }, 502)
  }

  let session
  try {
    session = await resp.json()
  } catch {
    return json({ error: 'stripe_error', message: 'Stripe returned no body.' }, 502)
  }
  if (!resp.ok || !session?.url) {
    return json(
      {
        error: 'stripe_error',
        message: session?.error?.message || 'Could not start checkout.',
      },
      502
    )
  }

  return json({ url: session.url }, 200)
}

// Look up a Stripe Customer by email. Returns the id of the first match,
// or null. Never throws — on any failure checkout just creates a fresh
// customer, which is correct, only slightly less tidy.
async function findCustomerByEmail(secret, email) {
  try {
    const resp = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
      { headers: { Authorization: `Bearer ${secret}` } }
    )
    const data = await resp.json().catch(() => null)
    if (resp.ok && data && Array.isArray(data.data) && data.data[0]?.id) {
      return data.data[0].id
    }
  } catch {
    // fall through
  }
  return null
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

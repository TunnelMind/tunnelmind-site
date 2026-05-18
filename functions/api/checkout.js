// POST /api/checkout — start a Stripe Checkout session for the Defender tier.
//
// Mirrors the proven pattern in tunnelmind-data-api/api/routes/checkout.js:
// no Stripe SDK — plain fetch against the Stripe REST API. Stripe is the
// only payment path; there is no crypto option, by design.
//
// Returns { url } on success — the caller redirects the browser to it.
// Returns 503 { error: 'checkout_unavailable' } when STRIPE_SECRET_KEY or
// STRIPE_PRICE_DEFENDER are not set on the Pages project, so the pricing
// page falls back cleanly to the waitlist CTA. Keep those vars UNSET until
// the Stripe webhook (functions/api/stripe-webhook.js) is deployed — a live
// checkout with no webhook would take payment and issue no key.
//
// The API key itself is provisioned by the webhook on
// checkout.session.completed, not here.

export async function onRequestPost(context) {
  const { request, env } = context

  const secret = env.STRIPE_SECRET_KEY
  const priceId = env.STRIPE_PRICE_DEFENDER
  if (!secret || !priceId) {
    return json(
      {
        error: 'checkout_unavailable',
        message: 'Defender self-serve checkout is not enabled yet.',
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
  const email = typeof body?.email === 'string' ? body.email.trim() : ''

  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url:
      'https://tunnelmind.ai/#/pricing?checkout=success&session={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://tunnelmind.ai/#/pricing?checkout=cancelled',
    'metadata[tier]': 'defender',
    allow_promotion_codes: 'true',
  })
  if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    params.set('customer_email', email)
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

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

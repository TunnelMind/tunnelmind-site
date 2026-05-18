// functions/api/checkout-session.js — provision + reveal the key after checkout.
//
// GET /api/checkout-session?session=cs_xxx
//
// The Stripe success URL redirects the buyer back to
// /#/pricing?checkout=success&session={CHECKOUT_SESSION_ID}. The pricing
// page calls this endpoint with that id; we retrieve the session from
// Stripe, confirm it is paid, provision the Defender key in scry-server
// (idempotent — the webhook may also do this), and return the raw key so
// the page can display it ONCE.
//
// The session id (cs_…) is an unguessable, single-purpose token known only
// to the buyer's browser and Stripe — the same trust model the data-api
// success page uses. We still gate on status === 'complete' && paid.
//
// Response shapes:
//   { status:'paid', key, prefix, tier }            — fresh key, show it
//   { status:'paid', already_issued:true, prefix }  — key already delivered
//   { status:'pending' }                            — not paid yet
//   503 { error:'checkout_unavailable' }             — Stripe not configured

import { issueScryKey } from './_scry-keys.js'

export async function onRequestGet(context) {
  const { request, env } = context

  const secret = env.STRIPE_SECRET_KEY
  if (!secret) {
    return json({ error: 'checkout_unavailable' }, 503)
  }

  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session') || ''
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return json({ error: 'invalid_session' }, 400)
  }

  // Retrieve the Checkout Session from Stripe.
  let resp
  try {
    resp = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    )
  } catch {
    return json({ error: 'stripe_error', message: 'Could not reach Stripe.' }, 502)
  }

  const session = await resp.json().catch(() => null)
  if (!resp.ok || !session || !session.id) {
    return json({ error: 'stripe_error', message: session?.error?.message || 'Session not found.' }, 502)
  }

  const paid = session.status === 'complete' && session.payment_status === 'paid'
  if (!paid) {
    // Payment still settling, or an unfinished/abandoned session.
    return json({ status: 'pending' }, 200)
  }

  const tier = (session.metadata && session.metadata.tier) || 'defender'
  const email =
    (session.customer_details && session.customer_details.email) ||
    session.customer_email ||
    null
  const stripeSubscription =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || null
  const stripeCustomer =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id || null

  const result = await issueScryKey(env, {
    tier,
    label: email,
    stripeCustomer,
    stripeSubscription,
  })

  if (!result.ok) {
    // Payment succeeded but provisioning failed — the webhook is the
    // backstop. Tell the page the payment landed but the key is delayed.
    return json(
      { status: 'paid', key_pending: true, message: 'Your key is being issued — check your email shortly.' },
      200
    )
  }

  if (result.key) {
    return json({ status: 'paid', key: result.key, prefix: result.prefix, tier: result.tier }, 200)
  }

  // already_issued — the webhook (or an earlier page load) beat us to it.
  // The raw key cannot be recovered; point the buyer at their email.
  return json(
    {
      status: 'paid',
      already_issued: true,
      prefix: result.prefix,
      tier: result.tier,
      message: 'Your key has already been issued — check your email, or contact support@tunnelmind.ai.',
    },
    200
  )
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

// functions/api/checkout-session.js — credit + reveal the key after checkout.
//
// GET /api/checkout-session?session=cs_xxx
//
// The Stripe success URL redirects the buyer back to
// /#/pricing?checkout=success&session={CHECKOUT_SESSION_ID}. The pricing
// page calls this endpoint with that id; we retrieve the session from
// Stripe, confirm it is paid, credit the purchased blocks' calls to the
// buyer's key in scry-server (idempotent on the session id — the webhook
// may also do this), and return the key + balance so the page can show
// the raw key ONCE on a first purchase.
//
// The session id (cs_…) is an unguessable, single-purpose token known only
// to the buyer's browser and Stripe. We still gate on status === 'complete'
// && payment_status === 'paid'.
//
// Response shapes:
//   { status:'paid', key, prefix, calls_credited, calls_remaining }
//        — first purchase: a freshly-minted key, show it once
//   { status:'paid', topped_up:true, prefix, calls_credited, calls_remaining }
//        — repeat purchase: calls added to an existing key, no raw key
//   { status:'paid', key_pending:true, message }
//        — paid, but crediting failed; the webhook is the backstop
//   { status:'pending' }                  — not paid yet
//   503 { error:'checkout_unavailable' }   — Stripe not configured

import { creditScryCalls } from './_scry-keys.js'
import { blocksFromSession, priorSpendUsd, callsForPurchase } from './_blocks.js'

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

  const blocks = blocksFromSession(session)
  if (blocks < 1) {
    return json(
      { status: 'paid', key_pending: true, message: 'Your purchase is being processed — check your email shortly.' },
      200
    )
  }

  const email =
    (session.customer_details && session.customer_details.email) ||
    session.customer_email ||
    null
  const stripeCustomer =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id || null

  const priorSpend = await priorSpendUsd(secret, stripeCustomer, session.amount_total)
  const calls = callsForPurchase(blocks, priorSpend)

  const result = await creditScryCalls(env, {
    stripeCustomer,
    label: email,
    calls,
    idempotencyKey: session.id,
  })

  if (!result.ok) {
    // Payment succeeded but crediting failed — the webhook is the backstop.
    return json(
      { status: 'paid', key_pending: true, message: 'Your calls are being credited — check your email shortly.' },
      200
    )
  }

  if (result.key) {
    // First purchase — a freshly-minted key, shown once.
    return json(
      {
        status: 'paid',
        key: result.key,
        prefix: result.prefix,
        calls_credited: calls,
        calls_remaining: result.calls_remaining ?? calls,
      },
      200
    )
  }

  // A top-up (or an idempotent replay): the raw key cannot be recovered,
  // but the buyer already has it. Report the new balance.
  return json(
    {
      status: 'paid',
      topped_up: true,
      prefix: result.prefix,
      calls_credited: result.already_credited ? 0 : calls,
      calls_remaining: result.calls_remaining ?? null,
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

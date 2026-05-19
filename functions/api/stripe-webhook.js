// functions/api/stripe-webhook.js — Stripe block-purchase receiver.
//
// POST /api/stripe-webhook   (set this exact URL in the Stripe dashboard)
//
// Stripe signs every webhook. We verify the v1 HMAC-SHA256 signature
// against STRIPE_WEBHOOK_SECRET before trusting a single byte of the body.
//
// Handled events:
//   checkout.session.completed  (mode=payment) — credit the purchased
//     blocks' calls to the buyer's key, minting the key on a first
//     purchase and emailing it.
// All other event types: acknowledged with 200 and ignored. The retired
// subscription tiers (Defender/Team) are gone — subscription events are
// no longer handled.
//
// We return 200 even on handler errors. A non-2xx makes Stripe retry the
// same event; we only want that for genuine bad-request cases (bad
// signature, malformed body), which DO return 4xx.
//
// Crediting is idempotent on the Stripe Checkout Session id: the success
// page (functions/api/checkout-session.js) races this webhook to credit
// the same purchase, and scry-server credits it only once.

import { creditScryCalls } from './_scry-keys.js'
import { blocksFromSession, priorSpendUsd, callsForPurchase } from './_blocks.js'
import { sendKeyEmail } from './_email.js'

// ── Stripe v1 signature verification (HMAC-SHA256) ───────────────────────

async function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return false

  let timestamp = null
  const signatures = []
  for (const part of sigHeader.split(',')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const k = part.slice(0, eq).trim()
    const v = part.slice(eq + 1).trim()
    if (k === 't') timestamp = v
    if (k === 'v1') signatures.push(v)
  }
  if (!timestamp || signatures.length === 0) return false

  // Replay protection — reject anything older than 5 minutes.
  const ts = parseInt(timestamp, 10)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const signedPayload = `${timestamp}.${rawBody}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const expected = Array.from(new Uint8Array(mac))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return signatures.includes(expected)
}

// ── Event handler ─────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session, env) {
  // Block purchases are one-time payments. Ignore anything else.
  if (session.mode && session.mode !== 'payment') return
  if (session.payment_status && session.payment_status !== 'paid') {
    console.log(`webhook: checkout ${session.id} not paid (${session.payment_status}) — skipped`)
    return
  }

  const blocks = blocksFromSession(session)
  if (blocks < 1) {
    console.error(`webhook: checkout ${session.id} resolved to 0 blocks — skipped`)
    return
  }

  const email =
    (session.customer_details && session.customer_details.email) ||
    session.customer_email ||
    null
  const stripeCustomer =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id || null

  // Rate the purchase against the buyer's spend before this checkout.
  const priorSpend = await priorSpendUsd(
    env.STRIPE_SECRET_KEY,
    stripeCustomer,
    session.amount_total
  )
  const calls = callsForPurchase(blocks, priorSpend)

  const result = await creditScryCalls(env, {
    stripeCustomer,
    label: email,
    calls,
    idempotencyKey: session.id,
  })

  if (!result.ok) {
    console.error(`webhook: credit failed for ${session.id} — ${result.error || result.status}`)
    return
  }
  if (result.already_credited) {
    console.log(`webhook: ${session.id} already credited (${result.prefix}) — no email`)
    return
  }
  if (!result.key) {
    // A top-up of an existing key — the buyer already has the raw key, so
    // there is nothing secret to deliver.
    console.log(
      `webhook: ${session.id} credited ${calls} calls to existing key ` +
        `${result.prefix} (balance ${result.calls_remaining})`
    )
    return
  }

  // First purchase — the raw key exists only here. The webhook usually
  // loses the race to the browser redirect; when it wins, email the key.
  const mail = await sendKeyEmail(env, {
    to: email,
    key: result.key,
    prefix: result.prefix,
    calls: result.calls_remaining ?? calls,
  })
  if (mail.ok) {
    console.log(`webhook: issued ${result.prefix} (${calls} calls) and emailed ${email}`)
  } else if (mail.skipped) {
    console.warn(
      `webhook: issued ${result.prefix} for ${email} but RESEND_API_KEY is unset — ` +
        `key undelivered, customer must contact support`
    )
  } else {
    console.error(`webhook: issued ${result.prefix} but email send failed — ${mail.error}`)
  }
}

// ── Entry point ───────────────────────────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context

  // The raw body MUST be read verbatim — signature verification depends on
  // the exact bytes Stripe signed.
  const rawBody = await request.text()
  const sigHeader = request.headers.get('Stripe-Signature') || ''

  const valid = await verifyStripeSignature(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET || '')
  if (!valid) {
    // 400 → Stripe will retry; correct, since a transient secret mismatch
    // during a rotation should self-heal.
    return json({ error: 'invalid_signature' }, 400)
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, env)
        break
      // All other events: acknowledged and ignored.
    }
  } catch (e) {
    // Return 200 — a non-2xx triggers a Stripe retry of the same event,
    // and a handler bug would just retry forever.
    console.error('webhook handler error:', event.type, e?.message ?? e)
    return json({ ok: true, warning: 'handler_error_logged' }, 200)
  }

  return json({ ok: true }, 200)
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

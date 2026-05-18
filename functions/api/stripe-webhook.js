// functions/api/stripe-webhook.js — Stripe subscription lifecycle receiver.
//
// POST /api/stripe-webhook   (set this exact URL in the Stripe dashboard)
//
// Stripe signs every webhook. We verify the v1 HMAC-SHA256 signature
// against STRIPE_WEBHOOK_SECRET before trusting a single byte of the body.
// The verification + handler shape mirrors the proven pattern in
// tunnelmind-data-api/api/routes/stripe_webhook.js.
//
// Handled events:
//   checkout.session.completed     — provision a Defender key, email it
//   customer.subscription.deleted  — revoke the key for that subscription
// All other event types: acknowledged with 200 and ignored.
//
// We return 200 even on handler errors. A non-2xx makes Stripe retry the
// same event; we only want that for genuine bad-request cases (bad
// signature, malformed body), which DO return 4xx.
//
// Key provisioning is idempotent on the Stripe subscription id: the
// checkout success page (functions/api/checkout-session.js) races this
// webhook to issue the same key, and scry-server mints only one.

import { issueScryKey, revokeScryKey } from './_scry-keys.js'
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

// ── Event handlers ────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session, env) {
  // Only subscription checkouts provision keys.
  if (session.mode && session.mode !== 'subscription') return
  // Subscription mode: the key is provisioned once the first invoice is paid.
  if (session.payment_status && session.payment_status !== 'paid') {
    console.log(`webhook: checkout ${session.id} not paid (${session.payment_status}) — skipped`)
    return
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
    console.error(`webhook: key issuance failed for ${session.id} — ${result.error || result.status}`)
    return
  }
  if (result.already_issued || !result.key) {
    // The success page already provisioned + displayed this key.
    console.log(`webhook: ${session.id} already provisioned (${result.prefix}) — no email`)
    return
  }

  // The webhook won the race (rare — the browser redirect is faster). The
  // raw key exists only here, so email it. If email is unconfigured, log
  // the prefix so support can revoke + reissue on request.
  const mail = await sendKeyEmail(env, { to: email, key: result.key, prefix: result.prefix, tier })
  if (mail.ok) {
    console.log(`webhook: issued ${result.prefix} and emailed ${email}`)
  } else if (mail.skipped) {
    console.warn(
      `webhook: issued ${result.prefix} for ${email} but RESEND_API_KEY is unset — ` +
        `key undelivered, customer must contact support`
    )
  } else {
    console.error(`webhook: issued ${result.prefix} but email send failed — ${mail.error}`)
  }
}

async function handleSubscriptionDeleted(subscription, env) {
  const subId = subscription.id
  if (!subId) return
  const result = await revokeScryKey(env, subId)
  if (result.ok) {
    console.log(`webhook: subscription ${subId} deleted — revoked ${result.revoked} key(s)`)
  } else {
    console.error(`webhook: revoke failed for ${subId} — ${result.error || result.status}`)
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
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, env)
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

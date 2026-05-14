/**
 * POST /api/stripe/webhooks
 *
 * Handles 4 Stripe Connect events:
 *   account.updated          → mark contributor onboarded when charges_enabled
 *   account.application.deauthorized → mark deauthorized
 *   transfer.created         → credit payout_ledger
 *   transfer.failed          → log failure
 *
 * Secrets required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *                   SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function onRequestPost({ request, env }) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-09-30.acacia' })
  const supa   = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  const body      = await request.text()
  const signature = request.headers.get('stripe-signature') || ''

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    return Response.json({ ok: false, error: `Webhook signature invalid: ${e.message}` }, { status: 400 })
  }

  switch (event.type) {
    case 'account.updated':
      await handleAccountUpdated(supa, event.data.object)
      break

    case 'account.application.deauthorized':
      await handleDeauthorized(supa, event.data.object)
      break

    case 'transfer.created':
      await handleTransferCreated(supa, event.data.object)
      break

    case 'transfer.failed':
      await handleTransferFailed(supa, event.data.object)
      break

    default:
      // Ignore unhandled events — return 200 so Stripe doesn't retry
  }

  return Response.json({ ok: true }, { status: 200 })
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleAccountUpdated(supa, account) {
  if (!account.charges_enabled) return

  await supa
    .from('contributors')
    .update({ stripe_onboarded: true })
    .eq('stripe_account_id', account.id)
}

async function handleDeauthorized(supa, account) {
  await supa
    .from('contributors')
    .update({ stripe_deauthorized: true, stripe_onboarded: false })
    .eq('stripe_account_id', account.id)
}

async function handleTransferCreated(supa, transfer) {
  // Find contributor by stripe_account_id (transfers go to connected accounts)
  const { data: contributor } = await supa
    .from('contributors')
    .select('id')
    .eq('stripe_account_id', transfer.destination)
    .single()

  if (!contributor) return

  // Debit from payout_balance_cents
  await supa.rpc('decrement_payout_balance', {
    p_contributor_id: contributor.id,
    p_amount_cents:   transfer.amount,
  })

  // Append ledger entry
  await supa.from('payout_ledger').insert({
    contributor_id: contributor.id,
    amount_cents:   -transfer.amount,
    reason:         'payout_debit',
  })
}

async function handleTransferFailed(supa, transfer) {
  console.error('Transfer failed:', transfer.id, transfer.failure_message)
  // No balance change — the debit only happens on transfer.created
}

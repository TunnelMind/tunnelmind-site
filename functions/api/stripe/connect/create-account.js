/**
 * POST /api/stripe/connect/create-account
 *
 * Creates a Stripe Connect Express account for an authenticated contributor.
 * Idempotent: returns the existing account ID if already created.
 *
 * Body: { contributor_id: string }
 * Returns: { account_id: string, already_existed: boolean }
 *
 * Secrets required (CF Pages dashboard):
 *   STRIPE_SECRET_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function onRequestPost({ request, env }) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-09-30.acacia' })
  const supa   = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  let body
  try {
    body = await request.json()
  } catch {
    return err('Invalid JSON', 400)
  }

  const { contributor_id } = body
  if (!contributor_id) return err('contributor_id required', 400)

  // Fetch contributor
  const { data: contributor, error: fetchErr } = await supa
    .from('contributors')
    .select('id, email, stripe_account_id, stripe_deauthorized')
    .eq('id', contributor_id)
    .single()

  if (fetchErr || !contributor) return err('Contributor not found', 404)
  if (contributor.stripe_deauthorized) return err('Account deauthorized — reconnect required', 403)

  // Return existing account if already created
  if (contributor.stripe_account_id) {
    return ok({ account_id: contributor.stripe_account_id, already_existed: true })
  }

  // Create new Express account
  let account
  try {
    account = await stripe.accounts.create({
      type: 'express',
      email: contributor.email || undefined,
      capabilities: { transfers: { requested: true } },
      // TunnelMind platform pays the Stripe fee, not the connected account
      controller: { fees: { payer: 'account' } },
      metadata: { contributor_id },
    })
  } catch (e) {
    return err(`Stripe error: ${e.message}`, 502)
  }

  // Persist account ID
  const { error: updateErr } = await supa
    .from('contributors')
    .update({ stripe_account_id: account.id })
    .eq('id', contributor_id)

  if (updateErr) {
    // Account created in Stripe but not saved — log and return the ID anyway
    console.error('Failed to persist stripe_account_id:', updateErr.message)
  }

  return ok({ account_id: account.id, already_existed: false })
}

function ok(data)        { return Response.json({ ok: true, ...data }, { status: 200 }) }
function err(msg, status) { return Response.json({ ok: false, error: msg }, { status }) }

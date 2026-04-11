/**
 * POST /api/stripe/connect/onboarding-link
 *
 * Returns a Stripe Account Link URL for the Express onboarding flow.
 * The URL is single-use and expires in ~5 minutes.
 *
 * Body: { contributor_id: string }
 * Returns: { url: string }
 *
 * Secrets required: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
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

  const { data: contributor, error: fetchErr } = await supa
    .from('contributors')
    .select('stripe_account_id, stripe_deauthorized')
    .eq('id', contributor_id)
    .single()

  if (fetchErr || !contributor)      return err('Contributor not found', 404)
  if (!contributor.stripe_account_id) return err('No Stripe account — call create-account first', 400)
  if (contributor.stripe_deauthorized) return err('Account deauthorized — reconnect required', 403)

  let link
  try {
    link = await stripe.accountLinks.create({
      account: contributor.stripe_account_id,
      refresh_url: `${env.SITE_URL}/contributors?stripe=refresh`,
      return_url:  `${env.SITE_URL}/contributors?stripe=return`,
      type: 'account_onboarding',
    })
  } catch (e) {
    return err(`Stripe error: ${e.message}`, 502)
  }

  return ok({ url: link.url })
}

function ok(data)         { return Response.json({ ok: true, ...data }, { status: 200 }) }
function err(msg, status) { return Response.json({ ok: false, error: msg }, { status }) }

/**
 * POST /api/stripe/payout
 *
 * Executes a monthly payout run. Stub implementation — no real Stripe transfers yet.
 * Called manually or by a scheduled Cloudflare Worker cron (future).
 *
 * Body: { period: string, revenue_cents: number, admin_key: string }
 *   period        — ISO month string, e.g. '2026-04'
 *   revenue_cents — gross platform revenue for the period (in cents)
 *   admin_key     — must match ADMIN_KEY secret
 *
 * Algorithm:
 *   1. Deduct 15% business reserve
 *   2. Compute contributor pool: clamp(net * contributor_pool_pct, min, max)
 *   3. For each contributor with total_score > 0 AND stripe_onboarded:
 *      - Compute weighted share = (score * tier_multiplier) / total_weighted_score
 *      - Credit = floor(pool * share) — whole cents only
 *      - Skip if credit < $10 (threshold) — balance carries forward
 *   4. Record payout_run row
 *
 * In stub mode: credits balances in DB but does NOT call Stripe transfers API.
 * Remove STUB_MODE env var and uncomment transfer code when ready to go live.
 *
 * Secrets required: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_KEY
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { IDENTITY_TIERS, REVENUE_WATERFALL } from '../../../src/lib/scoring.js'

const TIER_MULTIPLIERS = Object.fromEntries(
  Object.entries(IDENTITY_TIERS).map(([k, v]) => [k, v.multiplier])
)

export async function onRequestPost({ request, env }) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-09-30.acacia' })
  const supa   = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  let body
  try {
    body = await request.json()
  } catch {
    return err('Invalid JSON', 400)
  }

  const { period, revenue_cents, admin_key } = body
  if (admin_key !== env.ADMIN_KEY)  return err('Unauthorized', 401)
  if (!period)                      return err('period required', 400)
  if (typeof revenue_cents !== 'number' || revenue_cents < 0)
    return err('revenue_cents must be a non-negative integer', 400)
  if (!Number.isInteger(revenue_cents)) return err('revenue_cents must be an integer', 400)

  // Idempotency: reject if period already run
  const { data: existing } = await supa
    .from('payout_runs')
    .select('id, status')
    .eq('period', period)
    .single()

  if (existing) return err(`Period ${period} already processed (status: ${existing.status})`, 409)

  // Waterfall math (integer arithmetic, never floats)
  const reserve_cents         = Math.floor(revenue_cents * REVENUE_WATERFALL.business_reserve_pct / 100)
  const net_cents             = revenue_cents - reserve_cents
  const pool_pct              = REVENUE_WATERFALL.contributor_pool_min_pct  // use min for stub
  const pool_cents            = Math.floor(net_cents * pool_pct / 100)

  // Create run record
  const { data: run, error: runErr } = await supa
    .from('payout_runs')
    .insert({
      period,
      status:                  'processing',
      total_revenue_cents:     revenue_cents,
      business_reserve_cents:  reserve_cents,
      contributor_pool_cents:  pool_cents,
      started_at:              new Date().toISOString(),
    })
    .select()
    .single()

  if (runErr) return err(`Failed to create run: ${runErr.message}`, 500)

  // Pull contributor scores for the period
  const { data: scores, error: scoresErr } = await supa
    .from('contributor_scores')
    .select('contributor_ref, total_score')
    .gt('total_score', 0)

  if (scoresErr) {
    await failRun(supa, run.id, scoresErr.message)
    return err(`Failed to fetch scores: ${scoresErr.message}`, 500)
  }

  // Fetch identity tiers
  const contributorIds = scores
    .map(s => s.contributor_ref)
    .filter(r => r.includes('-'))  // UUID format = registered contributor

  const { data: contributors } = await supa
    .from('contributors')
    .select('id, identity_tier, stripe_account_id, stripe_onboarded')
    .in('id', contributorIds)

  const contribMap = Object.fromEntries((contributors || []).map(c => [c.id, c]))

  // Compute weighted scores
  let totalWeighted = 0
  const weighted = scores.map(s => {
    const c = contribMap[s.contributor_ref]
    const multiplier = c ? (TIER_MULTIPLIERS[c.identity_tier] ?? 1.0) : 0.5
    const w = s.total_score * multiplier
    totalWeighted += w
    return { ...s, contributor: c, weightedScore: w }
  })

  if (totalWeighted === 0) {
    await supa.from('payout_runs').update({
      status: 'completed',
      total_paid_cents: 0,
      contributor_count: 0,
      completed_at: new Date().toISOString(),
    }).eq('id', run.id)
    return ok({ run_id: run.id, paid: 0, skipped: 0, reason: 'no weighted contributions' })
  }

  // Distribute pool
  let totalPaid = 0
  let paidCount = 0
  let skippedCount = 0

  for (const w of weighted) {
    if (!w.contributor) { skippedCount++; continue }

    const share_cents = Math.floor(pool_cents * w.weightedScore / totalWeighted)

    // Below threshold — balance carries forward automatically (no action needed here;
    // contributor's payout_balance_cents will accumulate across runs)
    if (share_cents < REVENUE_WATERFALL.payout_threshold_usd * 100) {
      // Still credit the balance so it accumulates
      await supa.rpc('credit_payout_balance', {
        p_contributor_id: w.contributor.id,
        p_amount_cents:   share_cents,
        p_run_id:         run.id,
      })
      skippedCount++
      continue
    }

    // Credit balance
    await supa.rpc('credit_payout_balance', {
      p_contributor_id: w.contributor.id,
      p_amount_cents:   share_cents,
      p_run_id:         run.id,
    })

    // STUB_MODE: skip actual Stripe transfer. Remove this block when live.
    if (env.STUB_MODE !== 'false' && w.contributor.stripe_onboarded) {
      // TODO: uncomment when ready to transfer:
      // await stripe.transfers.create({
      //   amount:      share_cents,
      //   currency:    'usd',
      //   destination: w.contributor.stripe_account_id,
      //   metadata:    { period, contributor_id: w.contributor.id, run_id: run.id },
      // })
    }

    totalPaid += share_cents
    paidCount++
  }

  await supa.from('payout_runs').update({
    status:           'completed',
    total_paid_cents: totalPaid,
    contributor_count: paidCount,
    completed_at:     new Date().toISOString(),
  }).eq('id', run.id)

  return ok({ run_id: run.id, paid: paidCount, skipped: skippedCount, total_paid_cents: totalPaid })
}

async function failRun(supa, runId, error) {
  await supa.from('payout_runs').update({ status: 'failed', error }).eq('id', runId)
}

function ok(data)         { return Response.json({ ok: true, ...data }, { status: 200 }) }
function err(msg, status) { return Response.json({ ok: false, error: msg }, { status }) }

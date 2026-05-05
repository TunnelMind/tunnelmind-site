/**
 * Contribution scoring — canonical model.
 * Phase 2: move weights + tiers to Supabase tables.
 * LOCK before wiring Stripe or auth — changing after requires migrations.
 */

// ── Action weights ────────────────────────────────────────────────────────────
export const SCORE_WEIGHTS = {
  annotation_created: 5,
  vote_cast: 1,
  upvote_received: 2,
  correction_accepted: 10,
  correction_proposed: 0,
}

// ── Identity tier multipliers ─────────────────────────────────────────────────
// Applied to raw score at payout time. Higher tiers require stronger identity proof.
export const IDENTITY_TIERS = {
  email:        { multiplier: 0.5,  label: 'Email',         desc: 'Email address verified' },
  verified:     { multiplier: 1.0,  label: 'Verified',      desc: 'Email + GitHub or social OAuth' },
  atap:         { multiplier: 1.5,  label: 'Desktop ATAP',  desc: 'TunnelMind desktop with hardware attestation' },
}

// ── Revenue waterfall ─────────────────────────────────────────────────────────
// Defines how platform revenue is split before contributor payouts.
export const REVENUE_WATERFALL = {
  business_reserve_pct: 15,   // % held for operations, taxes, reserves
  contributor_pool_min_pct: 10, // floor — contributors receive at least this
  contributor_pool_max_pct: 30, // ceiling — contributors receive at most this
  payout_threshold_usd: 10,   // minimum balance before a payout is triggered
  payout_cycle: 'monthly',    // how often payouts run
  carry_forward: true,        // sub-threshold balances roll to next cycle
  amounts_in_cents: true,     // all money stored as integers in cents, never floats
}

export function calculateScore(ledger) {
  return ledger.reduce((total, entry) => {
    return total + (SCORE_WEIGHTS[entry.action_type] || 0)
  }, 0)
}

export function calculateContributorScores(contributors, ledger) {
  const scores = {}
  ledger.forEach(entry => {
    if (!entry.contributor_fingerprint) return
    if (!scores[entry.contributor_fingerprint]) {
      scores[entry.contributor_fingerprint] = {
        annotation_created: 0,
        vote_cast: 0,
        upvote_received: 0,
        correction_accepted: 0,
        total: 0,
      }
    }
    const w = SCORE_WEIGHTS[entry.action_type] || 0
    scores[entry.contributor_fingerprint][entry.action_type] =
      (scores[entry.contributor_fingerprint][entry.action_type] || 0) + w
    scores[entry.contributor_fingerprint].total += w
  })
  return scores
}

export function getPercentageShare(score, totalScore) {
  if (totalScore === 0) return 0
  return ((score / totalScore) * 100).toFixed(1)
}

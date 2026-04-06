/**
 * Contribution scoring.
 * Weights stored here (Phase 2: move to Supabase score_weights table).
 */
export const SCORE_WEIGHTS = {
  annotation_created: 5,
  vote_cast: 1,
  upvote_received: 2,
  correction_accepted: 10,
  correction_proposed: 0,
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

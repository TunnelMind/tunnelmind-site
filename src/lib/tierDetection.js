/**
 * Identity tier detection — pure functions, no side effects, no Supabase dependency.
 * Synced between tunnelmind-site and alloy-site via scripts/sync-shared.sh.
 * Do NOT import supabase here.
 *
 * Tier sources (checked in priority order):
 *   atap      — user_metadata.atap_verified (set by TunnelMind desktop attestation)
 *   verified  — app_metadata.provider === 'github' (GitHub OAuth)
 *   email     — email_confirmed_at present (default for email/password signups)
 */

const TIERS = {
  atap:     { multiplier: 1.5 },
  verified: { multiplier: 1.0 },
  email:    { multiplier: 0.5 },
}

/**
 * Derive identity tier from a Supabase user object.
 * Returns { tier, multiplier }.
 */
export function getTierMultiplier(user) {
  if (!user) return { tier: 'email', multiplier: TIERS.email.multiplier }
  if (user.user_metadata?.atap_verified)          return { tier: 'atap',     multiplier: TIERS.atap.multiplier }
  if (user.app_metadata?.provider === 'github')   return { tier: 'verified', multiplier: TIERS.verified.multiplier }
  if (user.email_confirmed_at)                    return { tier: 'email',    multiplier: TIERS.email.multiplier }
  return { tier: 'email', multiplier: TIERS.email.multiplier }
}

/**
 * Derive identity tier from a Supabase session object.
 * Convenience wrapper around getTierMultiplier — preserves existing callers.
 */
export function getTierFromSession(session) {
  return getTierMultiplier(session?.user ?? null).tier
}

/**
 * Auth operations — wraps Supabase Auth.
 * All functions return { user, error } (mirrors Supabase shape for consistency).
 * When supabase is null (Phase 1), all operations return a stub error.
 */

import { supabase } from './supabase.js'

const STUB_ERR = { user: null, session: null, error: { message: 'Auth requires Supabase (Phase 2)' } }

// ── Email + Password ──────────────────────────────────────────────────────────

/**
 * Register with email + password. Supabase sends a verification email.
 * The `username` is stored in user_metadata; Contributors row is created by
 * the `handle_new_user` DB trigger (set up alongside 001_initial_schema.sql).
 */
export async function signUp(email, password, username) {
  if (!supabase) return STUB_ERR
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${window.location.origin}/#/contributors`,
    },
  })
}

/**
 * Sign in with email + password.
 * Returns error if email is not verified yet.
 */
export async function signIn(email, password) {
  if (!supabase) return STUB_ERR
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * GitHub OAuth sign-in.
 * Redirects to GitHub then back to /#/contributors.
 * On return, Supabase picks up the session from the URL fragment.
 */
export async function signInWithGitHub() {
  if (!supabase) return STUB_ERR
  return supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${window.location.origin}/#/contributors` },
  })
}

export async function signOut() {
  if (!supabase) return STUB_ERR
  return supabase.auth.signOut()
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(callback) {
  if (!supabase) return () => {}
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return () => subscription.unsubscribe()
}

/**
 * Get the current session synchronously (may be null).
 */
export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session ?? null
}

// ── Identity tier derivation ──────────────────────────────────────────────────

/**
 * Determine identity tier from a Supabase session.
 * - GitHub OAuth → 'verified'
 * - Confirmed email → 'email'
 * - TunnelMind desktop attestation (checked via user_metadata) → 'atap'
 */
export function getTierFromSession(session) {
  if (!session?.user) return 'email'
  const user = session.user
  if (user.user_metadata?.atap_verified) return 'atap'
  if (user.app_metadata?.provider === 'github') return 'verified'
  if (user.email_confirmed_at) return 'email'
  return 'email'
}

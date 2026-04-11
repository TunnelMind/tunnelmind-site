/**
 * StripeConnect — contributor payout setup dashboard.
 *
 * 4 states:
 *   not_set_up         — no Stripe account created yet
 *   onboarding_incomplete — account created but charges_enabled = false
 *   eligible           — fully onboarded, balance shown
 *   deauthorized       — contributor disconnected their Stripe account
 */

import React, { useState, useEffect } from 'react'
import { useTM } from '../lib/state.jsx'
import { calculateScore } from '../lib/scoring.js'

const API_BASE = '/api/stripe'

const MONO = { fontFamily: 'var(--font-mono)' }
const DIM  = { ...MONO, fontSize: '9px', color: 'var(--chrome-text-dim)' }
const BRIGHT = { ...MONO, fontSize: '10px', color: 'var(--chrome-text-bright)' }

function Label({ children }) {
  return (
    <div style={{ ...MONO, fontSize: '9px', color: 'var(--chrome-text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
      {children}
    </div>
  )
}

function ActionButton({ onClick, disabled, children, color = 'var(--accent-green)' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...MONO, fontSize: '10px', color: disabled ? 'var(--chrome-text-dim)' : color,
        background: 'var(--chrome-bg2)', border: '1px solid var(--chrome-border)',
        borderRadius: '3px', padding: '8px 16px', cursor: disabled ? 'default' : 'pointer',
        letterSpacing: '0.06em',
      }}
    >
      {children}
    </button>
  )
}

// ── State: Not set up ─────────────────────────────────────────────────────────

function NotSetUp({ contributorId, onAccountCreated }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_BASE}/connect/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contributor_id: contributorId }),
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error)
      onAccountCreated(d.account_id)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Label>Payout Setup</Label>
      <p style={{ ...DIM, marginBottom: '16px', lineHeight: 1.6 }}>
        Connect a bank account to receive monthly payouts when TunnelMind becomes profitable.
        Uses Stripe Express — you control your own account.
      </p>
      {error && <div style={{ ...DIM, color: 'var(--accent-red)', marginBottom: '10px' }}>{error}</div>}
      <ActionButton onClick={handleCreate} disabled={loading}>
        {loading ? 'CREATING…' : 'SET UP PAYOUTS'}
      </ActionButton>
    </div>
  )
}

// ── State: Onboarding incomplete ──────────────────────────────────────────────

function OnboardingIncomplete({ contributorId, onOnboardingStarted }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleOnboard() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_BASE}/connect/onboarding-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contributor_id: contributorId }),
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error)
      onOnboardingStarted()
      window.location.href = d.url
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Label>Payout Setup — Incomplete</Label>
      <p style={{ ...DIM, marginBottom: '16px', lineHeight: 1.6 }}>
        Your Stripe account was created but bank details haven't been entered yet.
        Complete onboarding to receive payouts.
      </p>
      {error && <div style={{ ...DIM, color: 'var(--accent-red)', marginBottom: '10px' }}>{error}</div>}
      <ActionButton onClick={handleOnboard} disabled={loading} color='var(--accent-amber)'>
        {loading ? 'LOADING…' : 'COMPLETE ONBOARDING →'}
      </ActionButton>
    </div>
  )
}

// ── State: Eligible ───────────────────────────────────────────────────────────

function Eligible({ balance_cents, score, tier }) {
  const dollars   = (balance_cents / 100).toFixed(2)
  const threshold = 10.00

  return (
    <div>
      <Label>Payout Status — Active</Label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: 'var(--chrome-border)', border: '1px solid var(--chrome-border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
        {[
          { label: 'Balance',    value: `$${dollars}` },
          { label: 'Score',      value: `${score}pt` },
          { label: 'Tier',       value: tier },
        ].map(cell => (
          <div key={cell.label} style={{ padding: '10px 12px', background: 'var(--chrome-bg2)', textAlign: 'center' }}>
            <div style={{ ...MONO, fontSize: '13px', fontWeight: 600, color: 'var(--accent-green)', marginBottom: '3px' }}>{cell.value}</div>
            <div style={{ ...DIM }}>{cell.label}</div>
          </div>
        ))}
      </div>
      <div style={DIM}>
        {balance_cents < threshold * 100
          ? `Balance below $${threshold.toFixed(2)} minimum — carries forward to next month.`
          : 'Eligible for next payout cycle.'}
        {' '}Payouts run monthly.
      </div>
    </div>
  )
}

// ── State: Deauthorized ───────────────────────────────────────────────────────

function Deauthorized({ contributorId, onReconnect }) {
  const [loading, setLoading] = useState(false)

  async function handleReconnect() {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/connect/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contributor_id: contributorId }),
      })
      const d = await r.json()
      if (d.ok) onReconnect(d.account_id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Label>Payout Status — Disconnected</Label>
      <p style={{ ...DIM, marginBottom: '16px', lineHeight: 1.6 }}>
        Your Stripe account was disconnected. Your contribution score is preserved —
        reconnect to resume receiving payouts.
      </p>
      <ActionButton onClick={handleReconnect} disabled={loading} color='var(--accent-amber)'>
        {loading ? 'RECONNECTING…' : 'RECONNECT STRIPE'}
      </ActionButton>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StripeConnect() {
  const { state } = useTM()

  const score      = calculateScore(state.contributionLedger)
  const tier       = 'email'  // Phase 2: derive from auth state
  const contributor = state.stripeContributor || null

  const [stripeState, setStripeState] = useState(null)  // loaded from contributor

  useEffect(() => {
    if (!contributor) {
      setStripeState('not_set_up')
      return
    }
    if (contributor.stripe_deauthorized) { setStripeState('deauthorized'); return }
    if (!contributor.stripe_account_id)  { setStripeState('not_set_up'); return }
    if (!contributor.stripe_onboarded)   { setStripeState('onboarding_incomplete'); return }
    setStripeState('eligible')
  }, [contributor])

  // Check for Stripe redirect return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe') === 'return') {
      // Onboarding completed — re-fetch contributor status in Phase 2
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    }
  }, [])

  if (!stripeState) return null

  const contributorId = contributor?.id

  return (
    <div style={{
      background: 'var(--chrome-bg2)',
      border: '1px solid var(--chrome-border)',
      borderRadius: '3px',
      padding: '16px',
      marginTop: '24px',
    }}>
      {stripeState === 'not_set_up' && (
        <NotSetUp
          contributorId={contributorId}
          onAccountCreated={() => setStripeState('onboarding_incomplete')}
        />
      )}
      {stripeState === 'onboarding_incomplete' && (
        <OnboardingIncomplete
          contributorId={contributorId}
          onOnboardingStarted={() => {}}
        />
      )}
      {stripeState === 'eligible' && (
        <Eligible
          balance_cents={contributor?.payout_balance_cents || 0}
          score={score}
          tier={tier}
        />
      )}
      {stripeState === 'deauthorized' && (
        <Deauthorized
          contributorId={contributorId}
          onReconnect={() => setStripeState('onboarding_incomplete')}
        />
      )}
      <div style={{ ...DIM, marginTop: '12px', borderTop: '1px solid var(--chrome-border)', paddingTop: '10px' }}>
        Payouts via Stripe Express. TunnelMind never stores your banking details.
        Supabase persistence required for live payouts (Phase 2).
      </div>
    </div>
  )
}

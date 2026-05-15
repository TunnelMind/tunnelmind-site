/**
 * AuthModal — email/password + GitHub OAuth.
 *
 * Two tabs: Sign Up | Sign In
 * Shows "Auth unavailable" message when Supabase not configured.
 *
 * Props:
 *   open      boolean
 *   onClose   () => void
 *   onAuth    (session) => void   called after successful auth
 */

import React, { useState } from 'react'
import { signUp, signIn, signInWithGitHub } from '../lib/auth.js'
import { isLive } from '../lib/supabase.js'

const MONO = { fontFamily: 'var(--font-mono)' }
const DIM  = { ...MONO, fontSize: '11px',  color: 'var(--chrome-text-dim)' }
const LABEL = { ...MONO, fontSize: '11px', color: 'var(--chrome-text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }
const INPUT_STYLE = {
  ...MONO, fontSize: '13px', color: 'var(--chrome-text-bright)',
  background: 'var(--chrome-bg)', border: '1px solid var(--chrome-border)',
  borderRadius: '3px', padding: '8px 10px', width: '100%', boxSizing: 'border-box',
  outline: 'none',
}
const BTN = (disabled, color = 'var(--accent-green)') => ({
  ...MONO, fontSize: '12px', color: disabled ? 'var(--chrome-text-dim)' : color,
  background: 'var(--chrome-bg2)', border: '1px solid var(--chrome-border)',
  borderRadius: '3px', padding: '8px 20px', cursor: disabled ? 'default' : 'pointer',
  letterSpacing: '0.06em', width: '100%',
})

export default function AuthModal({ open, onClose, onAuth }) {
  const [tab,      setTab]      = useState('signup')   // 'signup' | 'signin'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState(null)       // { type: 'ok'|'err', text }

  if (!open) return null

  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (!isLive) {
      setMessage({ type: 'err', text: 'Auth unavailable: Supabase not configured (Phase 2)' })
      return
    }
    setLoading(true)
    setMessage(null)

    try {
      if (tab === 'signup') {
        if (!username.trim()) { setMessage({ type: 'err', text: 'Username required' }); return }
        const { error } = await signUp(email, password, username)
        if (error) { setMessage({ type: 'err', text: error.message }); return }
        setMessage({ type: 'ok', text: 'Check your email to confirm your account.' })
      } else {
        const { data, error } = await signIn(email, password)
        if (error) { setMessage({ type: 'err', text: error.message }); return }
        onAuth(data.session)
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGitHub() {
    if (!isLive) {
      setMessage({ type: 'err', text: 'Auth unavailable: Supabase not configured (Phase 2)' })
      return
    }
    const { error } = await signInWithGitHub()
    if (error) setMessage({ type: 'err', text: error.message })
    // On success: page redirects to GitHub, returns to /#/contributors
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{
        background: 'var(--chrome-bg2)', border: '1px solid var(--chrome-border)',
        borderRadius: '4px', width: '340px', padding: '24px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ ...MONO, fontSize: '13px', color: 'var(--chrome-text-bright)', letterSpacing: '0.1em' }}>
            {tab === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </span>
          <button onClick={onClose} style={{ ...MONO, fontSize: '16px', color: 'var(--chrome-text-dim)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '1px', marginBottom: '20px', background: 'var(--chrome-border)', borderRadius: '3px', overflow: 'hidden' }}>
          {['signup', 'signin'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setMessage(null) }}
              style={{
                ...MONO, flex: 1, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '7px', border: 'none', cursor: 'pointer',
                background: tab === t ? 'var(--accent-green)' : 'var(--chrome-bg)',
                color: tab === t ? 'var(--chrome-bg)' : 'var(--chrome-text-dim)',
              }}
            >
              {t === 'signup' ? 'Sign Up' : 'Sign In'}
            </button>
          ))}
        </div>

        {/* Phase 2 notice */}
        {!isLive && (
          <div style={{ ...DIM, background: 'var(--chrome-bg)', border: '1px solid var(--chrome-border)', borderRadius: '3px', padding: '8px 10px', marginBottom: '16px' }}>
            Auth requires Phase 2 (Supabase). Form shown for preview only.
          </div>
        )}

        {/* Email form */}
        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tab === 'signup' && (
            <div>
              <div style={LABEL}>Username</div>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your-handle"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-z0-9_-]+"
                style={INPUT_STYLE}
              />
              <div style={{ ...DIM, marginTop: '4px' }}>Lowercase, numbers, hyphens, underscores. Public.</div>
            </div>
          )}
          <div>
            <div style={LABEL}>Email</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={INPUT_STYLE} />
          </div>
          <div>
            <div style={LABEL}>Password</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={INPUT_STYLE} />
          </div>

          {message && (
            <div style={{ ...DIM, color: message.type === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {message.text}
            </div>
          )}

          <button type="submit" disabled={loading} style={BTN(loading)}>
            {loading ? 'WORKING…' : tab === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--chrome-border)' }} />
          <span style={DIM}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--chrome-border)' }} />
        </div>

        {/* GitHub OAuth */}
        <button onClick={handleGitHub} disabled={loading} style={BTN(loading, 'var(--chrome-text-bright)')}>
          CONTINUE WITH GITHUB
        </button>

        <div style={{ ...DIM, marginTop: '14px', textAlign: 'center', lineHeight: 1.5 }}>
          {tab === 'signup'
            ? 'Email verification required before contributions are recorded.'
            : 'GitHub login grants Verified tier (×1.0 score multiplier).'}
        </div>
      </div>
    </div>
  )
}

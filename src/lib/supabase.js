import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
export const isLive   = supabase !== null
// TODO(2026-Q3): remove isPhase2 alias, migrate callers to isLive
// Call sites at last count: 7 (state.jsx ×2, Contributors.jsx ×1, AuthModal.jsx ×4)
export const isPhase2 = isLive

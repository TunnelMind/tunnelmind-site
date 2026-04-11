/**
 * Supabase client.
 * Phase 1: stub (supabase = null, all operations fall back to local state).
 * Phase 2: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set in CF Pages → real client activates.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export const isPhase2 = supabase !== null

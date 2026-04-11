/**
 * TunnelMind Global State
 * Phase 1: in-memory + localStorage (no Supabase yet)
 */
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { generateFingerprint } from './fingerprint.js'
import { calculateScore } from './scoring.js'
import { supabase, isPhase2 } from './supabase.js'
import { onAuthStateChange, getSession, getTierFromSession } from './auth.js'

const TMContext = createContext(null)

// ── Initial State ──────────────────────────────────────────────────
function loadPersisted() {
  try {
    const raw = localStorage.getItem('tm_state')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

const DEFAULT_STATE = {
  // sentence_id → { up: number, down: number, userVote: 1|-1|0 }
  sentenceVotes: {},
  // sentence_id → [{ id, text, votes: {up, down, userVote}, isApplied, author, ts }]
  corrections: {},
  // sentence_id → [{ id, text, author, isAuthor, votes: {up, down, userVote}, replies: [...], ts }]
  annotations: {},
  // sentence_id → { count: number, userVoted: boolean, revealed: boolean }
  redactionVotes: {},
  // sentence_id → string (after author applies correction)
  appliedTexts: {},
  // Document state — author writes here, community interacts
  // pageId → { title, raw, published, paragraphs: [{ key, sentences: [{ key, text }] }] }
  documents: {},
  // contributor state
  contributors: [],
  contributionLedger: [], // append-only
  // UI state
  authorMode: false,
  dismissedIntro: false,
  selectedSentenceId: null,
  annotationPanelOpen: false,
  userHandle: null,
  fingerprint: null,
  // Auth state (Phase 2 — null until Supabase is configured)
  authSession: null,
  authUser: null,
  authTier: 'email',
  stripeContributor: null,
}

// ── Reducer ────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'INIT_FINGERPRINT':
      return { ...state, fingerprint: action.fingerprint }

    case 'SET_AUTH_SESSION':
      return {
        ...state,
        authSession: action.session,
        authUser: action.session?.user ?? null,
        authTier: action.tier ?? 'email',
        userHandle: action.session?.user?.user_metadata?.username || state.userHandle,
      }

    case 'SET_STRIPE_CONTRIBUTOR':
      return { ...state, stripeContributor: action.contributor }

    case 'SET_AUTHOR_MODE':
      return { ...state, authorMode: action.value }

    case 'DISMISS_INTRO':
      return { ...state, dismissedIntro: true }

    case 'SELECT_SENTENCE':
      return {
        ...state,
        selectedSentenceId: action.id,
        annotationPanelOpen: action.id !== null,
      }

    case 'CLOSE_ANNOTATION_PANEL':
      return { ...state, annotationPanelOpen: false, selectedSentenceId: null }

    case 'SET_HANDLE':
      return { ...state, userHandle: action.handle }

    // ── Voting ───────────────────────────────────────────────────
    case 'VOTE_SENTENCE': {
      const prev = state.sentenceVotes[action.sentenceId] || { up: 0, down: 0, userVote: 0 }
      // toggle logic: if same direction, remove vote
      let newUserVote = action.direction
      let upDelta = 0, downDelta = 0
      if (prev.userVote === action.direction) {
        // un-vote
        newUserVote = 0
        if (action.direction === 1) upDelta = -1
        else downDelta = -1
      } else {
        // switch or fresh vote
        if (prev.userVote === 1) upDelta = -1
        else if (prev.userVote === -1) downDelta = -1
        if (action.direction === 1) upDelta += 1
        else downDelta += 1
      }
      const newVotes = {
        up: Math.max(0, prev.up + upDelta),
        down: Math.max(0, prev.down + downDelta),
        userVote: newUserVote,
      }
      const entry = {
        contributor_fingerprint: state.fingerprint,
        action_type: 'vote_cast',
        target_id: action.sentenceId,
        target_type: 'sentence',
        points: 1,
        ts: Date.now(),
      }
      return {
        ...state,
        sentenceVotes: { ...state.sentenceVotes, [action.sentenceId]: newVotes },
        contributionLedger: [...state.contributionLedger, entry],
      }
    }

    case 'VOTE_CORRECTION': {
      const correctionList = state.corrections[action.sentenceId] || []
      const newList = correctionList.map(c => {
        if (c.id !== action.correctionId) return c
        const prev = c.votes
        let newUserVote = action.direction
        let upDelta = 0, downDelta = 0
        if (prev.userVote === action.direction) {
          newUserVote = 0
          if (action.direction === 1) upDelta = -1
          else downDelta = -1
        } else {
          if (prev.userVote === 1) upDelta = -1
          else if (prev.userVote === -1) downDelta = -1
          if (action.direction === 1) upDelta += 1
          else downDelta += 1
        }
        return {
          ...c,
          votes: {
            up: Math.max(0, prev.up + upDelta),
            down: Math.max(0, prev.down + downDelta),
            userVote: newUserVote,
          },
        }
      })
      // sort by net score desc
      newList.sort((a, b) => (b.votes.up - b.votes.down) - (a.votes.up - a.votes.down))
      return {
        ...state,
        corrections: { ...state.corrections, [action.sentenceId]: newList },
      }
    }

    case 'VOTE_ANNOTATION': {
      const annList = state.annotations[action.sentenceId] || []
      function voteInList(list, targetId) {
        return list.map(ann => {
          if (ann.id === targetId) {
            const prev = ann.votes
            let newUserVote = action.direction
            let upDelta = 0, downDelta = 0
            if (prev.userVote === action.direction) {
              newUserVote = 0
              if (action.direction === 1) upDelta = -1
              else downDelta = -1
            } else {
              if (prev.userVote === 1) upDelta = -1
              else if (prev.userVote === -1) downDelta = -1
              if (action.direction === 1) upDelta += 1
              else downDelta += 1
            }
            return {
              ...ann,
              votes: {
                up: Math.max(0, prev.up + upDelta),
                down: Math.max(0, prev.down + downDelta),
                userVote: newUserVote,
              },
            }
          }
          if (ann.replies && ann.replies.length) {
            return { ...ann, replies: voteInList(ann.replies, targetId) }
          }
          return ann
        })
      }
      return {
        ...state,
        annotations: { ...state.annotations, [action.sentenceId]: voteInList(annList, action.annotationId) },
      }
    }

    // ── Corrections ──────────────────────────────────────────────
    case 'ADD_CORRECTION': {
      const prev = state.corrections[action.sentenceId] || []
      const newCorrection = {
        id: `corr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: action.text,
        author: state.userHandle || 'Anonymous',
        fingerprint: state.fingerprint,
        votes: { up: 0, down: 0, userVote: 0 },
        isApplied: false,
        ts: Date.now(),
      }
      const entry = {
        action_type: 'correction_proposed',
        target_id: newCorrection.id,
        target_type: 'correction',
        points: 0, // points awarded when accepted
        ts: Date.now(),
      }
      return {
        ...state,
        corrections: { ...state.corrections, [action.sentenceId]: [...prev, newCorrection] },
        contributionLedger: [...state.contributionLedger, entry],
      }
    }

    case 'APPLY_CORRECTION': {
      const corrList = (state.corrections[action.sentenceId] || []).map(c => ({
        ...c,
        isApplied: c.id === action.correctionId,
      }))
      const entry = {
        action_type: 'correction_accepted',
        target_id: action.correctionId,
        target_type: 'correction',
        points: 10,
        ts: Date.now(),
      }
      return {
        ...state,
        corrections: { ...state.corrections, [action.sentenceId]: corrList },
        appliedTexts: { ...state.appliedTexts, [action.sentenceId]: action.text },
        contributionLedger: [...state.contributionLedger, entry],
      }
    }

    // ── Annotations ──────────────────────────────────────────────
    case 'ADD_ANNOTATION': {
      const prev = state.annotations[action.sentenceId] || []
      const newAnn = {
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: action.text,
        author: state.userHandle || (state.authorMode ? 'TunnelMind' : 'Anonymous'),
        isAuthor: state.authorMode,
        fingerprint: state.fingerprint,
        votes: { up: 0, down: 0, userVote: 0 },
        replies: [],
        ts: Date.now(),
        parentId: action.parentId || null,
      }
      let newList
      if (action.parentId) {
        // add as reply
        function addReply(list) {
          return list.map(ann => {
            if (ann.id === action.parentId) {
              return { ...ann, replies: [...(ann.replies || []), newAnn] }
            }
            if (ann.replies && ann.replies.length) {
              return { ...ann, replies: addReply(ann.replies) }
            }
            return ann
          })
        }
        newList = addReply(prev)
      } else {
        newList = [...prev, newAnn]
      }
      const entry = {
        action_type: 'annotation_created',
        target_id: newAnn.id,
        target_type: 'annotation',
        points: 5,
        ts: Date.now(),
      }
      return {
        ...state,
        annotations: { ...state.annotations, [action.sentenceId]: newList },
        contributionLedger: [...state.contributionLedger, entry],
      }
    }

    // ── Redaction ────────────────────────────────────────────────
    case 'VOTE_REDACTION': {
      const prev = state.redactionVotes[action.sentenceId] || { count: 0, userVoted: false, revealed: false }
      if (prev.userVoted) return state // already voted
      const newCount = prev.count + 1
      const revealed = newCount >= action.threshold
      return {
        ...state,
        redactionVotes: {
          ...state.redactionVotes,
          [action.sentenceId]: { count: newCount, userVoted: true, revealed },
        },
      }
    }

    // ── Documents ────────────────────────────────────────────────
    case 'UPDATE_DOC_TITLE': {
      const prev = state.documents[action.pageId] || {}
      return {
        ...state,
        documents: { ...state.documents, [action.pageId]: { ...prev, title: action.title } },
      }
    }

    case 'UPDATE_DOC_RAW': {
      const prev = state.documents[action.pageId] || {}
      return {
        ...state,
        documents: { ...state.documents, [action.pageId]: { ...prev, raw: action.raw } },
      }
    }

    case 'PUBLISH_DOC': {
      const prev = state.documents[action.pageId] || {}
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.pageId]: { ...prev, published: true, paragraphs: action.paragraphs },
        },
      }
    }

    case 'UNPUBLISH_DOC': {
      const prev = state.documents[action.pageId] || {}
      return {
        ...state,
        documents: { ...state.documents, [action.pageId]: { ...prev, published: false } },
      }
    }

    default:
      return state
  }
}

// ── Provider ───────────────────────────────────────────────────────
export function TMProvider({ children }) {
  const persisted = loadPersisted()
  const [state, dispatch] = useReducer(reducer, persisted || DEFAULT_STATE)
  const ledgerLengthRef = useRef(state.contributionLedger.length)

  // init fingerprint
  useEffect(() => {
    generateFingerprint().then(fp => {
      dispatch({ type: 'INIT_FINGERPRINT', fingerprint: fp })
    })
  }, [])

  // Phase 2: subscribe to Supabase auth state
  useEffect(() => {
    if (!isPhase2) return

    // Load initial session
    getSession().then(session => {
      if (session) {
        dispatch({ type: 'SET_AUTH_SESSION', session, tier: getTierFromSession(session) })
        loadStripeContributor(session, dispatch)
      }
    })

    // Subscribe to changes (sign-in, sign-out, token refresh)
    const unsub = onAuthStateChange((event, session) => {
      dispatch({ type: 'SET_AUTH_SESSION', session, tier: getTierFromSession(session) })
      if (session) {
        loadStripeContributor(session, dispatch)
      }
    })
    return unsub
  }, [])

  // Phase 2: flush new ledger entries to Supabase when authenticated
  useEffect(() => {
    if (!isPhase2 || !state.authUser || !state.authSession) return

    const currentLen = state.contributionLedger.length
    if (currentLen <= ledgerLengthRef.current) {
      ledgerLengthRef.current = currentLen
      return
    }

    // New entries since last flush
    const newEntries = state.contributionLedger.slice(ledgerLengthRef.current)
    ledgerLengthRef.current = currentLen

    // Write to Supabase (fire and forget — local state is source of truth in Phase 1)
    const userId = state.authUser.id
    const rows = newEntries
      .filter(e => e.points > 0)  // skip zero-point entries
      .map(e => ({
        contributor_id: userId,
        contributor_fingerprint: state.fingerprint,
        action_type: e.action_type,
        target_id: e.target_id ?? null,
        target_type: e.target_type ?? null,
        points: e.points,
      }))

    if (rows.length > 0) {
      supabase.from('contribution_ledger').insert(rows).then(({ error }) => {
        if (error) console.warn('Ledger write failed:', error.message)
      })
    }
  }, [state.contributionLedger])

  // persist state (throttled — exclude auth session from localStorage)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const toSave = {
          ...state,
          annotationPanelOpen: false,
          selectedSentenceId: null,
          authSession: null,     // never persist session to localStorage
          authUser: null,
          stripeContributor: null,
        }
        localStorage.setItem('tm_state', JSON.stringify(toSave))
      } catch {}
    }, 500)
    return () => clearTimeout(id)
  }, [state])

  return (
    <TMContext.Provider value={{ state, dispatch }}>
      {children}
    </TMContext.Provider>
  )
}

// ── Auth helpers ───────────────────────────────────────────────────
async function loadStripeContributor(session, dispatch) {
  if (!supabase || !session?.user) return
  const { data } = await supabase
    .from('contributors')
    .select('id, stripe_account_id, stripe_onboarded, stripe_deauthorized, payout_balance_cents, identity_tier')
    .eq('id', session.user.id)
    .single()
  if (data) dispatch({ type: 'SET_STRIPE_CONTRIBUTOR', contributor: data })
}

export function useTM() {
  const ctx = useContext(TMContext)
  if (!ctx) throw new Error('useTM must be used within TMProvider')
  return ctx
}

// ── Selectors ──────────────────────────────────────────────────────
export function getSentenceNetScore(state, sentenceId) {
  const v = state.sentenceVotes[sentenceId]
  if (!v) return 0
  return v.up - v.down
}

export function getCorrectionNetScore(correction) {
  return correction.votes.up - correction.votes.down
}

export function getCorrectionCount(state, sentenceId) {
  return (state.corrections[sentenceId] || []).length
}

export function getAnnotationCount(state, sentenceId) {
  return (state.annotations[sentenceId] || []).length
}

export function getRedactionState(state, sentenceId, threshold = 5) {
  return state.redactionVotes[sentenceId] || { count: 0, userVoted: false, revealed: false }
}

export function getDisplayText(state, sentenceId, originalText) {
  return state.appliedTexts[sentenceId] || originalText
}

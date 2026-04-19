// TunnelMind Global State
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { generateFingerprint } from './fingerprint.js'
import { calculateScore } from './scoring.js'
import { supabase, isLive } from './supabase.js'
import { onAuthStateChange, getSession, getTierFromSession } from './auth.js'

const TMContext = createContext(null)

// ── Paragraph parser (mirrors DocumentEditor) ──────────────────────
function parseParagraphs(raw) {
  return raw
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map((para, pi) => ({
      key: `p${pi}`,
      sentences: para
        .replace(/([.!?])\s+/g, '$1||')
        .split('||')
        .map(s => s.trim())
        .filter(Boolean)
        .map((text, si) => ({ key: `s${si}`, text })),
    }))
}

// ── Seeded documents (shown to all visitors until author publishes) ─
const SEEDED_DOCUMENTS = {
  dialog: {
    title: 'The Surveillance Economy Has a Balance Sheet',
    raw: `The surveillance economy operates on a simple premise: your behavior is worth more to advertisers than your privacy is worth to you. They've been studying your browsing patterns, location habits, purchase history, and political dispositions for years. The invoice has never been shown to you. TunnelMind shows you the invoice.

Every domain you visit fires requests to dozens of third parties you never consented to contact. DoubleClick. LiveRamp. Oracle BlueKai. Acxiom. These aren't incidental — they're the business model. When a news site loads, the 47 trackers that load with it are buying and selling a profile of you in under 100 milliseconds.

The surveillance ecosystem isn't a collection of independent actors. It's a coordinated intelligence apparatus. When one tracker fires, others fire milliseconds later — every time, in sequence. That's not coincidence. That's a protocol. TunnelMind calls it Resonance: the timing-pattern coordination graph that shows which actors are talking to each other about you.

TunnelMind is built on a single thesis: you can't fight what you can't see. Every tool we build makes one more piece of the surveillance economy visible, legible, and contestable. The Surveillance Receipt. The tracker database. GhostRoute. The browser extension. The surveillance map. These are instruments of observation, not products. The target is the entire surveillance economy — exposed, modeled, and reverse-engineered.

The internet is fracturing into legal jurisdictions. Your DNS traffic crosses FISA 702 reach, Five Eyes agreements, GDPR-adequate zones, and state surveillance regimes with no indication of which legal rules apply where. GhostRoute traces that path, assigns legal citations to each hop, and issues a cryptographically signed certificate you can put in a legal filing.

This platform exists for people who take that seriously. Read what we're building. Annotate what you disagree with. Propose corrections to anything that's wrong. The surveillance economy has been studying you for years. Now you study them.`,
    published: true,
    paragraphs: null,
  },
  roadmap: {
    title: 'What We\'re Building',
    raw: `The current live tools — Surveillance Receipt, NetProbe, Surveillance Radar, the Tracker Data API, GhostRoute Certificate Verification, and the browser extension — are instruments in the same project: making the surveillance economy legible. All are free. None require an account.

The next layer is the personal tier. TunnelMind Personal requires an enrolled device, meaning traffic is observed at the kernel level via eBPF, not through a browser extension or proxy. The signal is real and complete. The Surveillance Map shows every actor that contacted your device, color-coded by category, updated in real time as traffic flows. Resonance shows which actors coordinate with each other through your traffic, using Pearson correlation on beacon timing patterns. Dark Mirror shows the demographic profile being bought and sold about you. Cost of You calculates what your data is worth per year, broken down by who extracts the most value.

GhostRoute is live and in testing on enrolled devices. It generates a cryptographically signed certificate proving which legal jurisdictions your DNS traffic traversed — EU GDPR-adequate zones, FISA 702 reach, Five Eyes, China, Russia — weighted by traffic volume so high-frequency domains count proportionally more. Each certificate includes GDPR Article 44 legal citations and an Ed25519 signature verifiable by any third party at data.tunnelmind.ai.

The desktop application is a Tauri shell wrapping the surveillance map and content tools. ReCenter, the companion enrollment app, handles WireGuard connect/disconnect, peer enrollment, and eBPF status display. Both apps share a config file. Enrollment binds your device to the WireGuard hub; from that point on, all DNS traffic is observed at the kernel level and feeds the personal tier tools.

The longer arc is post-quantum cryptographic infrastructure for the jurisdictional fragmentation of the internet — the splinternet. CRYSTALS-Kyber key exchange for WireGuard tunnels. eBPF XDP per-packet routing based on destination ASN and jurisdiction. A local LLM maintaining a live jurisdiction policy graph from observed traffic. The moat is being deep in WireGuard internals and eBPF before anyone else needed it for this purpose.`,
    published: true,
    paragraphs: null,
  },
  about: {
    title: 'Origin',
    raw: `Networks are not neutral infrastructure. Every packet has a path, and that path is a legal jurisdiction, a business agreement, a surveillance opportunity. The BGP routing table is a map of power relationships between carriers, governments, and data brokers. Most people never see the map.

The surveillance question is impossible to ignore once you look at it directly. Your phone contacts hundreds of domains before you unlock it in the morning. Your browser fires requests to surveillance infrastructure before the page you actually requested finishes loading. The business model of the modern internet is your behavior, sold at auction in under 100 milliseconds, with no disclosure of who bought it or what they paid.

TunnelMind started as a question: what if you could see all of it? Not a privacy tool that blocks some trackers. A visibility instrument that shows you the full scope — every actor, every coordination pattern, every dollar your behavior generates for the surveillance economy, every legal jurisdiction your data traverses. The surveillance economy has a balance sheet. You've never seen your side of it.

The architecture runs at the kernel level because that's the only place where the signal is complete. Browser extensions intercept some traffic. Proxies intercept more. eBPF TC hooks on the WireGuard interface intercept everything that transits the tunnel — no bypass possible, no blind spots. If it goes through the tunnel, it gets observed, classified, and attributed.

The thesis is adversarial intelligence. The surveillance industry has spent decades building behavioral dossiers using pattern-recognition methods they've never disclosed. TunnelMind applies the same methods to their infrastructure. Their domains, their corporate ownership trees, their coordination protocols, their legal exposure — reverse-engineered and made public.`,
    published: true,
    paragraphs: null,
  },
}

// Pre-compute paragraphs for seeded docs
for (const doc of Object.values(SEEDED_DOCUMENTS)) {
  doc.paragraphs = parseParagraphs(doc.raw)
}

// ── Initial State ──────────────────────────────────────────────────
function loadPersisted() {
  try {
    const raw = localStorage.getItem('tm_state')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

// Merge seeded documents with persisted state.
// Seeded pages only show when the author has not published their own version.
function getInitialState() {
  const persisted = loadPersisted()
  const seedDocs = {}
  for (const [pageId, seed] of Object.entries(SEEDED_DOCUMENTS)) {
    const persDoc = persisted?.documents?.[pageId]
    // Use persisted if author has published their own content (raw differs from seed)
    if (persDoc?.published && persDoc.raw && persDoc.raw !== seed.raw) {
      seedDocs[pageId] = persDoc
    } else {
      seedDocs[pageId] = seed
    }
  }
  if (!persisted) return { ...DEFAULT_STATE, documents: seedDocs }
  return { ...persisted, documents: { ...persisted.documents, ...seedDocs } }
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
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)
  const ledgerLengthRef = useRef(state.contributionLedger.length)

  // init fingerprint
  useEffect(() => {
    generateFingerprint().then(fp => {
      dispatch({ type: 'INIT_FINGERPRINT', fingerprint: fp })
    })
  }, [])

  // Phase 2: subscribe to Supabase auth state
  useEffect(() => {
    if (!isLive) return

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
    if (!isLive || !state.authUser || !state.authSession) return

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

// TunnelMind Global State
//
// All Shadow Graph community-platform state was archived during the May 2026
// pivot. The only piece of cross-page UI state that survived: whether the
// visitor dismissed the IntroBox welcome modal. Persisted to localStorage so
// the dismissal sticks across reloads.
import React, { createContext, useContext, useReducer, useEffect } from 'react'

const TMContext = createContext(null)

const DEFAULT_STATE = {
  dismissedIntro: false,
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem('tm_state')
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_STATE
}

function reducer(state, action) {
  switch (action.type) {
    case 'DISMISS_INTRO':
      return { ...state, dismissedIntro: true }
    default:
      return state
  }
}

export function TMProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadPersisted)

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem('tm_state', JSON.stringify(state))
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

export function useTM() {
  const ctx = useContext(TMContext)
  if (!ctx) throw new Error('useTM must be used within TMProvider')
  return ctx
}

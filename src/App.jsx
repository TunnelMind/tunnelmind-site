import React, { useState, useEffect, useCallback } from 'react'
import { TMProvider, useTM } from './lib/state.jsx'

import SubredditNav from './components/SubredditNav.jsx'
import { StatusBar } from './components/WPChrome.jsx'
import AnnotationPanel from './components/AnnotationPanel.jsx'
import IntroBox from './components/IntroBox.jsx'

import Dialog from './pages/Dialog.jsx'
import Products from './pages/Products.jsx'
import Roadmap from './pages/Roadmap.jsx'
import Contributors from './pages/Contributors.jsx'
import About from './pages/About.jsx'

// ── Hash Router ────────────────────────────────────────────────────
function getPageFromHash() {
  const hash = window.location.hash.replace('#/', '').replace('#', '').trim()
  if (!hash || hash === '/') return 'dialog'
  // strip trailing slash
  return hash.replace(/^\//, '').replace(/\/$/, '') || 'dialog'
}

function setHash(page) {
  window.location.hash = page === 'dialog' ? '/' : `/${page}`
}

// ── Inner App (needs TMProvider context) ─────────────────────────
function AppInner() {
  const [page, setPage] = useState(getPageFromHash)
  const { state } = useTM()

  // Listen to hash changes
  useEffect(() => {
    function onHashChange() {
      setPage(getPageFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleNavigate = useCallback((newPage) => {
    setPage(newPage)
    setHash(newPage)
    window.scrollTo(0, 0)
  }, [])

  // Page → component map
  const pageComponent = {
    dialog: <Dialog onNavigate={handleNavigate} />,
    products: <Products />,
    roadmap: <Roadmap />,
    contributors: <Contributors />,
    about: <About />,
  }

  const currentPageEl = pageComponent[page] || pageComponent.dialog

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--chrome-bg)',
      // Shift content left when annotation panel is open
      paddingRight: state.annotationPanelOpen ? 'var(--annotation-width)' : '0',
      transition: 'padding-right 0.2s ease',
    }}>
      {/* Nav bar */}
      <SubredditNav currentPage={page} onNavigate={handleNavigate} />

      {/* Page content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {currentPageEl}
      </div>

      {/* Status bar */}
      <StatusBar page={page} />

      {/* Annotation panel (fixed, slides in from right) */}
      <AnnotationPanel open={state.annotationPanelOpen} />

      {/* First-visit intro */}
      <IntroBox />
    </div>
  )
}

// ── Root App ───────────────────────────────────────────────────────
export default function App() {
  return (
    <TMProvider>
      <AppInner />
    </TMProvider>
  )
}

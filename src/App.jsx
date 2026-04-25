import React, { useState, useEffect, useCallback } from 'react'
import { TMProvider, useTM } from './lib/state.jsx'

import TopNav from './components/shared/TopNav.jsx'
import Footer from './components/shared/Footer.jsx'
import { StatusBar } from './components/WPChrome.jsx'
import AnnotationPanel from './components/AnnotationPanel.jsx'
import IntroBox from './components/IntroBox.jsx'

import Landing from './pages/Landing.jsx'
import Tools from './pages/Tools.jsx'
import Api from './pages/Api.jsx'
import ReCenter from './pages/ReCenter.jsx'
import Whitepapers from './pages/Whitepapers.jsx'
import About from './pages/About.jsx'
import Pricing from './pages/Pricing.jsx'
import Extension from './pages/Extension.jsx'
import Dialog from './pages/Dialog.jsx'
import Products from './pages/Products.jsx'
import Roadmap from './pages/Roadmap.jsx'
import Contributors from './pages/Contributors.jsx'
import Receipt from './pages/Receipt.jsx'
import PrivacyPolicy from './pages/legal/PrivacyPolicy.jsx'
import TermsOfService from './pages/legal/TermsOfService.jsx'
import LawEnforcementPolicy from './pages/legal/LawEnforcementPolicy.jsx'
import AbusePolicy from './pages/legal/AbusePolicy.jsx'
import TransparencyReport from './pages/legal/TransparencyReport.jsx'
import AccountRiskDisclosure from './pages/legal/AccountRiskDisclosure.jsx'

// ── Hash Router ────────────────────────────────────────────────────
function getPageFromHash() {
  const hash = window.location.hash.replace('#/', '').replace('#', '').trim()
  if (!hash || hash === '/') return 'landing'
  return hash.replace(/^\//, '').replace(/\/$/, '') || 'landing'
}

function setHash(page) {
  window.location.hash = page === 'landing' ? '/' : `/${page}`
}

// ── Inner App (needs TMProvider context) ─────────────────────────
function AppInner() {
  const [page, setPage] = useState(getPageFromHash)
  const { state } = useTM()

  useEffect(() => {
    function onHashChange() { setPage(getPageFromHash()) }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleNavigate = useCallback((newPage) => {
    setPage(newPage)
    setHash(newPage)
    window.scrollTo(0, 0)
  }, [])

  // Pages that use the full-screen Shadow Graph layout (no footer, has StatusBar)
  const shadowGraphPages = new Set(['dialog', 'roadmap', 'contributors', 'about'])
  const isShadowGraph = shadowGraphPages.has(page)

  const pageComponent = {
    landing:      <Landing onNavigate={handleNavigate} />,
    tools:        <Tools onNavigate={handleNavigate} />,
    api:          <Api onNavigate={handleNavigate} />,
    recenter:     <ReCenter onNavigate={handleNavigate} />,
    whitepapers:  <Whitepapers />,
    about:        <About />,
    pricing:      <Pricing />,
    extension:    <Extension />,
    receipt:      <Receipt />,
    privacy:      <PrivacyPolicy />,
    terms:        <TermsOfService />,
    'law-enforcement': <LawEnforcementPolicy />,
    abuse:        <AbusePolicy />,
    transparency: <TransparencyReport />,
    'account-risk': <AccountRiskDisclosure />,
    // Legacy community pages — still accessible by hash
    dialog:       <Dialog onNavigate={handleNavigate} />,
    products:     <Products />,
    roadmap:      <Roadmap />,
    contributors: <Contributors />,
  }

  const currentPageEl = pageComponent[page] || pageComponent.landing

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--chrome-bg)',
      paddingRight: state.annotationPanelOpen ? 'var(--annotation-width)' : '0',
      transition: 'padding-right 0.2s ease',
    }}>
      <TopNav site="tunnelmind" currentPage={page} onNavigate={handleNavigate} />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {currentPageEl}
      </div>

      {isShadowGraph && <StatusBar page={page} />}

      <AnnotationPanel open={state.annotationPanelOpen} />

      {!isShadowGraph && <Footer />}

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

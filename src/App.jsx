import React, { useState, useEffect, useCallback } from 'react'

import TopNav from './components/shared/TopNav.jsx'
import Footer from './components/shared/Footer.jsx'

import Radar from './pages/Radar.jsx'
import Landing from './pages/Landing.jsx'
import Tools from './pages/Tools.jsx'
import Api from './pages/Api.jsx'
import Whitepapers from './pages/Whitepapers.jsx'
import About from './pages/About.jsx'
import Pricing from './pages/Pricing.jsx'
import Products from './pages/Products.jsx'
import Roadmap from './pages/Roadmap.jsx'
import PrivacyPolicy from './pages/legal/PrivacyPolicy.jsx'
import TermsOfService from './pages/legal/TermsOfService.jsx'
import LawEnforcementPolicy from './pages/legal/LawEnforcementPolicy.jsx'
import AbusePolicy from './pages/legal/AbusePolicy.jsx'
import TransparencyReport from './pages/legal/TransparencyReport.jsx'
import AccountRiskDisclosure from './pages/legal/AccountRiskDisclosure.jsx'

// ── History Router (clean URLs, indexable per-route) ───────────────
// Migrated from hash routing 2026-05-31 for SEO (#47). Old hash URLs
// (e.g. /#/vision) are redirected to clean URLs on first load so existing
// inbound links keep working.

const KNOWN_PAGES = new Set([
  'landing','vision','tools','api','whitepapers','about','pricing','products','roadmap',
  'privacy','terms','law-enforcement','abuse','transparency','account-risk',
])

function getPageFromPath() {
  // Backward-compat: redirect old hash routes (e.g. /#/vision) to clean URLs
  // BEFORE anything else reads the location. Done once per pageload.
  if (typeof window !== 'undefined' && window.location.hash.startsWith('#/')) {
    const hashPage = window.location.hash.replace(/^#\//, '').split('?')[0].replace(/\/$/, '')
    const query = window.location.hash.includes('?') ? '?' + window.location.hash.split('?').slice(1).join('?') : ''
    const target = !hashPage || hashPage === '/' ? '/' : `/${hashPage === 'manifesto' ? 'vision' : hashPage}`
    window.history.replaceState({}, '', target + query + window.location.search.replace(/^\?/, query ? '&' : '?'))
  }
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '')
  if (!path) return 'landing'
  // 'manifesto' was renamed to 'vision' — keep old inbound links working.
  if (path === 'manifesto') return 'vision'
  // Only return known SPA pages; unknown paths fall through to landing
  // (Cloudflare Pages serves index.html for them via SPA fallback).
  return KNOWN_PAGES.has(path) ? path : 'landing'
}

function pushPath(page) {
  const target = page === 'landing' ? '/' : `/${page}`
  if (window.location.pathname !== target) {
    window.history.pushState({}, '', target)
  }
}

// ── App ────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState(getPageFromPath)

  useEffect(() => {
    function onPopState() { setPage(getPageFromPath()) }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const handleNavigate = useCallback((newPage) => {
    setPage(newPage)
    pushPath(newPage)
    window.scrollTo(0, 0)
  }, [])

  const pageComponent = {
    landing:      <Radar onNavigate={handleNavigate} />,
    vision:       <Landing onNavigate={handleNavigate} />,
    tools:        <Tools onNavigate={handleNavigate} />,
    api:          <Api onNavigate={handleNavigate} />,
    whitepapers:  <Whitepapers />,
    about:        <About />,
    pricing:      <Pricing onNavigate={handleNavigate} />,
    privacy:      <PrivacyPolicy />,
    terms:        <TermsOfService />,
    'law-enforcement': <LawEnforcementPolicy />,
    abuse:        <AbusePolicy />,
    transparency: <TransparencyReport />,
    'account-risk': <AccountRiskDisclosure />,
    products:     <Products />,
    roadmap:      <Roadmap />,
  }

  const currentPageEl = pageComponent[page] || pageComponent.landing

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--chrome-bg)',
      position: 'relative',
    }}>
      <TopNav site="tunnelmind" currentPage={page} onNavigate={handleNavigate} />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        {currentPageEl}
      </div>

      <Footer />
    </div>
  )
}

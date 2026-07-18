import React, { useState, useEffect, useCallback } from 'react'

import TopNav from './components/shared/TopNav.jsx'
import Footer from './components/shared/Footer.jsx'

import Home from './pages/Home.jsx'
import Radar from './pages/Radar.jsx'
import Landing from './pages/Landing.jsx'
import Tools from './pages/Tools.jsx'
import Api from './pages/Api.jsx'
import Skills from './pages/Skills.jsx'
import Whitepapers from './pages/Whitepapers.jsx'
import About from './pages/About.jsx'
import Pricing from './pages/Pricing.jsx'
import Products from './pages/Products.jsx'
import Roadmap from './pages/Roadmap.jsx'
import Compare from './pages/Compare.jsx'
import PrivacyPolicy from './pages/legal/PrivacyPolicy.jsx'
import TermsOfService from './pages/legal/TermsOfService.jsx'
import LawEnforcementPolicy from './pages/legal/LawEnforcementPolicy.jsx'
import AbusePolicy from './pages/legal/AbusePolicy.jsx'
import TransparencyReport from './pages/legal/TransparencyReport.jsx'
import AccountRiskDisclosure from './pages/legal/AccountRiskDisclosure.jsx'
import Glassbox from './pages/Glassbox.jsx'
import Agents from './pages/Agents.jsx'

// ── History Router (clean URLs, indexable per-route) ───────────────
// Migrated from hash routing 2026-05-31 for SEO (#47). Old hash URLs
// (e.g. /#/vision) are redirected to clean URLs on first load so existing
// inbound links keep working.

const KNOWN_PAGES = new Set([
  'landing','radar','vision','tools','api','skills','whitepapers','about','pricing','products','roadmap','compare',
  'privacy','terms','law-enforcement','abuse','transparency','account-risk',
  'glassbox','agents',
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
  // Roadmap folded into Vision (2026-06-26) — /roadmap renders the combined page.
  if (path === 'roadmap') return 'vision'
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
    landing:      <Home onNavigate={handleNavigate} />,
    radar:        <Radar onNavigate={handleNavigate} />,
    vision:       <Landing onNavigate={handleNavigate} />,
    tools:        <Tools onNavigate={handleNavigate} />,
    api:          <Api onNavigate={handleNavigate} />,
    skills:       <Skills onNavigate={handleNavigate} />,
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
    compare:      <Compare />,
    glassbox:     <Glassbox />,
    agents:       <Agents />,
  }

  const currentPageEl = pageComponent[page] || pageComponent.landing

  // P55 wp-mac shell: the whole site is one Mac window on a dithered desktop.
  // Title bar boxes are spans, not buttons — decorative chrome stays out of
  // the tab order.
  return (
    <div className="wpm wpm-desktop app-desktop">
      <div className="wpm-window app-window">
        <div className="wpm-titlebar">
          <span className="wpm-closebox app-decor" aria-hidden="true" />
          <span className="wpm-titlebar-title">TunnelMind</span>
          <span className="wpm-zoombox app-decor" aria-hidden="true" />
        </div>

        <TopNav site="tunnelmind" currentPage={page} onNavigate={handleNavigate} />

        <div className="app-content">
          {currentPageEl}
        </div>

        <Footer />
        <StatusBar page={page} />
      </div>
    </div>
  )
}

// ── Status bar — the "Doc 1 Pg 1 Ln 1 Pos 1" strip, repurposed for live
// stats (moved here from Home's Counters in P55; same fetches, same facts).
const PAGE_LABELS = { landing: 'Verify' }

function StatusBar({ page }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let alive = true
    const get = (u) => fetch(u, { headers: { Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    Promise.all([get('/api/ecosystem-stats'), get('/api/stats')]).then(([eco, scry]) => {
      if (!alive) return
      const d = eco && (eco.data || eco)
      const sigil = d && d.lenses && d.lenses.sigil
      const scryObs = (scry && typeof scry.total_observations === 'number') ? scry.total_observations
        : (d && d.lenses && d.lenses.scry && d.lenses.scry.observations_total) || null
      setStats({
        scryObs,
        sigilLinks: sigil ? sigil.sell_paths : null,
      })
    })
    return () => { alive = false }
  }, [])

  const fmtK = (n) => (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(n))
  const fmtM = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : (n / 1000).toFixed(0) + 'k')
  const label = PAGE_LABELS[page] || (page ? page[0].toUpperCase() + page.slice(1) : 'Verify')

  return (
    <div className="wpm-statusbar" aria-label="Live stats">
      <span className="wpm-status-cell">Doc: {label}</span>
      <span className="wpm-status-cell">Scry {stats && stats.scryObs != null ? fmtK(stats.scryObs) : '-'} obs</span>
      <span className="wpm-status-cell">Sigil {stats && stats.sigilLinks != null ? fmtM(stats.sigilLinks) : '-'} links</span>
      <span className="wpm-status-cell">91 MCP tools</span>
      <span className="wpm-status-cell">4 lenses live</span>
    </div>
  )
}

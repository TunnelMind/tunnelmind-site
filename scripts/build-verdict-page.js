#!/usr/bin/env node
// Builds public/standards/reconciliation-verdict/v1.html from
// docs/verdict/RECONCILIATION-VERDICT-v1.0.md.
// Run by npm script: build:verdict (chained into `build`).

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { marked } from 'marked'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const srcMd = join(root, 'docs', 'verdict', 'RECONCILIATION-VERDICT-v1.0.md')
const outDir = join(root, 'public', 'standards', 'reconciliation-verdict')
const outHtml = join(outDir, 'v1.html')
const outMd = join(outDir, 'RECONCILIATION-VERDICT-v1.0.md')

mkdirSync(outDir, { recursive: true })
const md = readFileSync(srcMd, 'utf8')
const body = marked.parse(md, { gfm: true, breaks: false })

const css = `
:root {
  --chrome-bg: #0f172a;
  --chrome-bg2: #1e293b;
  --chrome-border: #334155;
  --chrome-text: #cbd5e1;
  --chrome-text-dim: #94a3b8;
  --chrome-text-bright: #e2e8f0;
  --doc-bg: #1e293b;
  --doc-paper: #243044;
  --doc-text: #e2e8f0;
  --doc-text-dim: #cbd5e1;
  --accent-green: #3dba8a;
  --accent-amber: #fbbf24;
  --accent-blue: #00d4ff;
  --accent-cyan: #00d4ff;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace;
  --font-serif: 'Crimson Pro', Georgia, Palatino, 'Times New Roman', serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--chrome-bg); color: var(--doc-text); font-family: var(--font-serif); font-size: 17px; line-height: 1.65; -webkit-font-smoothing: antialiased; }
.banner { background: var(--chrome-bg2); border-bottom: 1px solid var(--chrome-border); padding: 14px 24px; font-family: var(--font-mono); font-size: 12px; color: var(--chrome-text-dim); display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.banner a { color: var(--accent-green); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 150ms ease; }
.banner a:hover { border-bottom-color: var(--accent-green); }
.banner .home { color: var(--accent-green); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; font-size: 11px; }
main { max-width: 760px; margin: 0 auto; padding: 48px 24px 96px; }
h1 { font-family: var(--font-mono); font-size: 28px; font-weight: 700; color: var(--accent-green); letter-spacing: 0.02em; margin: 0 0 28px; line-height: 1.25; }
h2 { font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--chrome-text-bright); margin: 56px 0 18px; line-height: 1.3; padding-bottom: 8px; border-bottom: 1px solid var(--chrome-border); }
h3 { font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--accent-cyan); margin: 36px 0 14px; }
h4 { font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--chrome-text); margin: 28px 0 10px; }
p { margin: 0 0 18px; }
a { color: var(--accent-blue); text-decoration: none; border-bottom: 1px solid rgba(96, 165, 250, 0.35); transition: border-color 150ms ease, color 150ms ease; }
a:hover { color: var(--accent-cyan); border-bottom-color: var(--accent-cyan); }
ul, ol { margin: 0 0 18px; padding-left: 26px; }
li { margin: 6px 0; }
code { font-family: var(--font-mono); font-size: 0.88em; background: var(--chrome-bg2); color: var(--accent-cyan); padding: 2px 6px; border-radius: 3px; border: 1px solid var(--chrome-border); }
pre { background: var(--chrome-bg2); border: 1px solid var(--chrome-border); border-radius: 4px; padding: 16px 18px; overflow-x: auto; margin: 0 0 22px; }
pre code { background: transparent; border: none; padding: 0; color: var(--doc-text); font-size: 13px; line-height: 1.55; }
table { border-collapse: collapse; margin: 0 0 22px; font-size: 14px; width: 100%; font-family: var(--font-mono); }
th, td { border: 1px solid var(--chrome-border); padding: 8px 12px; text-align: left; vertical-align: top; }
th { background: var(--chrome-bg2); color: var(--chrome-text-bright); font-weight: 700; }
blockquote { margin: 0 0 22px; padding: 4px 20px; border-left: 3px solid var(--accent-green); color: var(--chrome-text); font-style: italic; }
hr { border: none; border-top: 1px solid var(--chrome-border); margin: 40px 0; }
strong { color: var(--chrome-text-bright); }
.cta { background: var(--doc-paper); border: 1px solid var(--chrome-border); border-left: 3px solid var(--accent-green); border-radius: 4px; padding: 20px 24px; margin: 0 0 36px; font-family: var(--font-mono); font-size: 13px; line-height: 1.6; color: var(--chrome-text); }
.cta-title { color: var(--accent-green); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-size: 11px; margin-bottom: 10px; }
.cta code { font-size: 12px; }
@media (max-width: 600px) {
  main { padding: 32px 18px 64px; }
  h1 { font-size: 22px; }
  h2 { font-size: 17px; }
}
`.trim()

const ctaTop = `
<div class="cta">
  <div class="cta-title">Live</div>
  <div>
    Try it: <code>GET https://data.tunnelmind.ai/v1/verdict/{key}</code> — or the
    <code>verdict_lookup</code> MCP tool at <code>mcp-data.tunnelmind.ai</code>.
    Every verdict ships a self-verifying receipt you can check offline with the
    reference verifier — no call back to us required.
  </div>
</div>
`.trim()

const ctaBottom = `
<div class="cta" style="margin-top: 56px;">
  <div class="cta-title">Implementation status</div>
  <div>
    Live at <code>data.tunnelmind.ai/v1/verdict/{key}</code> and as the
    <code>verdict_lookup</code> MCP tool. The reconciliation core (claim
    translation across roots, conduct fusion, the self-verifying receipt) and the
    standalone offline verifier are open. The verdict composes the
    <a href="/standards/receipt-format/v1">Receipt Format</a>,
    <a href="/atap/standard">ATAP</a>, and
    <a href="/eat/profile/v0.1">EAT Profile</a> standards.<br><br>
    Discuss via the standards hub at <a href="/standards">/standards</a>.
  </div>
</div>
`.trim()

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TunnelMind Reconciliation Verdict v1.0 — TunnelMind</title>
<meta name="description" content="Reconciliation Verdict v1.0 — does what a key claims about itself match what the network has seen it do? Claim (attestation tier across roots) vs conduct (the graph), as one portable, offline-verifiable verdict. CC BY 4.0.">
<link rel="canonical" href="https://tunnelmind.ai/standards/reconciliation-verdict/v1">
<meta property="og:title" content="TunnelMind Reconciliation Verdict v1.0">
<meta property="og:description" content="Claim vs conduct for any cryptographic key, reconciled into one offline-verifiable verdict. The reconciliation layer above all roots of trust.">
<meta property="og:type" content="article">
<meta property="og:url" content="https://tunnelmind.ai/standards/reconciliation-verdict/v1">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/fonts/fonts.css">
<style>${css}</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "TunnelMind Reconciliation Verdict v1.0",
  "name": "Reconciliation Verdict v1.0",
  "url": "https://tunnelmind.ai/standards/reconciliation-verdict/v1",
  "description": "Does what a key claims about itself match what the network has seen it do? Claim (attestation tier across roots) vs conduct (the graph), reconciled into one portable, offline-verifiable verdict. CC BY 4.0.",
  "inLanguage": "en",
  "proficiencyLevel": "Expert",
  "audience": { "@type": "Audience", "audienceType": "SoftwareDeveloper" },
  "isPartOf": { "@type": "WebSite", "@id": "https://tunnelmind.ai/#website" },
  "author":    { "@type": "Organization", "@id": "https://tunnelmind.ai/#organization" },
  "publisher": { "@type": "Organization", "@id": "https://tunnelmind.ai/#organization" },
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "version": "1.0",
  "creativeWorkStatus": "Published",
  "datePublished": "2026-06-16",
  "encoding": {
    "@type": "MediaObject",
    "contentUrl": "https://tunnelmind.ai/standards/reconciliation-verdict/RECONCILIATION-VERDICT-v1.0.md",
    "encodingFormat": "text/markdown"
  }
}
</script>
</head>
<body>
<div class="banner">
  <a class="home" href="/">TunnelMind</a>
  <div>
    <a href="/standards">All standards</a>
    &nbsp;·&nbsp;
    <a href="/standards/receipt-format/v1">Receipt Format v1.0</a>
    &nbsp;·&nbsp;
    <a href="/atap/standard">ATAP v0.1</a>
    &nbsp;·&nbsp;
    <a href="/standards/reconciliation-verdict/RECONCILIATION-VERDICT-v1.0.md">Raw markdown</a>
  </div>
</div>
<main>
${ctaTop}
${body}
${ctaBottom}
</main>
</body>
</html>
`

writeFileSync(outHtml, html, 'utf8')
copyFileSync(srcMd, outMd)
console.log(`wrote ${outHtml}`)
console.log(`wrote ${outMd}`)

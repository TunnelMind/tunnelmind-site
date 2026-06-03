#!/usr/bin/env node
// Builds public/eat/profile/v0.1.html from docs/EAT-PROFILE-v0.1.md.
// Run by npm script: build:eat (chained into `build`).

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { marked } from 'marked'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const srcMd = join(root, 'docs', 'EAT-PROFILE-v0.1.md')
const outDir = join(root, 'public', 'eat', 'profile')
const outHtml = join(outDir, 'v0.1.html')
const outMd = join(outDir, 'EAT-PROFILE-v0.1.md')

mkdirSync(outDir, { recursive: true })
const md = readFileSync(srcMd, 'utf8')
const body = marked.parse(md, { gfm: true, breaks: false })

const css = `
:root {
  --chrome-bg: #0a0a0f;
  --chrome-bg2: #14121c;
  --chrome-border: #2a2440;
  --chrome-text: #cbd5e1;
  --chrome-text-dim: #94a3b8;
  --chrome-text-bright: #e2e8f0;
  --doc-bg: #0d0b14;
  --doc-paper: #14121c;
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
td code { font-size: 0.92em; }
hr { border: none; border-top: 1px solid var(--chrome-border); margin: 36px 0; }
blockquote { margin: 0 0 22px; padding: 12px 18px; border-left: 3px solid var(--accent-green); background: rgba(74, 222, 128, 0.04); color: var(--chrome-text-bright); }
strong { color: var(--chrome-text-bright); font-weight: 700; }
em { color: var(--accent-amber); }
::selection { background: rgba(96, 165, 250, 0.25); color: var(--doc-text); }
.cta { background: var(--doc-paper); border: 1px solid var(--chrome-border); border-radius: 4px; padding: 20px 24px; margin: 36px 0; font-family: var(--font-mono); font-size: 13px; line-height: 1.55; }
.cta-title { color: var(--accent-amber); font-weight: 700; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
@media (max-width: 600px) {
  main { padding: 32px 18px 64px; font-size: 16px; }
  h1 { font-size: 22px; }
  h2 { font-size: 17px; }
  pre, table { font-size: 12px; }
}
`.trim()

const ctaTop = `
<div class="cta">
  <div class="cta-title">Draft — implementation gated</div>
  <div>
    This is a draft profile, not a published standard. Bytes-on-the-wire formats,
    claim names, and CBOR claim keys may change. Implementations SHOULD pin the
    URL by version (<code>/eat/profile/v0.1</code>) and re-verify against the
    CHANGELOG when v1 publishes.
  </div>
  <div style="margin-top: 10px;">
    Read the <a href="/eat/profile/EAT-PROFILE-v0.1.md">raw markdown</a>
    &nbsp;·&nbsp; built on <a href="/atap/standard">ATAP v0.1.2</a>
    &nbsp;·&nbsp; references <a href="https://www.rfc-editor.org/rfc/rfc9711.html">RFC 9711 (EAT)</a>
  </div>
</div>
`.trim()

const ctaBottom = `
<div class="cta" style="margin-top: 56px;">
  <div class="cta-title">Implementation status</div>
  <div>
    Spec only. No <code>@tunnelmindai/eat</code> npm package, no verifier
    wiring, no <code>application/eat+cwt</code> on any
    <code>data.tunnelmind.ai</code> endpoint yet. Implementation lands in
    three phases described in Appendix C of the spec.<br><br>
    Discuss via the standards hub at <a href="/standards">/standards</a> or
    against <a href="https://github.com/TunnelMind/atap/discussions">ATAP Discussions</a>
    (this profile rides on ATAP and a separate repo is not yet warranted).
  </div>
</div>
`.trim()

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EAT Profile v0.1 (draft) — TunnelMind</title>
<meta name="description" content="TunnelMind EAT Profile v0.1 — a draft IETF RATS Entity Attestation Token (RFC 9711) serialization for ATAP receipts and Scry cross-lens enrichments. CC BY 4.0.">
<link rel="canonical" href="https://tunnelmind.ai/eat/profile/v0.1">
<meta name="robots" content="noindex, follow">
<meta property="og:title" content="EAT Profile v0.1 (draft) — TunnelMind">
<meta property="og:description" content="Draft EAT (RFC 9711) profile for TunnelMind. ATAP receipt + Scry cross-lens enrichments expressed as standard EAT claims with two submodules.">
<meta property="og:type" content="article">
<meta property="og:url" content="https://tunnelmind.ai/eat/profile/v0.1">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/fonts/fonts.css">
<style>${css}</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "TunnelMind EAT Profile v0.1 (draft)",
  "name": "EAT Profile v0.1",
  "url": "https://tunnelmind.ai/eat/profile/v0.1",
  "description": "Draft IETF RATS Entity Attestation Token (RFC 9711) serialization profile for TunnelMind ATAP receipts and Scry cross-lens enrichments. CC BY 4.0.",
  "inLanguage": "en",
  "proficiencyLevel": "Expert",
  "audience": { "@type": "Audience", "audienceType": "SoftwareDeveloper" },
  "isPartOf": { "@type": "WebSite", "@id": "https://tunnelmind.ai/#website" },
  "author":    { "@type": "Organization", "@id": "https://tunnelmind.ai/#organization" },
  "publisher": { "@type": "Organization", "@id": "https://tunnelmind.ai/#organization" },
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "version": "0.1-draft",
  "creativeWorkStatus": "Draft",
  "encoding": {
    "@type": "MediaObject",
    "contentUrl": "https://tunnelmind.ai/eat/profile/EAT-PROFILE-v0.1.md",
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
    <a href="/atap/standard">ATAP v0.1</a>
    &nbsp;·&nbsp;
    <a href="/eat/profile/EAT-PROFILE-v0.1.md">Raw markdown</a>
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

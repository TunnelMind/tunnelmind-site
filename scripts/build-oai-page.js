#!/usr/bin/env node
// Builds public/oai/standard.html from docs/OAI-STANDARD-v1.md.
// Run by npm script: build:oai (chained into `build`).

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { marked } from 'marked'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const srcMd = join(root, 'docs', 'OAI-STANDARD-v1.md')
const outDir = join(root, 'public', 'oai')
const outHtml = join(outDir, 'standard.html')
const outMd = join(outDir, 'OAI-STANDARD-v1.0.md')

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
.cta-title { color: var(--accent-green); font-weight: 700; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
@media (max-width: 600px) {
  main { padding: 32px 18px 64px; font-size: 16px; }
  h1 { font-size: 22px; }
  h2 { font-size: 17px; }
  pre, table { font-size: 12px; }
}
`.trim()

const ctaTop = `
<div class="cta">
  <div class="cta-title">v1.0 — Public comment period</div>
  <div>Comments, objections, and proposals are open through <strong>2026-08-12</strong>.</div>
  <div style="margin-top: 10px;">
    Discuss on <a href="https://github.com/TunnelMind/oai/discussions">GitHub Discussions</a>
    &nbsp;·&nbsp; file an <a href="https://github.com/TunnelMind/oai/issues">issue</a>
    &nbsp;·&nbsp; read the <a href="/oai/OAI-STANDARD-v1.0.md">raw markdown</a>
  </div>
</div>
`.trim()

const ctaBottom = `
<div class="cta" style="margin-top: 56px;">
  <div class="cta-title">Comment on this standard</div>
  <div>
    <a href="https://github.com/TunnelMind/oai/discussions">GitHub Discussions</a> — open-ended feedback, questions, proposals.<br>
    <a href="https://github.com/TunnelMind/oai/issues">GitHub Issues</a> — concrete defects, contradictions, broken examples.<br>
    Formal objections per &sect;12.5 will be archived at <code>tunnelmind.ai/oai/objections</code> (forthcoming).
  </div>
</div>
`.trim()

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OAI v1.0 — Observed Actor Identifier Standard</title>
<meta name="description" content="OAI is an open identifier standard for entities that observe, profile, or act against users, devices, and networks. Edited by TunnelMind under the CVE model: free resolution, permanent canonical identifiers, signed observations.">
<link rel="canonical" href="https://tunnelmind.ai/oai/standard">
<meta property="og:title" content="OAI v1.0 — Observed Actor Identifier Standard">
<meta property="og:description" content="Open identifier standard for trackers, fingerprinters, surveillance vendors, ad networks, data brokers, threat actors. Edited by TunnelMind. Public comment through 2026-08-12.">
<meta property="og:type" content="article">
<meta property="og:url" content="https://tunnelmind.ai/oai/standard">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/fonts/fonts.css">
<style>${css}</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "OAI v1.0 — Observed Actor Identifier",
  "name": "OAI v1.0",
  "url": "https://tunnelmind.ai/oai/standard",
  "description": "Open standard for permanent, free-to-resolve identifiers for every observed actor on the network. Edited by TunnelMind.",
  "inLanguage": "en",
  "proficiencyLevel": "Expert",
  "audience": { "@type": "Audience", "audienceType": "SoftwareDeveloper" },
  "isPartOf": { "@type": "WebSite", "@id": "https://tunnelmind.ai/#website" },
  "author":    { "@type": "Organization", "@id": "https://tunnelmind.ai/#organization" },
  "publisher": { "@type": "Organization", "@id": "https://tunnelmind.ai/#organization" },
  "license": "https://creativecommons.org/publicdomain/zero/1.0/",
  "version": "1.0",
  "encoding": {
    "@type": "MediaObject",
    "contentUrl": "https://tunnelmind.ai/oai/OAI-STANDARD-v1.0.md",
    "encodingFormat": "text/markdown"
  }
}
</script>
</head>
<body>
<div class="banner">
  <a class="home" href="/">TunnelMind</a>
  <div>
    <a href="https://github.com/TunnelMind/oai">GitHub: TunnelMind/oai</a>
    &nbsp;·&nbsp;
    <a href="/oai/OAI-STANDARD-v1.0.md">Raw markdown</a>
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

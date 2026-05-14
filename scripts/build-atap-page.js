#!/usr/bin/env node
// Builds public/atap/standard.html from docs/ATAP-v0.1.md.
// Run by npm script: build:atap (chained into `build`).

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { marked } from 'marked'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const srcMd = join(root, 'docs', 'ATAP-v0.1.md')
const outDir = join(root, 'public', 'atap')
const outHtml = join(outDir, 'standard.html')
const outMd = join(outDir, 'ATAP-v0.1.md')

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
  --accent-green: #4ade80;
  --accent-amber: #fbbf24;
  --accent-blue: #60a5fa;
  --accent-cyan: #38bdf8;
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
  <div class="cta-title">v0.1 — Public comment period</div>
  <div>Comments, objections, and proposals are open through <strong>2026-08-12</strong>.</div>
  <div style="margin-top: 10px;">
    Discuss on <a href="https://github.com/TunnelMind/atap/discussions">GitHub Discussions</a>
    &nbsp;·&nbsp; file an <a href="https://github.com/TunnelMind/atap/issues">issue</a>
    &nbsp;·&nbsp; read the <a href="/atap/ATAP-v0.1.md">raw markdown</a>
    &nbsp;·&nbsp; <a href="/atap/verify.sh">verify.sh</a>
    &nbsp;·&nbsp; <a href="/atap/schemas/v0.1/">JSON Schemas</a>
  </div>
</div>
`.trim()

const ctaBottom = `
<div class="cta" style="margin-top: 56px;">
  <div class="cta-title">Comment on this standard</div>
  <div>
    <a href="https://github.com/TunnelMind/atap/discussions">GitHub Discussions</a> — open-ended feedback, questions, proposals.<br>
    <a href="https://github.com/TunnelMind/atap/issues">GitHub Issues</a> — concrete defects, contradictions, broken examples.<br>
    Profile proposals belong at <a href="https://github.com/TunnelMind/atap-profiles">github.com/TunnelMind/atap-profiles</a> (forthcoming).<br>
    Formal objections per &sect;12.3 will be archived at <code>tunnelmind.ai/atap/objections</code> (forthcoming).
  </div>
</div>
`.trim()

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ATAP v0.1 — Agent Trust Attestation Protocol</title>
<meta name="description" content="ATAP is an open protocol for agent behavioral attestation: a canonical receipt format that lets the principal of an agentic system cryptographically verify what an agent actually did. Edited by TunnelMind.">
<link rel="canonical" href="https://tunnelmind.ai/atap/standard">
<meta property="og:title" content="ATAP v0.1 — Agent Trust Attestation Protocol">
<meta property="og:description" content="Open protocol for agent behavioral attestation. AIT capability tokens, witness-event chains, hash-linked attestation blocks, signed compliance receipts. Edited by TunnelMind. Public comment through 2026-08-12.">
<meta property="og:type" content="article">
<meta property="og:url" content="https://tunnelmind.ai/atap/standard">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<div class="banner">
  <a class="home" href="/">TunnelMind</a>
  <div>
    <a href="/standards">All standards</a>
    &nbsp;·&nbsp;
    <a href="https://github.com/TunnelMind/atap">GitHub: TunnelMind/atap</a>
    &nbsp;·&nbsp;
    <a href="/atap/ATAP-v0.1.md">Raw markdown</a>
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

#!/usr/bin/env node
// Builds public/standards.html — the hub page listing all TunnelMind-edited standards.
// Run by npm script: build:standards (chained into `build`).

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const outDir = join(root, 'public')
const outHtml = join(outDir, 'standards.html')

mkdirSync(outDir, { recursive: true })

const STANDARDS = [
  {
    id: 'oai',
    version: 'v1.0',
    name: 'OAI',
    full: 'Observed Actor Identifier',
    status: 'v1.0 — Public comment through 2026-08-12',
    blurb: 'Open identifier standard for entities that observe, profile, or act against users, devices, and networks. Free resolution, permanent canonical identifiers, signed observations. CVE-style editorial model.',
    href: '/oai/standard',
    github: 'https://github.com/TunnelMind/oai',
    published: '2026-05-14',
  },
  {
    id: 'atap',
    version: 'v0.1',
    name: 'ATAP',
    full: 'Agent Trust Attestation Protocol',
    status: 'v0.1 — Public comment through 2026-08-12',
    blurb: 'Open protocol for agent behavioral attestation. AIT capability tokens, witness-signed event chains, hash-linked attestation blocks, portable compliance receipts. Independent verification via reference verifier and TypeScript wrapper.',
    href: '/atap/standard',
    github: 'https://github.com/TunnelMind/atap',
    published: '2026-05-14',
  },
]

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
  --accent-green: #4ade80;
  --accent-blue: #60a5fa;
  --accent-cyan: #38bdf8;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace;
  --font-serif: 'Crimson Pro', Georgia, Palatino, 'Times New Roman', serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--chrome-bg); color: var(--doc-text); font-family: var(--font-serif); font-size: 17px; line-height: 1.65; -webkit-font-smoothing: antialiased; }
.banner { background: var(--chrome-bg2); border-bottom: 1px solid var(--chrome-border); padding: 14px 24px; font-family: var(--font-mono); font-size: 12px; color: var(--chrome-text-dim); display: flex; justify-content: space-between; align-items: center; }
.banner a { color: var(--accent-green); text-decoration: none; }
.banner .home { color: var(--accent-green); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; font-size: 11px; }
main { max-width: 820px; margin: 0 auto; padding: 56px 24px 96px; }
h1 { font-family: var(--font-mono); font-size: 28px; font-weight: 700; color: var(--accent-green); letter-spacing: 0.02em; margin: 0 0 18px; }
.intro { color: var(--chrome-text); margin: 0 0 48px; max-width: 640px; }
.card { background: var(--doc-paper); border: 1px solid var(--chrome-border); border-radius: 6px; padding: 28px 30px; margin-bottom: 24px; transition: border-color 150ms ease; }
.card:hover { border-color: var(--accent-green); }
.card-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 4px; flex-wrap: wrap; }
.card-name { font-family: var(--font-mono); font-size: 22px; font-weight: 700; color: var(--accent-green); letter-spacing: 0.02em; }
.card-version { font-family: var(--font-mono); font-size: 14px; color: var(--chrome-text-dim); }
.card-full { font-family: var(--font-serif); font-size: 18px; color: var(--chrome-text-bright); font-weight: 600; margin-bottom: 12px; }
.card-status { font-family: var(--font-mono); font-size: 11px; color: var(--accent-blue); margin-bottom: 16px; letter-spacing: 0.04em; }
.card-blurb { color: var(--doc-text); margin-bottom: 18px; }
.card-links { font-family: var(--font-mono); font-size: 12px; color: var(--chrome-text-dim); }
.card-links a { color: var(--accent-cyan); text-decoration: none; border-bottom: 1px solid rgba(56, 189, 248, 0.3); padding-bottom: 1px; }
.card-links a:hover { color: var(--accent-green); border-bottom-color: var(--accent-green); }
.card-links .sep { margin: 0 10px; color: var(--chrome-border); }
@media (max-width: 600px) {
  main { padding: 36px 18px 64px; }
  h1 { font-size: 22px; }
  .card { padding: 20px 18px; }
  .card-name { font-size: 18px; }
}
`.trim()

const cards = STANDARDS.map(s => `
<div class="card">
  <div class="card-head">
    <div class="card-name">${s.name}</div>
    <div class="card-version">${s.version}</div>
  </div>
  <div class="card-full">${s.full}</div>
  <div class="card-status">${s.status} · published ${s.published}</div>
  <p class="card-blurb">${s.blurb}</p>
  <div class="card-links">
    <a href="${s.href}">Read the standard</a>
    <span class="sep">·</span>
    <a href="${s.github}">GitHub</a>
  </div>
</div>
`.trim()).join('\n')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Standards — TunnelMind</title>
<meta name="description" content="Open standards edited by TunnelMind: OAI (Observed Actor Identifier) and ATAP (Agent Trust Attestation Protocol). Free, citation-grade, independently verifiable.">
<link rel="canonical" href="https://tunnelmind.ai/standards">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<div class="banner">
  <a class="home" href="/">TunnelMind</a>
  <div>Open standards · CC BY 4.0</div>
</div>
<main>
<h1>Standards</h1>
<p class="intro">
  Open standards edited by TunnelMind. Each is published as a versioned RFC-style document
  with a public comment window, a GitHub repository for proposals and objections, and
  a commitment to transfer editorial control to a neutral body once external adoption
  and standards-track recognition justify it. None is a paid product.
</p>
${cards}
</main>
</body>
</html>
`

writeFileSync(outHtml, html, 'utf8')
console.log(`wrote ${outHtml}`)

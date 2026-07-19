// Build the brand visual assets (public/assets/*.png) from hand-authored SVG.
//
// Two frames, both in the P55 wp-mac 1-bit design system (BW1: strict black on
// white, tone carried by words and inversion, never color). Reproducible: pure
// string templates rendered by sharp/librsvg with generic font fallbacks, so
// every build is byte-stable.
//
//   how-it-works.png   — customer-facing: one query -> four lenses -> signed verdict
//   the-moat.png       — investor-facing: four lenses on one graph, the join is the moat
//
// Run via `npm run build:assets`. Lens colors and tier order are mirrored from
// src/config/facts.js — keep them in lockstep.

import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUTDIR = join(ROOT, 'public', 'assets')
mkdirSync(OUTDIR, { recursive: true })

// --- design tokens (mirror of src/index.css + facts.js) ----------------------
const BG = '#ffffff'
const PANEL = '#ffffff'
const STROKE = '#000000'
const TEXT = '#000000'
const MUTED = '#000000'
const FAINT = '#000000'
const SERIF = "'ChicagoFLF', Geneva, 'Helvetica Neue', sans-serif"
const MONO = "'JetBrains Mono', 'Courier New', monospace"
const INK = '#000000'

// Four lenses, lowest->highest trust tier order kept in facts.js.
// BW1: no per-lens color — the name IS the identity.
const LENSES = [
  { name: 'Scry',       color: INK, blurb: 'hostile network actors' },
  { name: 'Sigil',      color: INK, blurb: 'ad supply-graph trust' },
  { name: 'Tracker',    color: INK, blurb: 'who watches whom' },
  { name: 'GhostRoute', color: INK, blurb: 'routing integrity' },
]
const TIERS = ['self-asserted', 'software', 'tee-tpm', 'silicon-root']
const GREEN = '#000000'

const W = 1600
const H = 1000

function wordmark(x, y) {
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="22" font-weight="bold" letter-spacing="6" fill="${GREEN}">&#9679; TUNNELMIND</text>`
}
function footer() {
  return `<text x="80" y="${H - 56}" font-family="${MONO}" font-size="20" letter-spacing="3" fill="${FAINT}">tunnelmind.ai</text>
    <text x="${W - 80}" y="${H - 56}" text-anchor="end" font-family="${MONO}" font-size="18" fill="${FAINT}">Trust attestation layer for the agentic internet</text>`
}
function frame() {
  // wp-mac window frame: outer 2px rule + inner 1px rule, square corners.
  return `<rect width="${W}" height="${H}" fill="${BG}"/>
    <rect x="2" y="2" width="${W - 4}" height="${H - 4}" fill="none" stroke="${STROKE}" stroke-width="3"/>
    <rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="${STROKE}" stroke-width="1"/>`
}

// --- Asset 1: customer-facing — how it works ---------------------------------
function howItWorks() {
  // left: the agent / query.  middle: four lens nodes.  right: signed verdict.
  const cxQuery = 250
  const cxLens = 800
  const cxVerdict = 1320
  const lensY = [400, 500, 600, 700]
  const verdictY = 550

  let edges = ''
  let nodes = ''
  LENSES.forEach((l, i) => {
    const y = lensY[i]
    // query -> lens
    edges += `<path d="M ${cxQuery + 130} 550 C ${cxQuery + 320} 550, ${cxLens - 320} ${y}, ${cxLens - 95} ${y}" stroke="${l.color}" stroke-width="2" fill="none"/>`
    // lens -> verdict
    edges += `<path d="M ${cxLens + 95} ${y} C ${cxLens + 300} ${y}, ${cxVerdict - 300} ${verdictY}, ${cxVerdict - 130} ${verdictY}" stroke="${l.color}" stroke-width="2" fill="none"/>`
    nodes += `<g>
      <rect x="${cxLens - 95}" y="${y - 26}" width="190" height="52" rx="0" fill="${PANEL}" stroke="${l.color}" stroke-width="1.5"/>
      <circle cx="${cxLens - 70}" cy="${y}" r="6" fill="${l.color}"/>
      <text x="${cxLens - 52}" y="${y + 5}" font-family="${MONO}" font-size="20" fill="${TEXT}">${l.name}</text>
    </g>`
  })

  const tierLadder = TIERS.map((t, i) =>
    `<text x="${cxVerdict - 110}" y="${verdictY + 150 + i * 30}" font-family="${MONO}" font-size="17" fill="${i === 1 ? GREEN : FAINT}">${i === 1 ? '▸ ' : '  '}${t}</text>`
  ).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${frame()}
    ${wordmark(80, 90)}
    <text x="80" y="190" font-family="${SERIF}" font-size="58" fill="${TEXT}">One query. Four lenses.</text>
    <text x="80" y="258" font-family="${SERIF}" font-size="58" fill="${GREEN}">One signed verdict.</text>

    ${edges}

    <!-- query node -->
    <g>
      <rect x="${cxQuery - 130}" y="510" width="260" height="80" rx="0" fill="${PANEL}" stroke="${STROKE}" stroke-width="1.5"/>
      <text x="${cxQuery}" y="545" text-anchor="middle" font-family="${MONO}" font-size="19" fill="${MUTED}">your agent asks</text>
      <text x="${cxQuery}" y="572" text-anchor="middle" font-family="${MONO}" font-size="20" fill="${TEXT}">verify(destination)</text>
    </g>

    ${nodes}

    <!-- verdict node -->
    <g>
      <rect x="${cxVerdict - 130}" y="${verdictY - 55}" width="260" height="110" rx="0" fill="${INK}"/>
      <text x="${cxVerdict}" y="${verdictY - 18}" text-anchor="middle" font-family="${MONO}" font-size="16" fill="${BG}">cross-lens verdict</text>
      <text x="${cxVerdict}" y="${verdictY + 22}" text-anchor="middle" font-family="${SERIF}" font-size="42" fill="${BG}">ALLOW</text>
    </g>
    <text x="${cxVerdict - 110}" y="${verdictY + 120}" font-family="${MONO}" font-size="15" fill="${MUTED}">+ Ed25519 receipt &#183; attestation tier:</text>
    ${tierLadder}

    ${footer()}
  </svg>`
  return svg
}

// --- Asset 2: investor-facing — the moat -------------------------------------
function theMoat() {
  // four lens layers stacked, all feeding one corpus core; the cross-lens join
  // is the callout.
  const coreX = 1180
  const coreY = 560
  const lensX = 470
  const lensY = [380, 500, 620, 740]

  let edges = ''
  let nodes = ''
  LENSES.forEach((l, i) => {
    const y = lensY[i]
    edges += `<path d="M ${lensX + 150} ${y} C ${lensX + 360} ${y}, ${coreX - 260} ${coreY}, ${coreX - 92} ${coreY}" stroke="${l.color}" stroke-width="2.5" fill="none"/>`
    nodes += `<g>
      <rect x="${lensX - 150}" y="${y - 32}" width="300" height="64" rx="0" fill="${PANEL}" stroke="${l.color}" stroke-width="1.5"/>
      <circle cx="${lensX - 122}" cy="${y}" r="7" fill="${l.color}"/>
      <text x="${lensX - 102}" y="${y - 4}" font-family="${MONO}" font-size="20" fill="${TEXT}">${l.name}</text>
      <text x="${lensX - 102}" y="${y + 19}" font-family="${MONO}" font-size="14" fill="${MUTED}">${l.blurb}</text>
    </g>`
  })

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${frame()}
    ${wordmark(80, 90)}
    <text x="80" y="190" font-family="${SERIF}" font-size="56" fill="${TEXT}">Four lenses on one graph.</text>
    <text x="80" y="256" font-family="${SERIF}" font-size="56" fill="${GREEN}">The join is the moat.</text>

    ${edges}
    ${nodes}

    <!-- corpus core -->
    <g>
      <circle cx="${coreX}" cy="${coreY}" r="92" fill="${PANEL}" stroke="${GREEN}" stroke-width="2.5"/>
      <circle cx="${coreX}" cy="${coreY}" r="58" fill="none" stroke="${STROKE}" stroke-width="1.5"/>
      <text x="${coreX}" y="${coreY - 6}" text-anchor="middle" font-family="${MONO}" font-size="16" fill="${MUTED}">one</text>
      <text x="${coreX}" y="${coreY + 22}" text-anchor="middle" font-family="${SERIF}" font-size="30" fill="${TEXT}">corpus</text>
    </g>

    <!-- moat callout -->
    <rect x="${coreX - 230}" y="${coreY + 150}" width="460" height="120" rx="0" fill="${PANEL}" stroke="${STROKE}" stroke-width="1.5"/>
    <text x="${coreX}" y="${coreY + 188}" text-anchor="middle" font-family="${MONO}" font-size="16" fill="${MUTED}">the cross-lens join nobody else has</text>
    <text x="${coreX}" y="${coreY + 222}" text-anchor="middle" font-family="${SERIF}" font-size="26" fill="${GREEN}">agent-native, signed, witnessable</text>
    <text x="${coreX}" y="${coreY + 252}" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${FAINT}">open protocol on the edge &#183; the data graph is paid</text>

    ${footer()}
  </svg>`
  return svg
}

async function emit(name, svg) {
  writeFileSync(join(OUTDIR, `${name}.svg`), svg)
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(join(OUTDIR, `${name}.png`), png)
  console.log(`wrote public/assets/${name}.{svg,png} (${png.length} bytes png)`)
}

await emit('how-it-works', howItWorks())
await emit('the-moat', theMoat())

// Build the social-share card (public/og.png, 1200x630) from an SVG.
//
// Reproducible: the attacker-dot field is placed with a seeded PRNG, so
// every build produces a byte-identical image. Run via `npm run build:og`
// (wired into `npm run build`).

import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og.png')
const W = 1200
const H = 630

// Deterministic LCG — keeps the dot field identical across builds.
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

// The radar motif: attacker IPs as a scattered dot field. Dots in the
// headline column are kept small and faint so the text stays crisp.
function dotField() {
  const r = rng(0x7a6d11)
  const inTextBand = (x, y) => x < 900 && y > 110 && y < 600
  let out = ''
  for (let i = 0; i < 46; i++) {
    const x = r() * W
    const y = r() * H
    const quiet = inTextBand(x, y)
    const rad = quiet ? 1.5 + r() * 2.5 : 2 + r() * 8
    const roll = r()
    const fill = roll > 0.91 ? '#f59e0b' : roll > 0.5 ? '#4ade80' : '#3a3f48'
    const op = (quiet ? 0.1 + r() * 0.12 : 0.2 + r() * 0.55).toFixed(2)
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="${fill}" opacity="${op}"/>`
  }
  return out
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="30%" cy="40%" r="62%">
      <stop offset="0%" stop-color="#4ade80" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#4ade80" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#0a0a0c"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${dotField()}
  <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#1f242c" stroke-width="2"/>
  <text x="80" y="138" font-family="monospace" font-size="24" font-weight="bold" letter-spacing="7" fill="#4ade80">&#9679; TUNNELMIND</text>
  <text x="76" y="312" font-family="Georgia, 'Times New Roman', serif" font-size="86" fill="#f4f4f5">Observability for the</text>
  <text x="76" y="412" font-family="Georgia, 'Times New Roman', serif" font-size="86" fill="#4ade80">agentic internet.</text>
  <text x="80" y="524" font-family="monospace" font-size="25" fill="#9ca3af">Live attacker corpus &#183; every observation signed at the sensor.</text>
  <text x="80" y="568" font-family="monospace" font-size="23" letter-spacing="3" fill="#6b7280">tunnelmind.ai</text>
</svg>`

const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
writeFileSync(OUT, png)
console.log(`wrote ${OUT} (${png.length} bytes)`)

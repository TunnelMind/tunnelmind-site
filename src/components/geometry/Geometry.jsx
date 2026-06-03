// P-GEO — sacred-geometry SVG primitives.
//
// "GEOMETRY CARRIES STRUCTURE. MONOSPACE CARRIES TRUTH."
// These are the structural frame. They must always sit beside a hard,
// legible monospace data readout — never standing alone as decoration.
//
// Pure SVG, no dependencies. Every primitive renders into a 100×100 viewBox
// centered on (50,50) and inherits `stroke` from CSS (default currentColor)
// so callers colour them with --geo-line / --scry / --sigil / --tracker, or
// the --attest-* ramp via <GoldenSpiral tier=… />.

import React from 'react'

const C = 50            // viewBox center
const TAU = Math.PI * 2

// Triangular-lattice point set within `rings` steps of origin, spacing `s`.
function lattice(s, maxDist) {
  const ax = [s, 0]
  const bx = [s / 2, (s * Math.sqrt(3)) / 2]
  const pts = []
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      const x = i * ax[0] + j * bx[0]
      const y = i * ax[1] + j * bx[1]
      if (Math.hypot(x, y) <= maxDist + 0.01) pts.push([C + x, C + y])
    }
  }
  return pts
}

function ring(n, radius, phase = -Math.PI / 2) {
  return Array.from({ length: n }, (_, k) => {
    const a = phase + (k / n) * TAU
    return [C + radius * Math.cos(a), C + radius * Math.sin(a)]
  })
}

function svgProps({ size = 100, className = '', stroke, strokeWidth = 0.8, style, ...rest }) {
  return {
    viewBox: '0 0 100 100',
    width: size,
    height: size,
    className,
    fill: 'none',
    stroke: stroke || 'currentColor',
    strokeWidth,
    style: { overflow: 'visible', ...style },
    'aria-hidden': true,
    ...rest,
  }
}

// ── Vesica Piscis ── two circles sharing a radius; the lens of overlap. ──
export function VesicaPiscis(props) {
  const r = 22
  return (
    <svg {...svgProps(props)}>
      <circle cx={C - r / 2} cy={C} r={r} />
      <circle cx={C + r / 2} cy={C} r={r} />
    </svg>
  )
}

// ── Flower of Life ── 19 overlapping circles on a triangular lattice. ────
export function FlowerOfLife(props) {
  const r = 11
  const centers = lattice(r, 2 * r)
  return (
    <svg {...svgProps(props)}>
      {centers.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r} />)}
      <circle cx={C} cy={C} r={3 * r} strokeWidth={(props.strokeWidth || 0.8) * 1.2} />
    </svg>
  )
}

// ── Metatron's Cube ── 13 nodes, all 78 connecting lines. The master mark. ─
export function MetatronsCube(props) {
  const d = 13
  const nodes = [[C, C], ...ring(6, d), ...ring(6, 2 * d)]
  const lines = []
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      lines.push([nodes[a], nodes[b]])
    }
  }
  return (
    <svg {...svgProps(props)}>
      {lines.map(([p, q], i) => (
        <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} opacity={0.55} />
      ))}
      {nodes.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={d / 2} />)}
    </svg>
  )
}

// ── Hexagram ── two interlocked triangles. The three-lens motif. ─────────
export function Hexagram({ scryStroke, ...props }) {
  const r = 26
  const up = ring(3, r, -Math.PI / 2)            // apex up
  const down = ring(3, r, Math.PI / 2)           // apex down
  const path = (pts) => `M${pts.map((p) => p.join(',')).join('L')}Z`
  return (
    <svg {...svgProps(props)}>
      <path d={path(up)} />
      <path d={path(down)} />
      <circle cx={C} cy={C} r={r} opacity={0.4} />
    </svg>
  )
}

// ── Golden Spiral ── logarithmic spiral, grows by φ each quarter turn.
//    `tier` colours it from the attestation ramp (self→software→tee→silicon).
const ATTEST = {
  self: 'var(--attest-self)',
  software: 'var(--attest-software)',
  tee: 'var(--attest-tee)',
  silicon: 'var(--attest-silicon)',
}
export function GoldenSpiral({ tier, ...props }) {
  const PHI = (1 + Math.sqrt(5)) / 2
  const b = Math.log(PHI) / (Math.PI / 2)        // growth per radian
  const a = 0.7
  const turns = 3.5
  const steps = 240
  let dpath = ''
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * turns * TAU
    const rad = a * Math.exp(b * theta)
    const x = C + rad * Math.cos(theta)
    const y = C + rad * Math.sin(theta)
    dpath += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2)
  }
  const stroke = tier ? ATTEST[tier] : props.stroke
  return (
    <svg {...svgProps({ ...props, stroke })}>
      <path d={dpath} />
    </svg>
  )
}

// ── Background watermark ── mounted once in App.jsx behind all content.
//    Defaults to Metatron's Cube; CSS (.pgeo-bg) handles position/opacity/spin.
export function GeometryBackground({ variant = 'metatron' }) {
  const Mark = variant === 'flower' ? FlowerOfLife : MetatronsCube
  return (
    <div className="pgeo-bg" aria-hidden="true">
      <Mark size="100%" strokeWidth={0.5} />
    </div>
  )
}

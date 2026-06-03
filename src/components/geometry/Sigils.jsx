// P-GEO — sensor sigils.
//
// Six glyphs, one per sensor/role in the fleet. Each is derived from a single
// r=40 circle in a 100×100 viewBox so they read as a coherent set, then given
// a distinct inner mark and a lens colour:
//   Familiar  → Sigil   (identity/companion)
//   Augur     → Tracker (threat divination)
//   Lantern   → Scry    (illumination)
//   Veil      → Tracker (privacy / surveillance veil)
//   Echo      → Scry    (reflection / replay)
//   SigilProbe→ gold    (active probe)
//
// Pure SVG, no deps. Stroke colour is overridable via the `stroke` prop.

import React from 'react'

const R = 40   // the shared base circle radius

function base({ size = 28, stroke, strokeWidth = 3, title, style, ...rest }) {
  return {
    svg: {
      viewBox: '0 0 100 100',
      width: size,
      height: size,
      fill: 'none',
      stroke: stroke || 'currentColor',
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      role: title ? 'img' : undefined,
      'aria-hidden': title ? undefined : true,
      'aria-label': title,
      style,
      ...rest,
    },
    title,
  }
}

function Frame({ children, ...props }) {
  const { svg, title } = base(props)
  return (
    <svg {...svg}>
      {title && <title>{title}</title>}
      <circle cx="50" cy="50" r={R} />
      {children}
    </svg>
  )
}

// ── Familiar ── companion eye: base circle + iris + a single watching dot.
export function Familiar(props) {
  return (
    <Frame stroke="var(--sigil)" title="Familiar" {...props}>
      <circle cx="50" cy="50" r="16" />
      <circle cx="50" cy="50" r="4" fill="currentColor" stroke="none" />
    </Frame>
  )
}

// ── Augur ── divination: eight radiating spokes read like bird-flight lines.
export function Augur(props) {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    return (
      <line
        key={i}
        x1={50 + 14 * Math.cos(a)} y1={50 + 14 * Math.sin(a)}
        x2={50 + 40 * Math.cos(a)} y2={50 + 40 * Math.sin(a)}
      />
    )
  })
  return <Frame stroke="var(--tracker)" title="Augur" {...props}>{spokes}</Frame>
}

// ── Lantern ── illumination: upward flame triangle + ground beam.
export function Lantern(props) {
  return (
    <Frame stroke="var(--scry)" title="Lantern" {...props}>
      <path d="M50 26 L66 60 L34 60 Z" />
      <line x1="50" y1="60" x2="50" y2="74" />
    </Frame>
  )
}

// ── Veil ── two arcs drawn across the centre conceal what lies behind.
export function Veil(props) {
  return (
    <Frame stroke="var(--tracker)" title="Veil" {...props}>
      <path d="M14 44 Q50 64 86 44" />
      <path d="M14 56 Q50 76 86 56" />
    </Frame>
  )
}

// ── Echo ── concentric arcs radiating outward, a returning signal.
export function Echo(props) {
  return (
    <Frame stroke="var(--scry)" title="Echo" {...props}>
      <path d="M38 50 A12 12 0 0 1 62 50" />
      <path d="M30 50 A20 20 0 0 1 70 50" />
      <circle cx="50" cy="56" r="3" fill="currentColor" stroke="none" />
    </Frame>
  )
}

// ── Sigil-Probe ── active probe: crosshair reaching past the circle edge.
export function SigilProbe(props) {
  return (
    <Frame stroke="var(--geo-line)" title="Sigil-Probe" {...props}>
      <line x1="50" y1="6" x2="50" y2="94" />
      <line x1="6" y1="50" x2="94" y2="50" />
      <circle cx="50" cy="50" r="10" fill="currentColor" stroke="none" opacity="0.35" />
    </Frame>
  )
}

// Lookup by lowercase key for data-driven rendering (e.g. radar node kinds).
export const SIGILS = {
  familiar: Familiar,
  augur: Augur,
  lantern: Lantern,
  veil: Veil,
  echo: Echo,
  'sigil-probe': SigilProbe,
}

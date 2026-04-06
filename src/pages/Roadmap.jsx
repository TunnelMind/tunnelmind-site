import React from 'react'
import InteractiveSentence from '../components/InteractiveSentence.jsx'
import { Ruler } from '../components/WPChrome.jsx'

const ROADMAP = [
  {
    phase: 'NOW',
    label: 'Live',
    color: 'var(--accent-green)',
    period: 'April 2026',
    items: [
      {
        key: 'explorer',
        title: 'Surveillance Explorer',
        sentences: [
          { key: 's1', text: 'Live at explore.tunnelmind.ai — 53,000+ domains with surveillance scores and corporate ownership trees.' },
          { key: 's2', text: 'This is the foundation dataset that every other TunnelMind product depends on.' },
        ],
      },
      {
        key: 'receipt',
        title: 'Surveillance Receipt',
        sentences: [
          { key: 's1', text: 'Live at receipt.tunnelmind.ai — upload your browser history, receive a dollar-value invoice of your behavioral data.' },
          { key: 's2', text: 'Entirely client-side; your data never leaves your machine.' },
        ],
      },
      {
        key: 'radar',
        title: 'Surveillance Radar',
        sentences: [
          { key: 's1', text: 'Live at radar.tunnelmind.ai — interactive force-directed graph of 704 entities and 9,786 domains.' },
        ],
      },
      {
        key: 'api',
        title: 'Tracker Data API',
        sentences: [
          { key: 's1', text: 'Live at data.tunnelmind.ai — REST API with 50 free requests/day, CORS open, no key required.' },
        ],
      },
    ],
  },
  {
    phase: 'Q2–Q3',
    label: '2026 Q2–Q3',
    color: 'var(--accent-amber)',
    period: 'April – September 2026',
    items: [
      {
        key: 'personal-alpha',
        title: 'TunnelMind Personal Alpha',
        sentences: [
          { key: 's1', text: 'First public release of the local-first surveillance intelligence platform: WireGuard tunnel, eBPF kernel enforcement, DNS sinkhole, local Mistral 7B LLM.' },
          { key: 's2', text: 'Invite-only alpha — limited to the first hundred enrollments.' },
          { key: 's3', text: 'Windows installer with EV code signing; WireGuard ships bundled, no external dependencies.' },
        ],
      },
      {
        key: 'atap',
        title: 'ATAP Proof of Concept',
        sentences: [
          { key: 's1', text: 'Agent Trust Attestation Protocol: cryptographically signed behavioral attestation certificates for AI agent interactions.' },
          { key: 's2', text: 'The ATAP POC establishes the signing ceremony, certificate chain, and verification tooling that Enterprise attestation reports will depend on.' },
        ],
      },
      {
        key: 'surveillance-map',
        title: 'Interactive Surveillance Map with Temporal Playback',
        sentences: [
          { key: 's1', text: 'D3.js force-directed graph embedded in TunnelMind Personal showing real-time network connections scored against the surveillance database.' },
          { key: 's2', text: 'Temporal playback allows you to scrub through your connection history and watch the surveillance graph evolve over time.' },
        ],
      },
    ],
  },
  {
    phase: 'Q4',
    label: '2026 Q4',
    color: 'var(--chrome-text)',
    period: 'October – December 2026',
    items: [
      {
        key: 'enterprise-beta',
        title: 'TunnelMind Enterprise Beta',
        sentences: [
          { key: 's1', text: 'First Enterprise customers: CISO/DPO compliance exports, ATAP attestation certificates, LDevID-rooted device identity.' },
          { key: 's2', text: 'Enterprise requires Personal infrastructure — you cannot attest to behavioral data you have not first measured.' },
        ],
      },
      {
        key: 'bgp',
        title: 'Shadow BGP Dataset — Initial Collection',
        sentences: [
          { key: 's1', text: 'Begin passive collection of BGP topology observations from Personal deployments, building the distributed sensor network that Intelligence requires.' },
          { key: 's2', text: 'No data is attributed to individual users — all sensor contributions are anonymized before aggregation.' },
        ],
      },
      {
        key: 'pq',
        title: 'Post-Quantum Identity Research',
        sentences: [
          { key: 's1', text: 'Evaluate CRYSTALS-Kyber (ML-KEM) and CRYSTALS-Dilithium (ML-DSA) as replacement algorithms for the Ed25519 identity chain used in Personal attestation.' },
          { key: 's2', text: 'The surveillance infrastructure we\'re exposing will outlast RSA and elliptic curve cryptography — our attestation chain should too.' },
        ],
      },
    ],
  },
  {
    phase: '2027',
    label: '2027',
    color: 'var(--chrome-text-dim)',
    period: '2027',
    items: [
      {
        key: 'routing',
        title: 'Jurisdictional Routing Engine',
        sentences: [
          { key: 's1', text: 'Per-packet jurisdictional tagging using eBPF XDP — every connection stamped with the regulatory jurisdiction it will transit before it leaves your machine.' },
          { key: 's2', text: 'GDPR cross-border transfer analysis and data residency enforcement without VPN overhead.' },
        ],
      },
      {
        key: 'sensor',
        title: 'Distributed Sensor Network',
        sentences: [
          { key: 's1', text: 'Intelligence capability goes live when enough Personal deployments are collecting BGP observations — the individual product enables the collective capability.' },
        ],
      },
      {
        key: 'compensation',
        title: 'Contributor Compensation System Launch',
        sentences: [
          { key: 's1', text: 'The contribution ledger that has been tracking every annotation, correction, and vote since day one becomes the basis for proportional revenue sharing.' },
          { key: 's2', text: 'This is not a retroactive decision — the ledger was designed for compensation from the first commit.' },
        ],
      },
      {
        key: 'intelligence-commercial',
        title: 'Intelligence Product Commercial Availability',
        sentences: [
          { key: 's1', text: 'Shadow BGP topology, prefix hijack detection, and jurisdictional routing analysis available as a commercial API for security researchers and enterprise customers.' },
        ],
      },
    ],
  },
]

function RoadmapItem({ item, phase, phaseColor }) {
  return (
    <div style={{
      padding: '14px 16px',
      marginBottom: '8px',
      background: 'var(--chrome-bg2)',
      border: '1px solid var(--chrome-border)',
      borderRadius: '3px',
      position: 'relative',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--chrome-text-bright)',
        marginBottom: '8px',
      }}>
        {item.title}
      </div>
      {item.sentences.map(s => (
        <p key={s.key} style={{ marginBottom: '6px', lineHeight: 0 }}>
          <InteractiveSentence
            sentenceId={`roadmap-${phase}-${item.key}-${s.key}`}
            content={s.text}
          />
        </p>
      ))}
    </div>
  )
}

function PhaseSection({ phase }) {
  return (
    <div style={{ marginBottom: '40px', display: 'flex', gap: '0' }}>
      {/* Left: phase marker (packet-trace vertical line) */}
      <div style={{
        width: '80px',
        flexShrink: 0,
        position: 'relative',
        paddingTop: '16px',
        paddingRight: '20px',
      }}>
        {/* Vertical trace line */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: '16px',
          width: '2px',
          background: `linear-gradient(to bottom, ${phase.color}, ${phase.color}33)`,
        }} />

        {/* Phase node */}
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          paddingRight: '4px',
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: phase.color,
            border: '2px solid var(--chrome-bg)',
            boxShadow: phase.color === 'var(--accent-green)' ? `0 0 8px ${phase.color}` : 'none',
            marginBottom: '6px',
            marginRight: '-5px',
          }} />
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 700,
            color: phase.color,
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}>
            {phase.phase}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            color: 'var(--chrome-text-dim)',
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}>
            {phase.period}
          </div>
        </div>
      </div>

      {/* Right: items */}
      <div style={{ flex: 1, paddingTop: '10px' }}>
        {phase.items.map(item => (
          <RoadmapItem key={item.key} item={item} phase={phase.phase} phaseColor={phase.color} />
        ))}
      </div>
    </div>
  )
}

export default function Roadmap() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="roadmap" classification="TUNNELMIND // ROADMAP" />

      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            t/roadmap — Packet-Trace Timeline
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '30px',
            fontWeight: 400,
            color: 'var(--doc-text)',
            marginBottom: '12px',
          }}>
            Roadmap
          </h1>
          <p style={{ marginBottom: '8px', lineHeight: 0 }}>
            <InteractiveSentence
              sentenceId="roadmap-intro-s1"
              content="Everything on this timeline is built in dependency order: Personal creates the sensor data that Intelligence requires; Intelligence creates the dataset that Enterprise validates against."
            />
          </p>
          <p style={{ lineHeight: 0 }}>
            <InteractiveSentence
              sentenceId="roadmap-intro-s2"
              content="The community shapes priorities — vote items up or down, annotate with context we might be missing, propose corrections to timelines."
            />
          </p>
        </div>

        {ROADMAP.map(phase => (
          <PhaseSection key={phase.phase} phase={phase} />
        ))}

        {/* Constraint note */}
        <div style={{
          padding: '16px',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderLeft: '3px solid var(--accent-amber)',
          borderRadius: '3px',
          marginTop: '16px',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--accent-amber)',
            marginBottom: '8px',
            letterSpacing: '0.08em',
          }}>
            ARCHITECTURAL CONSTRAINT
          </div>
          <p style={{ lineHeight: 0, marginBottom: '6px' }}>
            <InteractiveSentence
              sentenceId="roadmap-constraint-s1"
              content="No capability ships without a transparency surface. If TunnelMind can measure it, you can see it."
            />
          </p>
          <p style={{ lineHeight: 0 }}>
            <InteractiveSentence
              sentenceId="roadmap-constraint-s2"
              content="This is not a marketing claim — it is an architectural constraint enforced by the same tools we build for you."
            />
          </p>
        </div>
      </div>
    </div>
  )
}

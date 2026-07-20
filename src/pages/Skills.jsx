import React, { useState } from 'react'

// /skills — TunnelMind as Claude Skills.
//
// A Skill is the procedural layer on top of the live API/MCP: it teaches a
// Claude agent WHEN to consult TunnelMind and HOW to act on the verdict, and
// makes "keep the signed receipt" the default. Distributed as a Claude plugin
// marketplace at github.com/TunnelMind/tunnelmind-skills (Apache-2.0).
//
// This is the paid / claude-first edge — a Claude packaging artifact, NOT a
// vendor-neutral standard (those live under /standards).

const MARKETPLACE = 'https://github.com/TunnelMind/tunnelmind-skills'

const SKILLS = [
  {
    name: 'preflight-should-i-act',
    invoke: '/tunnelmind-trust:preflight-should-i-act',
    accent: '--accent-green',
    question: 'May I act on this destination right now?',
    blurb: 'The action gate. Call it before a payment, a credential send, a fetch you\'ll trust the output of, or publishing data to a third party.',
    returns: 'allow / caution / deny + a 5-minute signed consultation receipt',
    when: [
      ['transact', 'payment, purchase, value transfer'],
      ['credential', 'sending an API key, token, or secret'],
      ['fetch', 'calling an API or loading a resource you\'ll trust'],
      ['publish', 'posting data to a third party'],
    ],
  },
  {
    name: 'verify-actor',
    invoke: '/tunnelmind-trust:verify-actor',
    accent: '--accent-cyan',
    question: 'Who is this, really, and do its claims hold?',
    blurb: 'The investigation / attestation call. Fuses Scry × Sigil × GhostRoute into one verdict and names the adversary class behind a node.',
    returns: 'a fused pass / warn / fail verdict + adversary classification + a durable, independently re-checkable receipt',
    when: [
      ['due diligence', 'a counterparty or supply-chain partner before onboarding'],
      ['attribution', 'naming who is behind an IP, domain, ASN, or entity'],
      ['attestation', 'recording a verdict you\'ll need to defend in an audit'],
      ['evidence', 'when you need the identity, not just allow / deny'],
    ],
  },
]

function TerminalBlock({ lines }) {
  return (
    <div style={{
      background: 'var(--chrome-bg2)', border: '1px solid var(--chrome-border)',
      borderLeft: '3px solid var(--accent-green)', borderRadius: '4px',
      padding: '16px 18px', margin: '0 0 10px',
    }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', padding: '3px 0' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--chrome-text-dim)', flexShrink: 0 }}>&gt;</span>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--chrome-text-bright)', wordBreak: 'break-all' }}>{l}</code>
        </div>
      ))}
    </div>
  )
}

function SkillCard({ s }) {
  const c = `var(${s.accent})`
  return (
    <div style={{
      border: '1px solid var(--chrome-border)', borderLeft: `3px solid ${c}`,
      borderRadius: '4px', padding: '20px 22px', marginBottom: '14px',
      background: 'var(--chrome-bg2)',
    }}>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: c }}>{s.name}</code>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontStyle: 'italic', color: 'var(--chrome-text-bright)', margin: '10px 0 6px' }}>
        “{s.question}”
      </p>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.6', color: 'var(--doc-text-dim)', margin: '0 0 14px' }}>{s.blurb}</p>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: c, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Use it before</div>
      <div style={{ marginBottom: '14px' }}>
        {s.when.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid var(--chrome-border)' }}>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-amber)', minWidth: '92px', flexShrink: 0 }}>{k}</code>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--doc-text-dim)' }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: c, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>Returns</div>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.55', color: 'var(--doc-text)', margin: 0 }}>{s.returns}</p>
    </div>
  )
}

export default function Skills({ onNavigate }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 32px)' }}>

        {/* Header */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-green)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '12px' }}>● Claude Skills</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 400, color: 'var(--chrome-text-bright)', marginBottom: '10px' }}>
          Drop TunnelMind into your agent.
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.7', color: 'var(--doc-text-dim)', marginBottom: '28px', maxWidth: '660px' }}>
          The API answers <em>“is this real?”</em> A Skill teaches your Claude agent <strong style={{ color: 'var(--chrome-text)' }}>when to ask</strong> and{' '}
          <strong style={{ color: 'var(--chrome-text)' }}>what to do with the answer</strong>, and to keep the signed receipt. Two skills, one install, no servers to run.
        </p>

        {/* Install */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-green)', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '8px 0 12px' }}>Install · one command in Claude Code</div>
        <TerminalBlock lines={[
          '/plugin marketplace add TunnelMind/tunnelmind-skills',
          '/plugin install tunnelmind-trust@tunnelmind',
        ]} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--chrome-text-dim)', margin: '0 0 6px' }}>
          tunnelmind-trust v0.1.0 · Apache-2.0 · version-pinned (deliberate updates, no silent HEAD) ·{' '}
          <a href={MARKETPLACE} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>source ↗</a>
        </p>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.6', color: 'var(--doc-text-dim)', margin: '10px 0 0', maxWidth: '660px' }}>
          The skills call the public TunnelMind API; the free tier needs no key. They drive the same{' '}
          <span onClick={() => onNavigate && onNavigate('api')} style={{ color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}>endpoints and MCP tools</span>{' '}
          documented on the API page; they don't replace them.
        </p>

        {/* The two skills */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-green)', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '44px 0 10px' }}>The kit</div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 400, color: 'var(--chrome-text-bright)', margin: '0 0 18px' }}>
          Two questions every agent should ask first
        </h2>
        {SKILLS.map(s => <SkillCard key={s.name} s={s} />)}

        {/* Why a skill */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-green)', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '44px 0 10px' }}>Why a skill, not just an API call</div>
        <div style={{ padding: '18px 20px', background: 'var(--chrome-bg2)', border: '1px solid var(--chrome-border)', borderLeft: '3px solid var(--accent-cyan)', borderRadius: '4px' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.7', color: 'var(--doc-text)', margin: '0 0 12px' }}>
            An endpoint is passive; the agent has to already know to call it. A Skill carries the decision logic: <em>consult before you transact; on a deny, stop; on a caution, get a human; always keep the receipt.</em> That last habit is the point, every check leaves a signed, replayable artifact your agent attaches to its action log, so a decision can be proven later, not just asserted.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: '1.65', color: 'var(--doc-text-dim)', margin: 0 }}>
            Built claude-first. The skills are a Claude packaging artifact on the paid edge, the open, vendor-neutral standards (ATAP, OAI, Receipt Format) live under{' '}
            <a href="/standards" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>/standards ↗</a>.
          </p>
        </div>

        <div style={{ height: '40px' }} />
      </div>
    </div>
  )
}

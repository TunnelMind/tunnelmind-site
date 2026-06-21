import React, { useState } from 'react'
import { LegalPage, Section, P, UL, Divider, ContactBox } from './LegalPage.jsx'

// ── Risk signal → disclosure mapping ──────────────────────────────
// These map to real attestation policy verdicts and surveillance signals
// produced by the TunnelMind backend. Keep in sync with policy engine.

const RISK_SIGNALS = [
  {
    id: 'high_score',
    verdict: 'WARN',
    title: 'High Surveillance Exposure Score',
    trigger: 'Your surveillance exposure score exceeds 70/100.',
    what_it_means: 'Your device is regularly contacting a large number of high-risk surveillance actors across multiple data categories. This may mean ad-tech SDKs embedded in apps you use are actively profiling your behavior.',
    what_you_can_do: [
      'Review your tracker graph to identify the highest-risk domains.',
      'Enable DNS sinkholing for data brokers and fingerprinting domains in your policy settings.',
      'Check your highest-scoring data categories — CREDENTIALS and HEALTH have escalated risk.',
    ],
    severity: 'medium',
  },
  {
    id: 'credentials_exfil',
    verdict: 'BLOCK',
    title: 'Credential Data Destined for Surveillance Actor',
    trigger: 'Traffic classified as CREDENTIALS data category is destined for a SURVEILLANCE or DATA_BROKER destination.',
    what_it_means: 'Something on your network is transmitting data TunnelMind has classified as credential-adjacent to a known surveillance destination. This is a high-severity signal — it may indicate a credential-harvesting SDK, a browser extension with overly broad access, or malware.',
    what_you_can_do: [
      'Check the specific domain flagged in your attestation event log.',
      'Identify which application generated the traffic (by time correlation and device).',
      'Consider enabling BLOCK policy for that destination category.',
      'If you believe this is malicious, rotate credentials for services accessed from the affected device.',
    ],
    severity: 'critical',
  },
  {
    id: 'gov_attributed',
    verdict: 'AUDIT',
    title: 'Traffic Routed to Government-Attributed Destination',
    trigger: 'Your traffic has been routed to an IP or domain classified as GOV_ATTRIBUTED.',
    what_it_means: 'TunnelMind\'s surveillance database has classified this destination as attributed to a government entity. This is not necessarily malicious — many legitimate services (CDNs, cloud providers, analytics platforms contracted by governments) carry this classification. However, it warrants awareness.',
    what_you_can_do: [
      'Review the specific domain in your tracker graph for ownership and jurisdiction details.',
      'Check the jurisdiction of the attributed entity.',
      'If unexpected, review which application generated the traffic.',
    ],
    severity: 'low',
  },
  {
    id: 'jurisdiction_transfer',
    verdict: 'WARN',
    title: 'Personal Data Crossing Jurisdictional Boundary',
    trigger: 'Traffic classified as PII, HEALTH, or FINANCIAL is routed to a destination in a jurisdiction flagged in your policy.',
    what_it_means: 'Data that may include personal, health, or financial information is crossing a jurisdictional line your policy is configured to flag. If you are subject to GDPR, HIPAA, or similar frameworks, cross-border data transfers require additional safeguards.',
    what_you_can_do: [
      'Review the destination jurisdiction in your GhostRoute certificate.',
      'Check whether the service has an adequacy decision, SCCs, or other transfer mechanism in place.',
      'Consider configuring a BLOCK policy for the specific jurisdiction and data category combination.',
    ],
    severity: 'medium',
  },
  {
    id: 'beacon_detected',
    verdict: 'AUDIT',
    title: 'Persistent Beacon Pattern Detected',
    trigger: 'A domain on your network is being queried at a regular, periodic interval consistent with a tracking heartbeat.',
    what_it_means: 'One or more of your devices is regularly phoning home to the same domain on a predictable schedule. This is consistent with ad-tech heartbeat requests, telemetry SDKs, or persistent tracking pixels — but could also be legitimate app behavior.',
    what_you_can_do: [
      'Identify the beaconing domain in your surveillance graph.',
      'Cross-reference with the TunnelMind actor database to see who operates this domain.',
      'If the domain is a known tracker, add it to your sinkhole.',
    ],
    severity: 'low',
  },
]

const SEVERITY_COLOR = {
  critical: 'var(--accent-red, #ff4444)',
  medium:   'var(--accent-yellow, #f5a623)',
  low:      'var(--accent-green)',
}

const VERDICT_COLOR = {
  BLOCK: 'var(--accent-red, #ff4444)',
  WARN:  'var(--accent-yellow, #f5a623)',
  AUDIT: 'var(--accent-green)',
  ALLOW: 'var(--chrome-text-dim)',
}

function RiskCard({ signal }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: '1px solid var(--chrome-border)', marginBottom: '12px', background: 'var(--chrome-bg)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          cursor: 'pointer', padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '2px 6px',
            border: `1px solid ${VERDICT_COLOR[signal.verdict]}`,
            color: VERDICT_COLOR[signal.verdict],
          }}>
            {signal.verdict}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--chrome-text-bright)' }}>
            {signal.title}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: SEVERITY_COLOR[signal.severity] }}>
          {signal.severity.toUpperCase()} ▾
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--chrome-border)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--chrome-text-dim)', margin: '12px 0 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Trigger condition
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: '1.7', color: 'var(--doc-text-dim)', marginBottom: '16px' }}>
            {signal.trigger}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--chrome-text-dim)', margin: '0 0 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            What it means
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: '1.7', color: 'var(--doc-text-dim)', marginBottom: '16px' }}>
            {signal.what_it_means}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--chrome-text-dim)', margin: '0 0 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            What you can do
          </p>
          <ul style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: '1.8', color: 'var(--doc-text-dim)', paddingLeft: '18px' }}>
            {signal.what_you_can_do.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function AccountRiskDisclosure() {
  return (
    <LegalPage eyebrow="● Legal" title="Account Risk Disclosure" effective="April 24, 2026">

      <Section title="What this is">
        <P>
          TunnelMind's policy engine produces verdicts (ALLOW, WARN, BLOCK, AUDIT)
          based on your traffic metadata. When your account generates a risk signal,
          TunnelMind will surface a disclosure explaining what triggered it, what it
          means, and what actions are available to you.
        </P>
        <P>
          This page documents every risk signal TunnelMind currently knows how to
          detect. It maps each signal to the real attestation verdict that produces
          it and explains what TunnelMind does about it. We publish this so you
          understand exactly what TunnelMind is watching for and why.
        </P>
      </Section>

      <Section title="Risk signals (click to expand)">
        {RISK_SIGNALS.map(s => <RiskCard key={s.id} signal={s} />)}
      </Section>

      <Divider />

      <Section title="How verdicts are generated">
        <P>
          All verdicts are produced by TunnelMind's attestation policy engine,
          which runs locally on our VPS using your traffic metadata — never by a
          cloud AI service. The policy engine matches each event against a set of
          rules you can review and modify in your policy settings. Default rules
          reflect TunnelMind's baseline risk assessment of surveillance actor categories.
        </P>
        <UL items={[
          'ALLOW — traffic is permitted and logged.',
          'WARN — traffic is permitted but flagged for your review.',
          'BLOCK — traffic is dropped and you are notified.',
          'AUDIT — traffic is permitted and a signed attestation receipt is generated.',
        ]} />
      </Section>

      <Section title="Account actions we may take">
        <P>
          TunnelMind does not automatically restrict your account based on surveillance
          risk scores — those signals exist for your benefit, not ours. However, we
          may take account action in the following circumstances:
        </P>
        <UL items={[
          'AUP violations confirmed through abuse investigation (see Abuse Policy).',
          'Valid law enforcement legal hold (see Law Enforcement Policy).',
          'Exhaustion of your prepaid access blocks (paid features pause until you purchase another block or pay per query via x402).',
          'Account inactivity exceeding 12 months on a free tier (30-day notice sent first).',
        ]} />
        <P>
          We will notify you by email before any account action unless immediate
          action is required to prevent harm to others.
        </P>
      </Section>

      <ContactBox>
        Questions about a specific risk signal: legal@tunnelmind.ai<br />
        Policy settings: available in your TunnelMind dashboard<br />
        Account deletion: DELETE /api/v1/auth/account or legal@tunnelmind.ai
      </ContactBox>

    </LegalPage>
  )
}

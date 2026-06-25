import React from 'react'
import { LegalPage, Section, P, UL, Divider, ContactBox } from './LegalPage.jsx'

// ── Static report data ─────────────────────────────────────────────
// Update these values annually. The "period" field drives the heading.
const REPORT = {
  period: 'Inception – April 2026',
  legal_requests: {
    subpoenas: 0,
    court_orders: 0,
    warrants: 0,
    emergency_disclosures: 0,
    national_security_letters: 0,
    fisa_orders: 0,
    international_requests: 0,
    requests_challenged: 0,
    requests_resulting_in_disclosure: 0,
  },
  government_requests_rejected: 0,
  accounts_terminated_abuse: 0,
  accounts_suspended_abuse: 0,
  accounts_subject_to_legal_hold: 0,
  infrastructure_nodes: 1,
  registered_accounts: '< 50',
  notes: [
    'TunnelMind opened external access to its attestation API in Q1 2026.',
    'No law enforcement or government agency has contacted TunnelMind as of this report.',
    'Zero data disclosures have been made to any third party.',
    'Warrant canary is current and intact at tunnelmind.ai/canary.json.',
  ],
}

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--chrome-border)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--chrome-text-dim)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-green)' }}>{String(value)}</span>
    </div>
  )
}

export default function TransparencyReport() {
  const lr = REPORT.legal_requests
  return (
    <LegalPage eyebrow="● Legal" title="Transparency Report" effective={`Period: ${REPORT.period}`}>

      <Section title="About this report">
        <P>
          TunnelMind publishes a transparency report covering legal requests
          received, government interactions, and account enforcement actions.
          We publish this report because radical transparency about what an
          infrastructure provider does in response to government pressure is the
          minimum standard for a company that asks the agentic internet to trust
          its attestations.
        </P>
        <P>
          The warrant canary at{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-green)' }}>
            tunnelmind.ai/canary.json
          </span>{' '}
          is updated monthly. Its current status is: <strong style={{ color: 'var(--accent-green)' }}>INTACT</strong>.
        </P>
      </Section>

      <Section title="Legal requests received">
        <StatRow label="Subpoenas" value={lr.subpoenas} />
        <StatRow label="Court orders (18 USC § 2703(d))" value={lr.court_orders} />
        <StatRow label="Search warrants" value={lr.warrants} />
        <StatRow label="Emergency disclosures (§ 2702(b)(8))" value={lr.emergency_disclosures} />
        <StatRow label="National Security Letters" value={lr.national_security_letters} />
        <StatRow label="FISA orders" value={lr.fisa_orders} />
        <StatRow label="International government requests" value={lr.international_requests} />
        <StatRow label="Requests challenged or rejected" value={lr.requests_challenged} />
        <StatRow label="Requests resulting in disclosure" value={lr.requests_resulting_in_disclosure} />
      </Section>

      <Divider />

      <Section title="Account enforcement">
        <StatRow label="Accounts terminated for AUP violation" value={REPORT.accounts_terminated_abuse} />
        <StatRow label="Accounts suspended for AUP violation" value={REPORT.accounts_suspended_abuse} />
        <StatRow label="Accounts under legal hold" value={REPORT.accounts_subject_to_legal_hold} />
        <StatRow label="Government data disclosures" value={0} />
      </Section>

      <Divider />

      <Section title="Infrastructure">
        <StatRow label="Server nodes" value={REPORT.infrastructure_nodes} />
        <StatRow label="Registered accounts" value={REPORT.registered_accounts} />
        <StatRow label="Data subprocessors" value="Stripe, Cloudflare, Hetzner" />
        <StatRow label="LLM vendors with access to user data" value="None (local inference only)" />
      </Section>

      <Divider />

      <Section title="Notes">
        <UL items={REPORT.notes} />
      </Section>

      <ContactBox>
        Questions about this report: legal@tunnelmind.ai<br />
        Next report due: April 2027<br />
        Warrant canary: tunnelmind.ai/canary.json
      </ContactBox>

    </LegalPage>
  )
}

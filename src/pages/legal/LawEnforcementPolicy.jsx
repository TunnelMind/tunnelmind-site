import React from 'react'
import { LegalPage, Section, P, UL, Divider, ContactBox } from './LegalPage.jsx'

export default function LawEnforcementPolicy() {
  return (
    <LegalPage eyebrow="● Legal" title="Law Enforcement Policy" effective="April 24, 2026">

      <Section title="Overview">
        <P>
          This document describes how TunnelMind AI, LLC responds to requests from
          law enforcement and government agencies. We publish this policy to be
          transparent with our users and to set clear expectations with agencies
          that contact us.
        </P>
      </Section>

      <Section title="1. Our general posture">
        <P>
          TunnelMind is a surveillance transparency company. We take seriously both
          our legal obligations to cooperate with valid lawful process and our
          obligation to protect users from unlawful government surveillance. These
          are not in conflict when process is properly followed.
        </P>
        <P>
          We do not proactively provide user data to any law enforcement agency
          absent a valid legal order addressed to TunnelMind AI, LLC.
        </P>
      </Section>

      <Section title="2. What we can provide">
        <P>
          Our infrastructure captures metadata only. The following data exists and
          may be produced in response to valid legal process:
        </P>
        <UL items={[
          'Account records: email address, passkey credential ID, WireGuard peer ID, tunnel IP assignment, account creation timestamp, Stripe customer ID.',
          'DNS query metadata: queried domain, timestamp, tunnel IP. No resolved IP addresses, no payload content.',
          'Network flow metadata: source/destination IP, ports, bytes, protocol, direction, timestamp, verdict. No payload content.',
          'Payment records: subscription tier, billing dates (via Stripe; separate subpoena to Stripe for card data).',
          'Surveillance policy configuration: what blocking/audit rules a user has set.',
        ]} />
        <P>
          <strong>What we cannot provide:</strong> We do not have access to the
          content of any network connection routed through WireGuard. WireGuard
          is an encrypted transport — we see metadata at our TC hook, not payload.
          We cannot provide decrypted traffic content because we do not possess it.
        </P>
      </Section>

      <Section title="3. Valid legal process">
        <P>
          We require the following before disclosing user data:
        </P>
        <UL items={[
          'US court orders, subpoenas, or warrants issued under 18 U.S.C. § 2703 (SCA) and served on TunnelMind AI, LLC.',
          'For emergency disclosure under 18 U.S.C. § 2702(b)(8): a written request from a supervising law enforcement officer describing the emergency and including a case number.',
          'International requests: we require formal Mutual Legal Assistance Treaty (MLAT) process or a US court order. We do not respond to direct requests from foreign governments without US legal process.',
        ]} />
        <P>
          Informal requests, "national security letters" purporting to prohibit
          disclosure, and requests that lack proper legal authority will be
          declined. We will notify affected users of legal process to the extent
          permitted by law.
        </P>
      </Section>

      <Section title="4. Legal hold">
        <P>
          Upon receipt of valid preservation request under 18 U.S.C. § 2703(f),
          we will preserve the identified records for 90 days (renewable). Preserved
          accounts are placed under legal hold and cannot be self-deleted by the
          user until the hold is released.
        </P>
      </Section>

      <Section title="5. Cost reimbursement">
        <P>
          We reserve the right to seek reimbursement for costs incurred in
          responding to legal process as permitted by 18 U.S.C. § 2706.
        </P>
      </Section>

      <Section title="6. Warrant canary">
        <P>
          TunnelMind publishes a warrant canary at{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-green)' }}>
            tunnelmind.ai/canary.json
          </span>
          . The canary is reviewed and updated monthly. If TunnelMind has received
          any National Security Letters, FISA orders, or gag orders, the canary will
          not be updated and will be removed from the site.
        </P>
      </Section>

      <Section title="7. Transparency reporting">
        <P>
          TunnelMind publishes an annual transparency report summarizing the number
          and type of legal requests received. See our Transparency Report page.
        </P>
      </Section>

      <ContactBox>
        Law enforcement contact: legal@tunnelmind.ai (subject: LAW ENFORCEMENT REQUEST)<br />
        Emergency after-hours: same address — monitored daily<br />
        Mailing address: TunnelMind AI, LLC · legal@tunnelmind.ai<br />
        Response time: 3 business days for non-emergency requests
      </ContactBox>

    </LegalPage>
  )
}

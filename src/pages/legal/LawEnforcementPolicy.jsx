import React from 'react'
import { LegalPage, Section, P, UL, Divider, ContactBox } from './LegalPage.jsx'

export default function LawEnforcementPolicy() {
  return (
    <LegalPage eyebrow="● Legal" title="Law Enforcement Policy" effective="June 25, 2026">

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
          TunnelMind operates a trust attestation layer for the agentic internet:
          you (or your agent) ask us to evaluate a destination, an IP address,
          domain, ASN, or seller path, and we return a signed verdict. We are not
          in the path of your traffic and we do not route, proxy, or tunnel your
          connections. We take seriously both our legal obligations to cooperate
          with valid lawful process and our obligation to protect users from
          unlawful government surveillance. These are not in conflict when process
          is properly followed.
        </P>
        <P>
          We do not proactively provide user data to any law enforcement agency
          absent a valid legal order addressed to TunnelMind AI, LLC.
        </P>
      </Section>

      <Section title="2. What we can provide">
        <P>
          We hold account records and the metadata of the attestation requests you
          make, not your network traffic. The following data exists and may be
          produced in response to valid legal process:
        </P>
        <UL items={[
          'Account records: email address, API key SHA-256 hash, WebAuthn passkey credential ID, Terms of Service acceptance timestamp, Stripe customer ID.',
          'Query metadata: the IP addresses, domains, ASNs, or seller paths you submitted to /v1/verify, /v1/preflight, and related endpoints, with a timestamp. These are the destinations you asked us to evaluate, not your own connections.',
          'Verdict records: the attestation we returned (allow / caution / deny, or per-lens score) and the evidence behind it, retained so signed receipts stay verifiable.',
          'Payment metadata: prepaid-block billing dates via Stripe (separate subpoena to Stripe for card data) and, for agent micropayments, the x402 on-rail payment reference. We do not custody funds.',
        ]} />
        <P>
          <strong>What we cannot provide:</strong> We are not in the path of your
          traffic. We do not operate a VPN, tunnel, or proxy, and we do not capture
          the content or payload of your network connections, your browsing history,
          or DNS resolutions made by your device. We cannot produce traffic content
          because we never possess it, we observe only the destinations you ask us
          to evaluate.
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
        Emergency after-hours: same address, monitored daily<br />
        Mailing address: TunnelMind AI, LLC · legal@tunnelmind.ai<br />
        Response time: 3 business days for non-emergency requests
      </ContactBox>

    </LegalPage>
  )
}

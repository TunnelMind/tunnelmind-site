import React from 'react'
import { LegalPage, Section, P, UL, Divider, ContactBox } from './LegalPage.jsx'

export default function AbusePolicy() {
  return (
    <LegalPage eyebrow="● Legal" title="Abuse Handling Policy" effective="June 25, 2026">

      <Section title="Overview">
        <P>
          TunnelMind takes abuse reports seriously. This policy describes how we
          receive, investigate, and act on reports of misuse of TunnelMind
          infrastructure in violation of our Acceptable Use Policy.
        </P>
      </Section>

      <Section title="1. How to report abuse">
        <P>
          Email <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-green)' }}>legal@tunnelmind.ai</span> with
          subject line "ABUSE." Include:
        </P>
        <UL items={[
          'A description of the abusive activity.',
          'Timestamps (UTC) and any IP addresses, domains, or identifiers you observed.',
          'Logs, screenshots, or other evidence where available.',
          'Your contact information for follow-up.',
        ]} />
        <P>
          We acknowledge all abuse reports within 2 business days. We do not
          guarantee disclosure of actions taken to protect user privacy.
        </P>
      </Section>

      <Section title="2. What we investigate">
        <P>We act on credible reports of the following:</P>
        <UL items={[
          'Use of TunnelMind attestations or corpus data to target, attack, or facilitate harm against third-party systems or people.',
          'Misrepresenting a TunnelMind verdict or receipt — forging, altering, or falsely claiming an attestation we did not issue.',
          'Automated scraping, credential sharing, or circumvention of rate limits, prepaid balances, or the x402 payment rail.',
          'Payment fraud, chargebacks in bad faith, or identity theft in connection with an account.',
          'Submission of unlawful content — including child sexual abuse material (CSAM) — as a query input or in any field sent to us.',
          'Any use that violates our Acceptable Use Policy.',
        ]} />
      </Section>

      <Section title="3. Investigation process">
        <P>
          Upon receiving a credible abuse report, we will:
        </P>
        <UL items={[
          'Verify the report against our logs and metadata.',
          'If verified, contact the account holder where legally permissible.',
          'Issue a warning for first-time minor violations.',
          'Suspend or terminate accounts for serious or repeated violations.',
          'Preserve relevant records under legal hold if law enforcement has been or is likely to be involved.',
          'Cooperate with law enforcement if required by valid legal process.',
        ]} />
        <P>
          We do not share user data with abuse reporters. Reports are used for
          internal investigation only.
        </P>
      </Section>

      <Section title="4. What we cannot do">
        <P>
          TunnelMind is an attestation API, not a network operator. We are not in
          the path of anyone's traffic: we see the destinations a customer asks us
          to evaluate and the verdicts we returned — not communications content,
          not browsing history, not HTTPS payloads. We cannot reconstruct what a
          third party transmitted. Our evidentiary capability is limited to the
          account records and query metadata described in our Privacy Policy.
        </P>
        <P>
          We do not currently operate automated CSAM hash-matching (NCMEC PhotoDNA
          or equivalent). If we receive a credible CSAM report, we will immediately
          suspend the account, preserve records, and report to NCMEC as required by
          18 U.S.C. § 2258A.
        </P>
      </Section>

      <Section title="5. Repeat offenders and appeals">
        <P>
          Accounts subject to two or more substantiated abuse findings will be
          permanently terminated without refund. Users who believe a suspension
          was made in error may appeal to legal@tunnelmind.ai within 14 days.
        </P>
      </Section>

      <ContactBox>
        Abuse reports: legal@tunnelmind.ai (subject: ABUSE)<br />
        Response SLA: 2 business days acknowledgement<br />
        CSAM reports also go to: www.cybertipline.org (NCMEC)
      </ContactBox>

    </LegalPage>
  )
}

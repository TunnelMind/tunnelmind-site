import React from 'react'
import { LegalPage, Section, P, UL, Divider, ContactBox } from './LegalPage.jsx'

export default function TermsOfService() {
  return (
    <LegalPage eyebrow="● Legal" title="Terms of Service & Acceptable Use Policy" effective="April 24, 2026">

      <Section title="1. Agreement">
        <P>
          By registering for TunnelMind, completing passkey authentication, or
          accessing any TunnelMind API, you agree to these Terms of Service
          ("Terms") and the Acceptable Use Policy ("AUP") incorporated below.
          Your acceptance timestamp is recorded at registration. If you do not
          agree, do not use the service.
        </P>
        <P>
          These Terms form a binding agreement between you and TunnelMind AI, LLC,
          an Arkansas limited liability company.
        </P>
      </Section>

      <Section title="2. The service">
        <P>
          TunnelMind provides a WireGuard-based network tunnel with kernel-level
          traffic observation, surveillance actor identification, and policy
          enforcement tools. The service is provided for the purpose of giving users
          visibility into surveillance behavior targeting their own devices and networks.
        </P>
        <P>
          TunnelMind is not a general-purpose VPN, anonymization service, or
          circumvention tool. It is an adversarial intelligence and transparency
          platform.
        </P>
      </Section>

      <Section title="3. Accounts">
        <P>
          You must be at least 18 years old to use TunnelMind. You are responsible
          for all activity on your account. Keep your passkey device secure — it is
          your authentication factor. You may not share your account with others.
        </P>
        <P>
          To delete your account, use the DELETE /api/v1/auth/account endpoint with
          your session token, or email legal@tunnelmind.ai. Account deletion is
          permanent and irreversible. Data is purged in accordance with our Privacy Policy.
        </P>
      </Section>

      <Section title="4. Payment and refunds">
        <P>
          Paid plans are billed through Stripe. Subscriptions renew automatically.
          You may cancel at any time; cancellation takes effect at the end of the
          billing period. We do not offer pro-rated refunds for partial billing
          periods unless required by applicable law.
        </P>
        <P>
          If Stripe charges you after cancellation due to a processing error,
          contact legal@tunnelmind.ai within 30 days for a full refund.
        </P>
      </Section>

      <Section title="5. Acceptable use policy (AUP)">
        <P>
          TunnelMind's infrastructure may not be used to:
        </P>
        <UL items={[
          'Attack, probe, or scan systems you do not own or have explicit written authorization to test.',
          'Route traffic to facilitate fraud, identity theft, or financial crime.',
          'Transmit malware, ransomware, or exploit code.',
          'Conduct distributed denial-of-service (DDoS) attacks.',
          'Circumvent geographic restrictions imposed by third-party services in violation of their terms.',
          'Host or transmit child sexual abuse material (CSAM) or any illegal content.',
          'Engage in mass surveillance of others without their consent.',
          'Violate any applicable law or regulation.',
        ]} />
        <P>
          TunnelMind provides tools to expose surveillance actors. Using those tools
          to conduct surveillance on others inverts their purpose and is prohibited.
        </P>
      </Section>

      <Section title="6. Enforcement">
        <P>
          We may suspend or terminate your account if we receive credible reports
          of AUP violations, are required to act by lawful order, or determine
          through our own monitoring that your account poses a risk to the service
          or to others. We will attempt to notify you before suspension unless
          immediate action is required to prevent harm.
        </P>
        <P>
          Appeals: email legal@tunnelmind.ai within 14 days of suspension.
          We will respond within 5 business days.
        </P>
      </Section>

      <Section title="7. Disclaimers">
        <P>
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. TUNNELMIND
          DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.
          TUNNELMIND IS NOT RESPONSIBLE FOR THE CONTENT OF THIRD-PARTY SURVEILLANCE
          ACTORS IDENTIFIED BY THE SERVICE.
        </P>
      </Section>

      <Section title="8. Limitation of liability">
        <P>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, TUNNELMIND'S LIABILITY FOR ANY
          CLAIM ARISING FROM THESE TERMS IS LIMITED TO THE AMOUNT YOU PAID IN THE
          12 MONTHS PRECEDING THE CLAIM. TUNNELMIND IS NOT LIABLE FOR INDIRECT,
          INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.
        </P>
      </Section>

      <Section title="9. Governing law">
        <P>
          These Terms are governed by the laws of the State of Arkansas, without
          regard to conflict-of-law principles. Disputes will be resolved in the
          courts of Pulaski County, Arkansas, or in binding arbitration under AAA
          rules at your election.
        </P>
      </Section>

      <Section title="10. Changes">
        <P>
          We will post updates here and notify enrolled users by email at least 14
          days before material changes take effect. Continued use after the effective
          date constitutes acceptance.
        </P>
      </Section>

      <ContactBox>
        TunnelMind AI, LLC · legal@tunnelmind.ai<br />
        Abuse reports: legal@tunnelmind.ai (subject: ABUSE)<br />
        Appeals: legal@tunnelmind.ai (subject: APPEAL)
      </ContactBox>

    </LegalPage>
  )
}

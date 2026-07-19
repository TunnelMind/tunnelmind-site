import React from 'react'
import { LegalPage, Section, P, UL, Divider, ContactBox } from './LegalPage.jsx'

export default function TermsOfService() {
  return (
    <LegalPage eyebrow="● Legal" title="Terms of Service & Acceptable Use Policy" effective="May 17, 2026">

      <Section title="1. Agreement">
        <P>
          By accessing the TunnelMind website, the Scry corpus, any TunnelMind
          API, the MCP endpoint, or by purchasing a prepaid access block, you agree
          to these Terms of Service ("Terms") and the Acceptable Use Policy
          ("AUP") incorporated below. If you are accepting on behalf of an
          organization, you represent that you are authorized to bind it.
          If you do not agree, do not use the service.
        </P>
        <P>
          These Terms form a binding agreement between you and TunnelMind AI, LLC,
          an Arkansas limited liability company.
        </P>
      </Section>

      <Section title="2. The service">
        <P>
          TunnelMind operates a trust attestation layer for the agentic internet: a
          distributed fleet of attested sensors and a continuous recon pipeline
          that together produce the Scry corpus, a signed, continuously-updated
          record of hostile and automated network activity, including source
          addresses, protocols, tools, and campaigns. On top of the corpus sit a
          naming layer (OAI, the Observed Actor Identifier) and a verification
          layer (ATAP, the Agent Trust Attestation Protocol).
        </P>
        <P>
          The live radar, the chat interface, the free API tier, OAI resolution,
          and the MCP endpoint are provided free of charge as a public sample.
          Beyond the sample, full depth and scale, the full corpus, complete
          campaign membership, full payload signatures, bulk export, and
          programmatic access, are available by purchasing prepaid access blocks
          (through Stripe, for humans) or by paying per query over the x402 rail
          (for agents), under the license set out in Section 5.
        </P>
      </Section>

      <Section title="3. Accounts and API keys">
        <P>
          You must be at least 18 years old to use TunnelMind. The free surfaces
          require no account. Purchasing a prepaid access block provisions one API
          key, a Bearer credential that authenticates every request made under it.
        </P>
        <P>
          Treat your API key as a secret. Do not share it, publish it, or embed it
          in client-side or otherwise distributable code. You are responsible for
          all activity conducted with your key. We will revoke a key for any AUP
          violation. If your
          key is lost or exposed, email support@tunnelmind.ai; we will revoke the
          compromised key and issue a replacement.
        </P>
      </Section>

      <Section title="4. Payments, blocks, and refunds">
        <P>
          Human purchases are made through Stripe as one-time prepaid blocks of
          API calls. TunnelMind never receives or stores your card details. There
          is no subscription and nothing renews automatically, a block is a
          one-time purchase, its calls do not expire, and you buy another only when
          you choose to. Autonomous agents may instead pay per query over the x402
          rail (USDC), with no account and no stored balance.
        </P>
        <P>
          Because blocks are prepaid one-time purchases, there is nothing to cancel
          and no recurring charge to stop. Unused calls remain credited to your key
          until used.
        </P>
        <UL items={[
          'First-purchase refund: a first-time buyer who has not made substantial use of the paid corpus may request a full refund of an unused block within 14 days of purchase.',
          'Billing-error refund: if you are charged in error or charged more than once, contact legal@tunnelmind.ai within 30 days for a full refund.',
          'Price changes: any change to block pricing applies only to future purchases; blocks you have already bought are unaffected.',
        ]} />
      </Section>

      <Section title="5. Corpus data, license and permitted use">
        <P>
          The Scry corpus, the underlying database, and its structure and
          compilation are the property of TunnelMind AI, LLC. A purchased access
          block (or paid x402 query) grants you a non-exclusive, non-transferable,
          revocable license to access and use the corpus, including bulk export,
          for your own internal security operations, threat research, and product
          integrations.
        </P>
        <P>You may not:</P>
        <UL items={[
          'Resell, sublicense, or publicly redistribute the raw corpus or bulk exports, or use them to build or train a competing data product or feed.',
          'Use corpus records, including observed IP addresses and actor identifiers, to harass, dox, retaliate against, attack, or otherwise target any person or system.',
          'Represent the corpus or any substantial extract of it as your own original work, or strip its provenance when redistributing permitted derivatives.',
          'Continue to use, retain for operational use, or redistribute bulk exports after your access block is exhausted or your key is revoked, beyond a reasonable archival copy of your own historical analysis.',
        ]} />
        <P>
          The corpus identifies network infrastructure observed conducting hostile
          or automated activity. Inclusion is a record of observation, not an
          accusation, a legal determination, or a statement about any individual.
          The data carries no warranty of accuracy or completeness; you should not
          make automated punitive decisions solely on a corpus record without
          independent review. OAI identifiers and the public registry payload
          remain free to resolve and are dedicated to the public domain;
          the license in this Section governs bulk and full-corpus access only.
        </P>
      </Section>

      <Section title="6. Acceptable use policy (AUP)">
        <P>
          TunnelMind, the corpus, and the APIs may not be used to:
        </P>
        <UL items={[
          'Attack, probe, or scan systems you do not own or have explicit written authorization to test.',
          'Facilitate fraud, identity theft, financial crime, or the transmission of malware or exploit code.',
          'Conduct distributed denial-of-service (DDoS) attacks, or attempt to overwhelm, scrape around, or circumvent the rate limits and entitlements of the TunnelMind APIs.',
          'Conduct mass surveillance of others, or fabricate, poison, or salt the corpus or any third-party data feed.',
          'Host or transmit child sexual abuse material (CSAM) or any illegal content.',
          'Violate any applicable law or regulation, or any term of Section 5.',
        ]} />
        <P>
          TunnelMind exists to make hostile and automated network actors legible.
          Using its data to become one of them inverts the purpose of the service
          and is prohibited.
        </P>
      </Section>

      <Section title="7. Enforcement">
        <P>
          We may suspend or terminate your account or revoke your API key if we
          receive credible reports of AUP violations, are required to act by
          lawful order, or determine through our own monitoring that your use
          poses a risk to the service or to others. We will attempt to notify you
          before suspension unless immediate action is required to prevent harm.
        </P>
        <P>
          Appeals: email legal@tunnelmind.ai within 14 days of suspension.
          We will respond within 5 business days.
        </P>
      </Section>

      <Section title="8. Disclaimers">
        <P>
          THE SERVICE AND THE CORPUS ARE PROVIDED "AS IS" AND "AS AVAILABLE"
          WITHOUT WARRANTY OF ANY KIND. TUNNELMIND DOES NOT WARRANT THAT THE
          SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE, OR THAT ANY CORPUS RECORD
          IS ACCURATE, COMPLETE, OR CURRENT. TUNNELMIND IS NOT RESPONSIBLE FOR THE
          CONDUCT OF THIRD-PARTY ACTORS IDENTIFIED BY THE SERVICE, NOR FOR ANY
          DECISION YOU MAKE IN RELIANCE ON CORPUS DATA.
        </P>
      </Section>

      <Section title="9. Limitation of liability">
        <P>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, TUNNELMIND'S LIABILITY FOR ANY
          CLAIM ARISING FROM THESE TERMS IS LIMITED TO THE AMOUNT YOU PAID IN THE
          12 MONTHS PRECEDING THE CLAIM. TUNNELMIND IS NOT LIABLE FOR INDIRECT,
          INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.
        </P>
      </Section>

      <Section title="10. Governing law">
        <P>
          These Terms are governed by the laws of the State of Arkansas, without
          regard to conflict-of-law principles. Disputes will be resolved in the
          courts of Pulaski County, Arkansas, or in binding arbitration under AAA
          rules at your election.
        </P>
      </Section>

      <Section title="11. Changes">
        <P>
          We will post updates here and notify paying subscribers by email at
          least 14 days before material changes take effect. Continued use after
          the effective date constitutes acceptance.
        </P>
      </Section>

      <ContactBox>
        TunnelMind AI, LLC · legal@tunnelmind.ai<br />
        Billing &amp; refunds: legal@tunnelmind.ai (subject: BILLING)<br />
        Abuse reports: legal@tunnelmind.ai (subject: ABUSE)<br />
        Appeals: legal@tunnelmind.ai (subject: APPEAL)
      </ContactBox>

    </LegalPage>
  )
}

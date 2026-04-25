import React from 'react'
import { LegalPage, Section, P, UL, Divider, ContactBox } from './LegalPage.jsx'

export default function PrivacyPolicy() {
  return (
    <LegalPage eyebrow="● Legal" title="Privacy Policy" effective="April 24, 2026">

      <Section title="1. What TunnelMind is">
        <P>
          TunnelMind AI, LLC ("TunnelMind," "we," "us") operates surveillance
          visibility infrastructure. You route your internet traffic through a
          WireGuard tunnel; TunnelMind observes the metadata of that traffic at
          the kernel level and shows you which surveillance actors your devices
          contact, under what jurisdictions, and at what inferred cost to your
          privacy. We are the mirror, not the adversary.
        </P>
      </Section>

      <Section title="2. Data we collect">
        <P>The following data is collected when you use TunnelMind:</P>
        <UL items={[
          'Email address — collected at account creation and/or Stripe checkout.',
          'WireGuard public key and assigned tunnel IP (10.10.0.x) — required to operate the VPN.',
          'Peer name and peer ID — self-selected identifier stored at enrollment.',
          'DNS query metadata — domain name, timestamp, and your tunnel IP. No DNS payload content, no resolved IP addresses beyond what WireGuard routes normally.',
          'Network flow metadata — source IP, destination IP, ports, bytes transferred, protocol, direction. Observed at the kernel TC hook. No payload content.',
          'Verdict and policy reason — whether a DNS query or flow was allowed, warned, blocked, or audited, and why.',
          'Stripe customer ID and subscription ID — stored in our database if you pay for a plan.',
          'WebAuthn credential ID and public key — stored for passkey authentication. Your private key never leaves your device.',
          'Terms of Service acceptance timestamp — recorded when you complete registration.',
        ]} />
        <P>
          <strong>What we do not collect:</strong> passwords, browser history beyond
          DNS hostnames, payload content of any network connection, device serial
          numbers, or location data beyond what your IP implies.
        </P>
      </Section>

      <Section title="3. How we use it">
        <UL items={[
          'Operate and secure the WireGuard tunnel.',
          'Generate your surveillance exposure reports and tracker graph.',
          'Enforce your personal blocking and audit policies.',
          'Process payments via Stripe.',
          'Send transactional email (enrollment confirmations, policy alerts) if you opt in.',
          'Aggregate anonymized routing observations to build the TunnelMind Intelligence dataset. Individual records are never included in aggregates — only statistical derivatives.',
        ]} />
      </Section>

      <Section title="4. Local AI inference">
        <P>
          All AI inference (narrative generation, behavioral classification, policy
          compilation) runs on a local Ollama/Mistral 7B instance on our VPS. Your
          traffic metadata is never sent to OpenAI, Anthropic, Google, or any other
          cloud LLM provider. This is a hard architectural constraint, not a policy
          preference.
        </P>
      </Section>

      <Section title="5. Data sharing and subprocessors">
        <P>We share data with the following subprocessors only:</P>
        <UL items={[
          'Stripe, Inc. — payment processing. Stripe receives your email and payment card. Stripe Privacy Policy: stripe.com/privacy.',
          'Cloudflare, Inc. — CDN, DNS, Workers, D1 database, and KV storage for data.tunnelmind.ai. Cloudflare Privacy Policy: cloudflare.com/privacypolicy.',
          'Hetzner Online GmbH — VPS hosting (Frankfurt, Germany). Hetzner Privacy Policy: hetzner.com/legal/privacy-policy.',
        ]} />
        <P>
          We do not sell, rent, or trade your personal data. We do not share data
          with advertising networks, data brokers, or analytics platforms.
          We do not use third-party web analytics or tracking pixels on any
          TunnelMind property.
        </P>
      </Section>

      <Section title="6. Data retention">
        <P>
          DNS query events and network flow records are retained for 90 days from
          capture, then deleted. Account records (email, passkey credential, WireGuard
          peer) are retained until you delete your account. Stripe billing records are
          retained as required by financial regulations (typically 7 years) and governed
          by Stripe's data retention policy.
        </P>
        <P>
          Aggregated, anonymized Intelligence dataset records do not contain individual
          user identifiers and are retained indefinitely as they are statistical
          derivatives.
        </P>
      </Section>

      <Section title="7. Your rights">
        <P>
          Regardless of your jurisdiction, you have the following rights:
        </P>
        <UL items={[
          'Access — request a copy of the personal data we hold about you.',
          'Correction — correct inaccurate personal data.',
          'Deletion — permanently delete your account and associated personal data. Use DELETE /api/v1/auth/account in the TunnelMind app, or email legal@tunnelmind.ai.',
          'Portability — receive your data in machine-readable format.',
          'Restriction — ask us to stop processing your data while a dispute is pending.',
          'Objection — object to processing based on legitimate interests.',
        ]} />
        <P>
          EU and UK residents have these rights under GDPR and UK GDPR respectively.
          California residents have rights under CCPA. We respond to all verified
          requests within 30 days.
        </P>
      </Section>

      <Section title="8. Security">
        <P>
          Traffic between your device and the TunnelMind server is encrypted with
          WireGuard (ChaCha20-Poly1305). API keys are stored as SHA-256 hashes — the
          raw key is displayed once at creation and never stored. WebAuthn private keys
          never leave your device. Surveillance receipts are Ed25519-signed and
          hash-chained for tamper evidence. We do not store passwords.
        </P>
      </Section>

      <Section title="9. Law enforcement">
        <P>
          See our separate Law Enforcement Policy for how we respond to lawful process.
          We do not proactively share data with law enforcement absent a valid legal
          order. The data we can produce in response to legal process is limited to
          account records and metadata — we have no payload content to disclose.
        </P>
      </Section>

      <Section title="10. Changes to this policy">
        <P>
          We will post changes here and update the effective date. For material changes,
          we will notify enrolled users by email at least 14 days before the change
          takes effect.
        </P>
      </Section>

      <ContactBox>
        Data controller: TunnelMind AI, LLC<br />
        Contact: legal@tunnelmind.ai<br />
        Warrant canary: tunnelmind.ai/canary.json
      </ContactBox>

    </LegalPage>
  )
}

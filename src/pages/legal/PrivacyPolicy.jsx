import React from 'react'
import { LegalPage, Section, P, UL, ContactBox } from './LegalPage.jsx'

export default function PrivacyPolicy() {
  return (
    <LegalPage eyebrow="● Legal" title="Privacy Policy" effective="June 21, 2026">

      <Section title="1. What TunnelMind is">
        <P>
          TunnelMind AI, LLC ("TunnelMind," "we," "us") operates a trust
          attestation layer for the agentic internet. You, or your agent, ask
          us to evaluate a destination (an IP address, domain, ASN, or seller
          path), and we return a signed verdict drawn from our intelligence
          corpus across four lenses (Scry, Sigil, Tracker, GhostRoute). We
          observe the destinations you ask about; we do not sit in the path of
          your traffic.
        </P>
      </Section>

      <Section title="2. Data we collect">
        <P>The following data is collected when you use TunnelMind:</P>
        <UL items={[
          'Email address, collected at account creation and/or Stripe checkout.',
          'API key, issued to you for programmatic access. We store only a SHA-256 hash; the raw key is shown once at creation and never stored.',
          'Query inputs, the IP addresses, domains, ASNs, or seller paths you submit to /v1/verify, /v1/preflight, and related endpoints, with a timestamp. These are the subjects you ask us to evaluate, not your own network traffic.',
          'Verdict and reason, the attestation we returned (allow / caution / deny, or per-lens score) and the evidence behind it, retained so receipts remain verifiable.',
          'Stripe customer ID, stored in our database if you purchase a prepaid block.',
          'x402 payment metadata, for agent micropayments, the on-rail payment reference associated with a call. We do not custody funds.',
          'WebAuthn credential ID and public key, stored if you use a passkey for dashboard sign-in. Your private key never leaves your device.',
          'Terms of Service acceptance timestamp, recorded when you complete registration.',
        ]} />
        <P>
          <strong>What we do not collect:</strong> the content or payload of your
          network connections, your browsing history, passwords, device serial
          numbers, or location data beyond what your IP implies. TunnelMind is
          not a VPN and does not route or proxy your internet traffic.
        </P>
      </Section>

      <Section title="3. How we use it">
        <UL items={[
          'Evaluate the destinations you submit and return signed verdicts and receipts.',
          'Enforce usage and rate limits and account for prepaid call balances.',
          'Process payments via Stripe (prepaid blocks) and the x402 rail (agent micropayments).',
          'Send transactional email (receipts, balance and security alerts) if you opt in.',
          'Aggregate anonymized destination observations to improve the TunnelMind intelligence corpus. Individual account identifiers are never included in aggregates, only statistical derivatives.',
        ]} />
      </Section>

      <Section title="4. Local AI inference">
        <P>
          Any AI inference we run on your behalf executes on a local Ollama
          instance on our own infrastructure. Your query data is never sent to a
          third-party cloud LLM provider. This is a hard architectural
          constraint, not a policy preference.
        </P>
      </Section>

      <Section title="5. Data sharing and subprocessors">
        <P>We share data with the following subprocessors only:</P>
        <UL items={[
          'Stripe, Inc., payment processing for prepaid blocks. Stripe receives your email and payment card. Stripe Privacy Policy: stripe.com/privacy.',
          'Cloudflare, Inc.. CDN, Pages, Workers, and edge storage for tunnelmind.ai and data.tunnelmind.ai. Cloudflare Privacy Policy: cloudflare.com/privacypolicy.',
          'Hetzner Online GmbH. VPS hosting (Frankfurt, Germany). Hetzner Privacy Policy: hetzner.com/legal/privacy-policy.',
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
          Query inputs and verdict records are retained for 90 days from the
          request, then deleted, except where a longer period is needed to keep a
          signed receipt verifiable. Account records (email, API key hash, passkey
          credential) are retained until you delete your account. Stripe billing
          records are retained as required by financial regulations (typically 7
          years) and governed by Stripe's data retention policy.
        </P>
        <P>
          Aggregated, anonymized corpus records do not contain individual user
          identifiers and are retained indefinitely as they are statistical
          derivatives.
        </P>
      </Section>

      <Section title="7. Your rights">
        <P>
          Regardless of your jurisdiction, you have the following rights:
        </P>
        <UL items={[
          'Access, request a copy of the personal data we hold about you.',
          'Correction, correct inaccurate personal data.',
          'Deletion, permanently delete your account and associated personal data. Email legal@tunnelmind.ai.',
          'Portability, receive your data in machine-readable format.',
          'Restriction, ask us to stop processing your data while a dispute is pending.',
          'Objection, object to processing based on legitimate interests.',
        ]} />
        <P>
          EU and UK residents have these rights under GDPR and UK GDPR respectively.
          California residents have rights under CCPA. We respond to all verified
          requests within 30 days.
        </P>
      </Section>

      <Section title="8. Security">
        <P>
          Traffic between your client and the TunnelMind API is encrypted in
          transit with TLS. API keys are stored as SHA-256 hashes, the raw key is
          displayed once at creation and never stored. WebAuthn private keys never
          leave your device. Verdicts and receipts are Ed25519-signed and
          hash-chained for tamper evidence. We do not store passwords.
        </P>
      </Section>

      <Section title="9. Law enforcement">
        <P>
          See our separate Law Enforcement Policy for how we respond to lawful process.
          We do not proactively share data with law enforcement absent a valid legal
          order. The data we can produce in response to legal process is limited to
          account records and query metadata, we have no traffic payload content to
          disclose.
        </P>
      </Section>

      <Section title="10. Changes to this policy">
        <P>
          We will post changes here and update the effective date. For material changes,
          we will notify registered users by email at least 14 days before the change
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

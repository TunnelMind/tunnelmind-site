import React from 'react'
import PageDesc from '../components/PageDesc.jsx'

const NETSHELL_DOWNLOADS = [
  { platform: 'Windows', ext: '.exe', file: 'NetShell-Setup.exe' },
  { platform: 'macOS',   ext: '.dmg', file: 'NetShell-1.0.0-arm64.dmg' },
  { platform: 'Linux',   ext: '.deb', file: 'netshell_1.0.0_amd64.deb' },
]

const LIVE_TOOLS = [
  {
    name: 'Surveillance Receipt',
    desc: 'Paste any domains or URLs you\'ve visited. Get a line-item invoice showing what your browsing data is worth to the surveillance economy — broken down by tracker, company, and data category. Fully local, nothing leaves your browser. If you have the TunnelMind extension installed, it auto-loads your real session.',
    url: '/#/receipt',
    label: 'tunnelmind.ai/receipt',
    tag: 'Live · Free · Local',
  },
  {
    name: 'NetProbe',
    desc: 'Full domain intelligence: WHOIS, DNS records, mail security (SPF/DMARC/DKIM), SSL certificate transparency, HTTP headers, and tech stack fingerprinting — plus surveillance tracker scores and ownership data.',
    url: 'https://netprobe.tunnelmind.ai',
    label: 'netprobe.tunnelmind.ai',
    tag: 'Live · Free',
  },
  {
    name: 'Surveillance Radar',
    desc: '704 surveillance entities and 9,786 domains rendered as an interactive force-directed graph. Click any node to explore corporate ownership chains.',
    url: 'https://radar.tunnelmind.ai',
    label: 'radar.tunnelmind.ai',
    tag: 'Live · Free',
  },
  {
    name: 'Tracker Data API',
    desc: 'REST API with 50 free requests/day, CORS open, no key required. The dataset powering all TunnelMind tools — domains, entities, scores, ownership.',
    url: 'https://data.tunnelmind.ai',
    label: 'data.tunnelmind.ai',
    tag: 'Live · 50 req/day free',
  },
  {
    name: 'Receipt Verification',
    desc: 'Independently verify any TunnelMind Surveillance Receipt. Submit a receipt_id to confirm it was signed by TunnelMind and the content has not been tampered with.',
    url: 'https://data.tunnelmind.ai/verify/',
    label: 'data.tunnelmind.ai/verify/',
    tag: 'Live · Free · Public',
  },
  {
    name: 'GhostRoute Certificate Verification',
    desc: 'Independently verify any GhostRoute Jurisdictional Routing Certificate. Submit a certificate_id to confirm it was signed by TunnelMind and the jurisdiction data has not been tampered with. POST /ghostroute/verify with certificate_id, content_hash, and signature.',
    url: 'https://data.tunnelmind.ai/ghostroute/verify',
    label: 'data.tunnelmind.ai/ghostroute/verify',
    tag: 'Live · Free · Public',
  },
  {
    name: 'Browser Extension',
    desc: 'Passive tracker interception as you browse — no proxy, no DNS redirect. Every third-party request is matched against 9,786 known surveillance domains. Real-time popup shows who\'s watching and what your session is worth. One-click access to the live surveillance map. Firefox + Chrome.',
    url: 'https://addons.mozilla.org/firefox/addon/tunnelmind-surveillance-receipt/',
    label: 'Firefox · Chrome Web Store',
    tag: 'Pending Review',
  },
]

const PERSONAL_TOOLS = [
  {
    name: 'Surveillance Map',
    desc: 'Live force-directed graph of every surveillance actor that has contacted your device — built from eBPF DNS telemetry at the kernel level, not browser-level interception. Nodes are color-coded by category (ad tech, data broker, analytics, CDN). Click any node for corporate ownership, contact frequency, and data categories. Updates in real time as traffic flows.',
    tag: 'Personal · Enrolled',
  },
  {
    name: 'Surveillance Dossier Receipt',
    desc: 'A cryptographically signed document proving what the surveillance ecosystem knows about you, what your data is worth, and which jurisdictions it flows through. Signed with Ed25519, verifiable at data.tunnelmind.ai. Includes a one-click generator for GDPR Art. 15 / CCPA §1798.100 legal letters to every actor that touched you.',
    tag: 'Personal · Enrolled',
  },
  {
    name: 'Resonance',
    desc: 'Detects which surveillance actors are coordinating with each other through your traffic — purely from beacon timing patterns. When DoubleClick fires and LiveRamp fires 87ms later, every time, that\'s not a coincidence. Resonance builds a cross-actor coordination graph showing who\'s talking to whom about you, with Pearson correlation, lag times, and cluster analysis.',
    tag: 'Personal · Enrolled',
  },
  {
    name: 'GhostRoute',
    desc: 'Generates a cryptographically signed certificate proving which legal jurisdictions your DNS traffic traversed — EU GDPR-adequate zones, FISA 702 reach, Five Eyes, China, Russia. Weighted by traffic volume so high-frequency domains count more. Verdicts: COMPLIANT | PARTIAL | NON_COMPLIANT. Each certificate includes GDPR Art. 44 legal citations and an Ed25519 signature verifiable by any third party at data.tunnelmind.ai. Built for DPOs, legal teams, and anyone who needs to prove where their data actually went.',
    tag: 'Personal · New',
  },
  {
    name: 'Dark Mirror',
    desc: 'What advertisers believe they know about you. Inferred from every surveillance actor observed contacting your device: age range, income bracket, health signals, political targeting exposure, purchase intent. The profile being bought and sold about you, made visible.',
    tag: 'Personal · Enrolled',
  },
  {
    name: 'Cost of You',
    desc: 'Real-time dollar valuation of your data profile. Every actor that contacted your device contributes an estimated annual data value based on their CPM rates and your inferred demographic. Broken down by category: who is extracting the most, and what they\'re getting paid for it.',
    tag: 'Personal · Enrolled',
  },
]

function TagColor(tag) {
  if (tag.includes('New'))      return 'var(--accent-cyan)'
  if (tag.includes('Personal')) return 'var(--accent-blue)'
  return 'var(--accent-green)'
}

function ProductCard({ tool }) {
  const isLink = !!tool.url
  const El = isLink ? 'a' : 'div'
  const linkProps = isLink ? { href: tool.url, target: '_blank', rel: 'noopener noreferrer' } : {}
  const tagColor = TagColor(tool.tag)

  return (
    <El
      {...linkProps}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        background: 'var(--chrome-bg2)',
        border: '1px solid var(--chrome-border)',
        borderRadius: '3px',
        textDecoration: 'none',
        transition: 'border-color 150ms ease, background 150ms ease',
        cursor: isLink ? 'pointer' : 'default',
      }}
      onMouseEnter={isLink ? e => {
        e.currentTarget.style.borderColor = tagColor
        e.currentTarget.style.background = 'var(--doc-paper)'
      } : undefined}
      onMouseLeave={isLink ? e => {
        e.currentTarget.style.borderColor = 'var(--chrome-border)'
        e.currentTarget.style.background = 'var(--chrome-bg2)'
      } : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--chrome-text-bright)',
        }}>
          {tool.name}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: tagColor,
          border: `1px solid ${tagColor}`,
          borderRadius: '2px',
          padding: '1px 5px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          opacity: 0.85,
        }}>
          {tool.tag}
        </span>
      </div>

      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '17px',
        lineHeight: '1.6',
        color: 'var(--doc-text)',
        margin: 0,
      }}>
        {tool.desc}
      </p>

      {tool.label && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent-blue)',
          marginTop: 'auto',
        }}>
          {tool.label} ↗
        </span>
      )}
    </El>
  )
}

export default function Products() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <PageDesc
        title="products"
        desc="Tools we've built. Public web tools require no account. Personal features require an enrolled TunnelMind device — traffic observed at the kernel level, not via browser extension."
      />

      {/* Product cards */}
      <div style={{ padding: 'clamp(12px, 4vw, 32px)', paddingBottom: 0, maxWidth: '960px', margin: '0 auto' }}>

        {/* Public web tools */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent-green)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          ● Public Web Tools
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '10px',
          marginBottom: '32px',
        }}>
          {LIVE_TOOLS.map(tool => (
            <ProductCard key={tool.url} tool={tool} />
          ))}
        </div>

        {/* Personal tier */}
        <div style={{ height: '1px', background: 'var(--chrome-border)', marginBottom: '24px' }} />
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent-blue)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          ◎ TunnelMind Personal — Enrolled Device Features
        </div>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '14px',
          color: 'var(--doc-text)',
          marginBottom: '14px',
          lineHeight: '1.6',
        }}>
          These features require a TunnelMind-enrolled device (VPN peer). Traffic is observed at the kernel level via eBPF — not via a browser extension or proxy. The signal is real.
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '10px',
          marginBottom: '32px',
        }}>
          {PERSONAL_TOOLS.map(tool => (
            <ProductCard key={tool.name} tool={tool} />
          ))}
        </div>

        <div style={{ height: '1px', background: 'var(--chrome-border)', marginBottom: '24px' }} />

        {/* NetShell */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent-amber)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          ⬡ Desktop Apps
        </div>

        <div style={{
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderRadius: '3px',
          padding: '16px',
          marginBottom: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--chrome-text-bright)' }}>
              NetShell
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--accent-amber)',
              border: '1px solid var(--accent-amber)',
              borderRadius: '2px',
              padding: '1px 5px',
              opacity: 0.85,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              Beta · Unsigned
            </span>
          </div>

          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', lineHeight: '1.6', color: 'var(--doc-text)', margin: 0 }}>
            SSH/Telnet/Serial terminal built for network engineers. Multi-tab sessions, encrypted credential vault, broadcast commands to multiple devices simultaneously, compliance scanning (CIS/STIG), AI-assisted troubleshooting, topology discovery via LLDP, TFTP file transfer, GitOps config drift detection, and session recording with Ed25519 audit signatures. Connects to SSH, Telnet, Serial, Cisco Meraki, gNMI, Kubernetes, and AWS SSM.
          </p>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--chrome-text-dim)',
            lineHeight: '1.6',
            padding: '6px 8px',
            background: 'var(--chrome-bg)',
            border: '1px solid var(--chrome-border)',
            borderRadius: '2px',
          }}>
            <span style={{ color: 'var(--accent-amber)' }}>⚠ Unsigned builds.</span>
            {' '}Windows: click "More info → Run anyway" if SmartScreen appears.
            {' '}macOS: right-click the app → Open → Open to bypass Gatekeeper.
            {' '}Code signing coming once certificates are issued.
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            {NETSHELL_DOWNLOADS.map(({ platform, ext, file }) => (
              <a
                key={platform}
                href={`https://github.com/TunnelMind/netshell/releases/latest/download/${file}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  background: 'var(--chrome-bg)',
                  border: '1px solid var(--chrome-border)',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--accent-amber)',
                  textDecoration: 'none',
                  transition: 'border-color 150ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-amber)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--chrome-border)'}
              >
                ↓ {platform} <span style={{ color: 'var(--chrome-text-dim)' }}>{ext}</span>
              </a>
            ))}
            <a
              href="https://github.com/TunnelMind/netshell/releases"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid var(--chrome-border)',
                borderRadius: '2px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--chrome-text-dim)',
                textDecoration: 'none',
              }}
            >
              All releases ↗
            </a>
          </div>

          {/* Package repo one-liners */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '8px',
            marginTop: '4px',
          }}>
            {[
              {
                label: 'Debian / Ubuntu',
                lines: [
                  'curl -fsSL https://packages.tunnelmind.ai/apt/gpg.key | sudo apt-key add -',
                  'echo "deb https://packages.tunnelmind.ai/apt stable main" | sudo tee /etc/apt/sources.list.d/netshell.list',
                  'sudo apt-get update && sudo apt-get install netshell',
                ],
              },
              {
                label: 'Fedora / RHEL / Rocky',
                lines: [
                  'sudo curl -fsSL https://packages.tunnelmind.ai/rpm/netshell.repo \\',
                  '  -o /etc/yum.repos.d/netshell.repo',
                  'sudo dnf install netshell',
                ],
              },
            ].map(({ label, lines }) => (
              <div key={label} style={{
                background: 'var(--chrome-bg)',
                border: '1px solid var(--chrome-border)',
                borderRadius: '2px',
                padding: '8px 10px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--chrome-text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '6px',
                }}>
                  {label}
                </div>
                {lines.map((line, i) => (
                  <div key={i} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--accent-green)',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                  }}>
                    {line}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--chrome-border)', marginBottom: '0' }} />
      </div>
    </div>
  )
}

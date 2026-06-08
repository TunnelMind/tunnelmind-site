import React from 'react'

// The /vision route. Plain prose — the thesis behind the pivot
// (P25 Phase 2): TunnelMind reframed as the observability layer for the
// agentic internet. House voice, data-forward, a little dry.

const eyebrow = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  color: 'var(--accent-green)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  marginBottom: '12px',
}
const sectionLabel = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  color: 'var(--chrome-text-dim)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: '14px',
}
const prose = {
  fontFamily: 'var(--font-serif)',
  fontSize: '16px',
  lineHeight: '1.85',
  color: 'var(--doc-text-dim)',
  marginBottom: '18px',
  maxWidth: '620px',
}
const h2 = {
  fontFamily: 'var(--font-serif)',
  fontSize: 'clamp(20px, 3vw, 26px)',
  fontWeight: 400,
  lineHeight: '1.3',
  color: 'var(--chrome-text-bright)',
  marginBottom: '16px',
}
const rule = { height: '1px', background: 'var(--chrome-border)', margin: '48px 0' }
const inlineMono = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.88em',
  background: 'rgba(255,255,255,0.04)',
  padding: '1px 6px',
  borderRadius: '2px',
}

const PRINCIPLES = [
  {
    head: 'Signed at the source',
    body: 'Every observation in the corpus is Ed25519-signed by the sensor that made it. Data that cannot prove where it came from is an opinion, not evidence.',
  },
  {
    head: 'The corpus is public',
    body: 'The radar shows a live sample to anyone, no account. Identifiers resolve for free, forever. We charge for depth and scale — never for the right to look.',
  },
  {
    head: 'Stable identifiers, not vibes',
    body: 'Every observed actor — tracker, scanner, ad network, threat actor, sensor — gets a permanent handle (OAI). You cannot defend against an entity you cannot name.',
  },
  {
    head: 'No profile poisoning, ever',
    body: 'We make the watchers legible. We do not fabricate data, salt anyone’s feed, or fight noise with noise. Observation is the whole product.',
  },
  {
    head: 'Local-first where it touches people',
    body: 'Anything that analyzes a person’s own traffic runs on their machine. The corpus is built from hostile infrastructure, not from users.',
  },
]

export default function Landing({ onNavigate }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <div style={{ position: 'relative', maxWidth: '760px', margin: '0 auto', padding: 'clamp(32px, 6vw, 60px) clamp(16px, 4vw, 32px)' }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div style={eyebrow}>● Vision</div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(26px, 4.6vw, 42px)',
          fontWeight: 600,
          lineHeight: '1.22',
          letterSpacing: '0.01em',
          color: 'var(--chrome-text-bright)',
          marginBottom: '22px',
        }}>
          The internet is being repopulated by software that never sleeps.
        </h1>
        <p style={{ ...prose, fontSize: '18px' }}>
          Most of the traffic hitting a public endpoint today was not typed by
          a person. Crawlers, scanners, scrapers, agents, and outright attackers
          now make up the majority of requests on the open web. The dead
          internet theory had a point — it just got the tone wrong. The internet
          isn&apos;t dead. It&apos;s employed.
        </p>

        <div style={rule} />

        {/* ── The shift ─────────────────────────────────────────────── */}
        <section>
          <div style={sectionLabel}>The shift</div>
          <h2 style={h2}>The web&apos;s consumers are becoming machines.</h2>
          <p style={prose}>
            For thirty years the unit of web traffic was a human with a browser.
            Identity could stay implicit because the system mostly worked: a
            person, a session, a reputation that accrued slowly. That assumption
            is now false. The fastest-growing class of client is an autonomous
            agent acting on someone&apos;s behalf — or on no one&apos;s.
          </p>
          <p style={prose}>
            When the thing making a request is not a person, every question that
            used to be answered by &ldquo;it&apos;s probably fine&rdquo; becomes
            load-bearing. Who is this? What have they done elsewhere? Can the
            claim they&apos;re making be checked? The web has no native answer
            to any of it.
          </p>
        </section>

        <div style={rule} />

        {/* ── The problem ───────────────────────────────────────────── */}
        <section>
          <div style={sectionLabel}>The problem</div>
          <h2 style={h2}>Identity is the load-bearing question, and it&apos;s unanswerable.</h2>
          <p style={prose}>
            The infrastructure for naming non-human actors does not exist in any
            usable form. Threat feeds are siloed, unsigned, and contradict each
            other. WHOIS is a guess. Reputation scores are black boxes with a
            confidence interval of &ldquo;trust us.&rdquo; An agent that wants to
            verify who it is talking to has nowhere to look — and a defender
            staring at hostile traffic has no stable handle to track.
          </p>
          <p style={prose}>
            You cannot fight what you cannot see, and you cannot see what you
            cannot name. The missing layer is observability: a public, signed,
            continuously-updated record of who is acting on the network and what
            they have done.
          </p>
        </section>

        <div style={rule} />

        {/* ── What we're building ───────────────────────────────────── */}
        <section>
          <div style={sectionLabel}>What we&apos;re building</div>
          <h2 style={h2}>The observability layer for the agentic internet.</h2>
          <p style={prose}>
            TunnelMind runs a distributed fleet of attested sensors and a
            continuous clearnet recon pipeline. Together they produce a corpus of
            hostile network activity — real source IPs, the protocols they
            attacked, the tools they share, the campaigns they cluster into. Every
            observation is signed at the sensor before it reaches the corpus, so
            the data can prove its own provenance.
          </p>
          <p style={prose}>
            On top of the corpus sits a naming layer (OAI — the Observed Actor
            Identifier) and a verification layer (ATAP — the Agent Trust
            Attestation Protocol). The first gives every observed actor a
            permanent, free-to-resolve handle. The second lets one agent check
            another&apos;s claims against signed evidence instead of taking them
            on faith. Both are open standards, published for public comment
            before the code locks.
          </p>
          <p style={prose}>
            The live radar on the front page is a working sample of that corpus.
            It is not a teaser bolted onto a sales page — the sample is the
            product, shown honestly, at no charge.
          </p>
        </section>

        <div style={rule} />

        {/* ── The cross-lens moat ─────────────────────────────────── */}
        <section>
          <div style={sectionLabel}>The join</div>
          <h2 style={h2}>Real vs. fake is a join, not a query.</h2>
          <p style={prose}>
            Every existing trust vendor owns one half of the graph. GreyNoise
            and Spur can tell you which IPs scan the internet — they cannot
            tell you which of those IPs are the egress for an SSP carrying a
            hundred thousand publisher relationships. DoubleVerify, IAS,
            HUMAN, and Pixalate can tell you which supply paths look
            fraudulent — they cannot tell you which of those paths source
            traffic from IPs your own sensors have logged scanning for
            Log4Shell. Neither side can answer the question an agent is
            actually asking: <em>is this real?</em>
          </p>
          <p style={prose}>
            TunnelMind runs four lenses against the same observation
            graph. <strong>Scry</strong> watches who is attacking — IPs,
            ASNs, behaviors, threat-intel overlap.{' '}
            <strong>Sigil</strong> watches who can be trusted —
            publishers, SSPs, DSPs, seats, the OpenRTB SupplyChain.{' '}
            <strong>Tracker</strong> watches who is paying whom in the
            surveillance economy.{' '}
            <strong>GhostRoute</strong> watches where the traffic
            actually goes — the origin AS, the RPKI validity of the
            route, the sovereign jurisdiction a service claims versus the
            one it routes through, and the certificate-transparency logs
            we witness ourselves. They share a graph; the join across
            them is the thing nobody else can compute.
          </p>
          <p style={prose}>
            A worked example. An IP shows up in Scry as{' '}
            <em>hostile_opportunistic</em>, scanning four hundred separate
            /24s in the last twenty-four hours. The same IP, looked up in
            Sigil, turns out to be the publishing egress for an SSP that
            intermediates a hundred and twenty thousand sells-through
            edges. Neither finding alone is decisive — scanners and SSPs
            can both be benign — but the combination is a hard fail any
            agent that bid on inventory carried through that path needs
            to know about, immediately, with cryptographic proof.
          </p>
          <p style={prose}>
            Sovereignty is the same join, run on geography. An agent told
            to use only EU-resident inference can ask GhostRoute directly:
            a German model whose API resolves to an origin AS owned by a
            German carrier verifies clean; a service that markets itself as
            sovereign-in-region but whose traffic actually egresses through
            a hyperscaler on another continent comes back a{' '}
            <em>mismatch</em> — claim and route disagree, and the proof is
            the RPKI-validated origin, not a marketing page.
          </p>
          <p style={prose}>
            The endpoint that returns this is{' '}
            <code style={inlineMono}>POST /v1/verify/&#123;node&#125;</code>{' '}
            on <code style={inlineMono}>data.tunnelmind.ai</code>. One
            call, one node key (IP, domain, ASN, or entity), four lens
            blocks plus the fused verdict, a five-minute signed{' '}
            <code style={inlineMono}>sigil_token</code> as portable
            proof, and an optional ATAP witness event chained onto the
            calling agent&apos;s identity token. The agent learns the
            answer and leaves behind a verifiable trail in the same
            request.
          </p>
        </section>

        <div style={rule} />

        {/* ── Principles ────────────────────────────────────────────── */}
        <section>
          <div style={sectionLabel}>How we build it</div>
          <h2 style={{ ...h2, marginBottom: '24px' }}>Five things we will not compromise.</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {PRINCIPLES.map((p, i) => (
              <div key={p.head} style={{
                background: 'var(--doc-paper)',
                border: '1px solid var(--chrome-border)',
                borderLeft: '3px solid var(--accent-green)',
                borderRadius: '4px',
                padding: '16px 20px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--chrome-text-bright)',
                  marginBottom: '6px',
                }}>
                  {String(i + 1).padStart(2, '0')} · {p.head}
                </div>
                <div style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: 'var(--doc-text-dim)',
                }}>
                  {p.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={rule} />

        {/* ── Close ─────────────────────────────────────────────────── */}
        <section>
          <div style={sectionLabel}>Who builds it</div>
          <p style={prose}>
            TunnelMind is a single-operator project. There is no board, no
            venture money, and no quarterly plan — only the order that unblocks
            the most leverage. The corpus is open, the resolver is free, and the
            registry payload is dedicated to the public domain. If the agentic
            internet is going to be legible, someone has to start writing it
            down. We started.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '26px' }}>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('landing')}
              style={{
                padding: '9px 20px',
                background: 'var(--accent-green)',
                border: '1px solid var(--accent-green)',
                borderRadius: '3px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--chrome-bg)',
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              See the radar
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('roadmap')}
              style={{
                padding: '9px 20px',
                background: 'transparent',
                border: '1px solid var(--chrome-border)',
                borderRadius: '3px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--chrome-text)',
                cursor: 'pointer',
              }}
            >
              Read the roadmap
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}

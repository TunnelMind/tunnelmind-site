import React from 'react'
import InteractiveSentence from '../components/InteractiveSentence.jsx'
import { Ruler } from '../components/WPChrome.jsx'
import { useTM } from '../lib/state.jsx'
import { SCORE_WEIGHTS, calculateScore } from '../lib/scoring.js'

const SYSTEM_CONTENT = [
  {
    section: 'scoring',
    title: 'How Contribution is Scored',
    sentences: [
      { key: 's1', text: 'Every interaction on TunnelMind — a vote cast, an annotation posted, a correction accepted — is logged to an append-only contribution ledger that cannot be revised.' },
      { key: 's2', text: 'The ledger is the source of truth for the contributor leaderboard, and it will be the source of truth for monetary compensation when TunnelMind\'s products become profitable.' },
      { key: 's3', text: 'Contributing now, before compensation launches, builds a tracked record with a known timestamp — earlier contributors will have a documented history that later contributors cannot retroactively claim.' },
    ],
  },
  {
    section: 'weights',
    title: 'Point Weights',
    sentences: [
      { key: 's1', text: 'Annotations created: 5 points each — the highest-value action because annotations add context that improves the content for everyone.' },
      { key: 's2', text: 'Upvotes received on annotations: 2 points each — community validation of your contributions earns compounding value.' },
      { key: 's3', text: 'Votes cast: 1 point each — participation in the collective signal matters even without creation.' },
      { key: 's4', text: 'Corrections accepted by author: 10 points each — the highest single-action reward, because accepted corrections permanently improve the record.' },
      { key: 's5', text: 'Point weights are stored in a configuration table, not hardcoded — they will be rebalanced as we learn more about what kinds of contributions create the most value.' },
    ],
  },
  {
    section: 'compensation',
    title: 'Future Compensation',
    sentences: [
      { key: 's1', text: 'When TunnelMind\'s products generate revenue, contributors will receive proportional payments based on their share of total community signal.' },
      { key: 's2', text: 'The compensation model is designed around the ledger, not around subscriptions or tenure — if your annotations are the ones that brought a reader to understand TunnelMind\'s value, your ledger entry reflects that.' },
      { key: 's3', text: 'Payment mechanics — wallet addresses, payout schedules, minimum thresholds — will be specified and published before the first payment is made.' },
      { key: 's4', text: 'We are building the ledger now because retrofitting attribution is impossible; you cannot reward past contribution you failed to track.' },
    ],
  },
  {
    section: 'botprotection',
    title: 'Bot Protection',
    sentences: [
      { key: 's1', text: 'Every action is fingerprinted with a hashed combination of browser UA, timezone, screen resolution, and hardware characteristics — sufficient to distinguish participants without requiring account creation.' },
      { key: 's2', text: 'Rate limits cap at 30 votes per hour and 10 annotations per day from a single fingerprint without email verification — high enough for genuine participation, prohibitive for programmatic abuse.' },
      { key: 's3', text: 'Elevated actions — author replies, correction applications — require magic link verification via a disposable email address; no passwords are ever stored or required.' },
      { key: 's4', text: 'We use Cloudflare Turnstile (not reCAPTCHA) and proof-of-work challenges — bot protection that does not itself participate in surveillance.' },
    ],
  },
]

function ScoreBar({ score, maxScore }) {
  const pct = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0
  return (
    <div style={{
      height: '6px',
      background: 'var(--chrome-border)',
      borderRadius: '3px',
      overflow: 'hidden',
      flexGrow: 1,
    }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: 'var(--accent-green)',
        borderRadius: '3px',
        transition: 'width 0.5s ease',
        boxShadow: pct > 0 ? '0 0 6px var(--accent-green)' : 'none',
      }} />
    </div>
  )
}

function ContributorRow({ rank, handle, score, totalScore, breakdown }) {
  const pct = totalScore > 0 ? ((score / totalScore) * 100).toFixed(1) : '0.0'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 12px',
      borderBottom: '1px solid var(--chrome-border)',
      fontFamily: 'var(--font-mono)',
    }}>
      {/* Rank */}
      <div style={{
        width: '24px',
        fontSize: '10px',
        color: rank <= 3 ? 'var(--accent-amber)' : 'var(--chrome-text-dim)',
        fontWeight: rank <= 3 ? 700 : 400,
        flexShrink: 0,
        textAlign: 'right',
      }}>
        #{rank}
      </div>

      {/* Handle */}
      <div style={{
        width: '120px',
        fontSize: '11px',
        color: 'var(--chrome-text-bright)',
        flexShrink: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {handle}
      </div>

      {/* Score bar */}
      <ScoreBar score={score} maxScore={totalScore} />

      {/* Percentage */}
      <div style={{
        width: '40px',
        fontSize: '10px',
        color: 'var(--accent-green)',
        flexShrink: 0,
        textAlign: 'right',
      }}>
        {pct}%
      </div>

      {/* Total score */}
      <div style={{
        width: '50px',
        fontSize: '10px',
        color: 'var(--chrome-text)',
        flexShrink: 0,
        textAlign: 'right',
      }}>
        {score}pt
      </div>
    </div>
  )
}

function WeightTable() {
  const weights = [
    { action: 'Correction accepted', weight: SCORE_WEIGHTS.correction_accepted, key: 'correction_accepted' },
    { action: 'Annotation created', weight: SCORE_WEIGHTS.annotation_created, key: 'annotation_created' },
    { action: 'Upvote received', weight: SCORE_WEIGHTS.upvote_received, key: 'upvote_received' },
    { action: 'Vote cast', weight: SCORE_WEIGHTS.vote_cast, key: 'vote_cast' },
  ]
  return (
    <div style={{
      border: '1px solid var(--chrome-border)',
      borderRadius: '3px',
      overflow: 'hidden',
      marginBottom: '24px',
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        padding: '6px 12px',
        background: 'var(--chrome-bg)',
        borderBottom: '1px solid var(--chrome-border)',
        fontSize: '9px',
        color: 'var(--chrome-text-dim)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        <span>Action</span>
        <span>Points</span>
      </div>
      {weights.map(w => (
        <div key={w.key} style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          padding: '8px 12px',
          borderBottom: '1px solid var(--chrome-border)',
          fontSize: '10px',
          color: 'var(--chrome-text)',
        }}>
          <span>{w.action}</span>
          <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>+{w.weight}</span>
        </div>
      ))}
    </div>
  )
}

export default function Contributors() {
  const { state } = useTM()

  // Build leaderboard from local state
  const myScore = calculateScore(state.contributionLedger)
  const totalScore = myScore // Phase 2: will aggregate all contributors from Supabase

  const leaderboard = myScore > 0
    ? [{ rank: 1, handle: state.userHandle || 'You (Anonymous)', score: myScore }]
    : []

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="contributors" classification="TUNNELMIND // CONTRIBUTORS" />

      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            t/contributors — Community Leaderboard
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '30px',
            fontWeight: 400,
            color: 'var(--doc-text)',
            marginBottom: '12px',
          }}>
            Contributors
          </h1>
          <p style={{ lineHeight: 0 }}>
            <InteractiveSentence
              sentenceId="contributors-header"
              content="Every person who votes, annotates, or corrects this site is building a tracked record that will matter when TunnelMind's products become profitable and contributor compensation begins."
            />
          </p>
        </div>

        {/* Leaderboard */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            Community Signal — Phase 1 (local state only · Phase 2 aggregates globally)
          </div>

          <div style={{
            background: 'var(--chrome-bg2)',
            border: '1px solid var(--chrome-border)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              background: 'var(--chrome-bg)',
              borderBottom: '1px solid var(--chrome-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              <span style={{ width: '24px' }}>#</span>
              <span style={{ width: '120px' }}>Handle</span>
              <span style={{ flex: 1 }}>Signal Share</span>
              <span style={{ width: '40px', textAlign: 'right' }}>%</span>
              <span style={{ width: '50px', textAlign: 'right' }}>Score</span>
            </div>

            {leaderboard.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--chrome-text-dim)',
              }}>
                No contributions recorded yet in this session.<br />
                <span style={{ color: 'var(--chrome-text-dim)', fontSize: '9px' }}>
                  Vote, annotate, or propose corrections on any page to appear here.
                </span>
              </div>
            ) : (
              leaderboard.map(c => (
                <ContributorRow
                  key={c.rank}
                  rank={c.rank}
                  handle={c.handle}
                  score={c.score}
                  totalScore={totalScore}
                />
              ))
            )}
          </div>

          {myScore > 0 && (
            <div style={{
              marginTop: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--chrome-text-dim)',
            }}>
              Your session score: <span style={{ color: 'var(--accent-green)' }}>{myScore} points</span>
              {' '}· Ledger will be persisted globally in Phase 2 (Supabase integration)
            </div>
          )}
        </section>

        {/* Point weight table */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--chrome-text-dim)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            Point Weights (configurable)
          </div>
          <WeightTable />
        </section>

        {/* Explanatory content — all interactive */}
        {SYSTEM_CONTENT.map(section => (
          <section key={section.section} style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--chrome-text)',
              letterSpacing: '0.08em',
              marginBottom: '12px',
              textTransform: 'uppercase',
            }}>
              {section.title}
            </h2>
            {section.sentences.map(s => (
              <p key={s.key} style={{ marginBottom: '8px', lineHeight: 0 }}>
                <InteractiveSentence
                  sentenceId={`contributors-${section.section}-${s.key}`}
                  content={s.text}
                />
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

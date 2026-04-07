import React from 'react'
import { Ruler } from '../components/WPChrome.jsx'
import DocumentEditor from '../components/DocumentEditor.jsx'
import PageDesc from '../components/PageDesc.jsx'
import { useTM } from '../lib/state.jsx'
import { SCORE_WEIGHTS, calculateScore } from '../lib/scoring.js'

function ScoreBar({ score, maxScore }) {
  const pct = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0
  return (
    <div style={{ height: '5px', background: 'var(--chrome-border)', borderRadius: '3px', overflow: 'hidden', flexGrow: 1 }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: 'var(--accent-green)',
        borderRadius: '3px',
        transition: 'width 0.5s ease',
      }} />
    </div>
  )
}

function Leaderboard() {
  const { state } = useTM()
  const myScore = calculateScore(state.contributionLedger)
  const totalScore = myScore

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '32px 32px 64px' }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--chrome-text-dim)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginBottom: '20px',
      }}>
        Community Leaderboard
      </div>

      {/* Score weights */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px',
        background: 'var(--chrome-border)',
        border: '1px solid var(--chrome-border)',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '24px',
      }}>
        {[
          { label: 'Correction accepted', pts: SCORE_WEIGHTS.correction_accepted },
          { label: 'Annotation created', pts: SCORE_WEIGHTS.annotation_created },
          { label: 'Upvote received', pts: SCORE_WEIGHTS.upvote_received },
          { label: 'Vote cast', pts: SCORE_WEIGHTS.vote_cast },
        ].map(w => (
          <div key={w.label} style={{ padding: '10px 12px', background: 'var(--chrome-bg2)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--accent-green)', marginBottom: '3px' }}>
              +{w.pts}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--chrome-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {w.label}
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard table */}
      <div style={{ background: 'var(--chrome-bg2)', border: '1px solid var(--chrome-border)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '8px 12px', background: 'var(--chrome-bg)', borderBottom: '1px solid var(--chrome-border)',
          fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          <span style={{ width: '24px' }}>#</span>
          <span style={{ width: '120px' }}>Handle</span>
          <span style={{ flex: 1 }}>Signal Share</span>
          <span style={{ width: '40px', textAlign: 'right' }}>%</span>
          <span style={{ width: '50px', textAlign: 'right' }}>Score</span>
        </div>

        {myScore > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ width: '24px', fontSize: '10px', color: 'var(--accent-amber)', fontWeight: 700 }}>#1</span>
            <span style={{ width: '120px', fontSize: '11px', color: 'var(--chrome-text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {state.userHandle || 'You (Anonymous)'}
            </span>
            <ScoreBar score={myScore} maxScore={totalScore} />
            <span style={{ width: '40px', fontSize: '10px', color: 'var(--accent-green)', textAlign: 'right' }}>100%</span>
            <span style={{ width: '50px', fontSize: '10px', color: 'var(--chrome-text)', textAlign: 'right' }}>{myScore}pt</span>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--chrome-text-dim)' }}>
            No contributions yet. Vote, annotate, or correct any sentence to appear here.
          </div>
        )}
      </div>

      <div style={{ marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)' }}>
        Scores are session-local until Supabase persistence is connected.
        Contributors will be compensated proportionally when the platform becomes profitable.
      </div>

      {/* Divider + doc editor for contributor notes */}
      <div style={{ marginTop: '40px', borderTop: '1px solid var(--chrome-border)', paddingTop: '32px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--chrome-text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
          From the author
        </div>
        <DocumentEditor pageId="contributors" />
      </div>
    </div>
  )
}

export default function Contributors() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="contributors" />
      <PageDesc
        title="t/contributors"
        desc="Everyone building here gets tracked. When TunnelMind becomes profitable, contributors get paid proportionally based on their share of total community signal."
      />
      <Leaderboard />
    </div>
  )
}

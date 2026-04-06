import React from 'react'

const BLOCK_CHAR = '█'

function makeRedactionText(length = 52) {
  return BLOCK_CHAR.repeat(length)
}

export default function RedactionBlock({ sentenceId, threshold, currentVotes, userVoted, onVote }) {
  const progress = Math.min(currentVotes / threshold, 1)
  const pct = Math.round(progress * 100)

  return (
    <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <span
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          background: 'var(--chrome-bg2)',
          border: '1px solid var(--chrome-border)',
          borderRadius: '3px',
          padding: '4px 8px',
          margin: '2px 0',
          fontFamily: 'var(--font-mono)',
          position: 'relative',
          overflow: 'hidden',
          cursor: userVoted ? 'default' : 'pointer',
        }}
        onClick={!userVoted ? onVote : undefined}
        title={userVoted ? `${currentVotes}/${threshold} votes to declassify` : 'Vote to declassify this passage'}
      >
        {/* Redaction text */}
        <span style={{
          color: '#2a2a2a',
          fontSize: '14px',
          letterSpacing: '1px',
          lineHeight: 1.4,
          fontFamily: 'var(--font-mono)',
          userSelect: 'none',
          wordBreak: 'break-all',
        }}>
          {makeRedactionText()}
        </span>

        {/* Progress bar */}
        <span style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          width: `${pct}%`,
          background: 'var(--accent-green)',
          transition: 'width 0.5s ease',
          boxShadow: '0 0 6px var(--accent-green)',
        }} />

        {/* Label */}
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '4px',
          fontSize: '9px',
          color: 'var(--chrome-text-dim)',
          fontFamily: 'var(--font-mono)',
        }}>
          <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>REDACTED</span>
          <span>·</span>
          <span>{currentVotes}/{threshold} votes to declassify</span>
          {!userVoted && (
            <>
              <span>·</span>
              <span style={{ color: 'var(--accent-green)', cursor: 'pointer' }}>▲ Vote to reveal</span>
            </>
          )}
          {userVoted && (
            <>
              <span>·</span>
              <span style={{ color: 'var(--accent-amber)' }}>✓ You voted</span>
            </>
          )}
        </span>
      </span>
    </span>
  )
}

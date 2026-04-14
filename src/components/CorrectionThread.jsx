import React from 'react'
import { getCorrectionNetScore } from '../lib/state.jsx'

const S = {
  thread: {
    display: 'block',
    margin: '4px 0 8px 0',
    paddingLeft: '12px',
    borderLeft: '2px solid var(--chrome-border)',
  },
  header: {
    fontSize: '9px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--chrome-text-dim)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  correction: (netScore, isApplied) => ({
    position: 'relative',
    marginBottom: '6px',
    padding: '6px 8px',
    background: isApplied
      ? 'var(--accent-green-dim)'
      : netScore >= 3
        ? 'var(--accent-green-faint)'
        : 'var(--chrome-bg2)',
    border: '1px solid',
    borderColor: isApplied
      ? 'var(--accent-green)'
      : netScore >= 3
        ? 'var(--accent-green-mid)'
        : 'var(--chrome-border)',
    borderRadius: '3px',
    animation: 'fadeIn 0.2s ease',
  }),
  correctionText: {
    fontFamily: 'var(--font-serif)',
    fontSize: '15px',
    color: 'var(--doc-text)',
    lineHeight: '1.5',
    marginBottom: '6px',
  },
  correctionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '9px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--chrome-text-dim)',
    flexWrap: 'wrap',
  },
  voteBtn: (active, color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    background: active ? color : 'transparent',
    color: active ? 'var(--chrome-bg)' : 'var(--chrome-text-dim)',
    border: '1px solid',
    borderColor: active ? color : 'var(--chrome-border)',
    borderRadius: '2px',
    fontSize: '8px',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  }),
  score: (score) => ({
    fontSize: '10px',
    color: score > 0 ? 'var(--accent-green)' : score < 0 ? 'var(--accent-red)' : 'var(--chrome-text-dim)',
    minWidth: '14px',
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
  }),
  applyBtn: {
    padding: '2px 8px',
    background: 'var(--accent-green-dim)',
    color: 'var(--accent-green)',
    border: '1px solid var(--accent-green)',
    borderRadius: '2px',
    fontSize: '9px',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  consensusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '1px 5px',
    background: 'var(--accent-green-dim)',
    border: '1px solid var(--accent-green)',
    borderRadius: '10px',
    fontSize: '8px',
    color: 'var(--accent-green)',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
  },
  appliedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '1px 5px',
    background: 'var(--accent-green-dim)',
    border: '1px solid var(--accent-green)',
    borderRadius: '10px',
    fontSize: '8px',
    color: 'var(--accent-green)',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
  },
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function CorrectionThread({ sentenceId, corrections, authorMode, onVote, onApply }) {
  if (!corrections || corrections.length === 0) return null

  // Sort by net score desc
  const sorted = [...corrections].sort((a, b) =>
    (b.votes.up - b.votes.down) - (a.votes.up - a.votes.down)
  )

  return (
    <span style={S.thread}>
      <div style={S.header}>
        {corrections.length} correction{corrections.length !== 1 ? 's' : ''} proposed
        {' — '}sorted by community score
      </div>
      {sorted.map(c => {
        const netScore = c.votes.up - c.votes.down
        const hasConsensus = netScore >= 3 && !c.isApplied
        return (
          <div key={c.id} style={S.correction(netScore, c.isApplied)}>
            <div style={S.correctionText}>{c.text}</div>
            <div style={S.correctionMeta}>
              {/* Votes */}
              <button
                style={S.voteBtn(c.votes.userVote === 1, 'var(--vote-up)')}
                onClick={() => onVote(c.id, 1)}
                disabled={c.isApplied}
              >▲</button>
              <span style={S.score(netScore)}>
                {netScore > 0 ? `+${netScore}` : netScore === 0 ? '0' : netScore}
              </span>
              <button
                style={S.voteBtn(c.votes.userVote === -1, 'var(--vote-down)')}
                onClick={() => onVote(c.id, -1)}
                disabled={c.isApplied}
              >▼</button>

              <span>·</span>
              <span>{c.author || 'Anonymous'}</span>
              <span>·</span>
              <span>{timeAgo(c.ts)}</span>

              {/* Status badges */}
              {hasConsensus && (
                <span style={S.consensusBadge}>✓ CONSENSUS</span>
              )}
              {c.isApplied && (
                <span style={S.appliedBadge}>✓ APPLIED</span>
              )}

              {/* Author apply button */}
              {authorMode && !c.isApplied && (
                <button
                  style={S.applyBtn}
                  onClick={() => onApply(c.id, c.text)}
                >
                  Apply to text →
                </button>
              )}
            </div>
          </div>
        )
      })}
    </span>
  )
}

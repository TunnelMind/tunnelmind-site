import React, { useState, useRef, useCallback } from 'react'
import {
  useTM,
  getSentenceNetScore,
  getCorrectionCount,
  getAnnotationCount,
  getRedactionState,
  getDisplayText,
} from '../lib/state.jsx'
import RedactionBlock from './RedactionBlock.jsx'
import CorrectionThread from './CorrectionThread.jsx'

const S = {
  wrap: {
    position: 'relative',
    display: 'inline',
  },
  sentence: (hovered, selected, applied) => ({
    fontFamily: 'var(--font-serif)',
    fontSize: '19px',
    lineHeight: '1.75',
    color: applied ? 'var(--accent-green)' : 'var(--doc-text)',
    backgroundColor: hovered ? 'var(--hover-overlay)' : selected ? 'var(--selected-overlay)' : 'transparent',
    borderRadius: '2px',
    cursor: 'text',
    transition: 'background-color var(--transition), color var(--transition)',
    padding: '1px 2px',
    margin: '0 -2px',
  }),
  controls: (visible) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? 'auto' : 'none',
    transition: 'opacity var(--transition)',
    verticalAlign: 'middle',
    userSelect: 'none',
    marginLeft: '4px',
  }),
  voteBtn: (active, color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    height: '18px',
    background: active ? color : 'transparent',
    color: active ? 'var(--chrome-bg)' : 'var(--chrome-text-dim)',
    border: '1px solid',
    borderColor: active ? color : 'var(--chrome-border)',
    borderRadius: '2px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    lineHeight: 1,
    padding: 0,
    fontFamily: 'var(--font-mono)',
  }),
  score: (score) => ({
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    color: score > 0 ? 'var(--accent-green)' : score < 0 ? 'var(--accent-red)' : 'var(--chrome-text-dim)',
    minWidth: '16px',
    textAlign: 'center',
  }),
  editBtn: (hasCorrectionThread) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: '1px 4px',
    background: 'transparent',
    color: hasCorrectionThread ? 'var(--accent-amber)' : 'var(--chrome-text-dim)',
    border: '1px solid',
    borderColor: hasCorrectionThread ? 'var(--accent-amber)' : 'var(--chrome-border)',
    borderRadius: '2px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    fontFamily: 'var(--font-mono)',
  }),
  annotateBtn: (hasAnnotations) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: '1px 4px',
    background: 'transparent',
    color: hasAnnotations ? 'var(--accent-red)' : 'var(--chrome-text-dim)',
    border: '1px solid',
    borderColor: hasAnnotations ? 'var(--accent-red)' : 'var(--chrome-border)',
    borderRadius: '2px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    fontFamily: 'var(--font-mono)',
  }),
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '14px',
    height: '14px',
    borderRadius: '7px',
    backgroundColor: 'var(--accent-amber)',
    color: 'var(--chrome-bg)',
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
    padding: '0 3px',
  },
  correctionInline: {
    display: 'block',
    marginTop: '4px',
    marginBottom: '4px',
    paddingLeft: '8px',
    borderLeft: '2px solid var(--chrome-border)',
  },
  correctionInput: {
    width: '100%',
    background: 'var(--chrome-bg2)',
    border: '1px solid var(--chrome-border)',
    borderRadius: '3px',
    color: 'var(--doc-text)',
    fontFamily: 'var(--font-serif)',
    fontSize: '16px',
    padding: '6px 8px',
    resize: 'vertical',
    outline: 'none',
    minHeight: '60px',
  },
  correctionActions: {
    display: 'flex',
    gap: '6px',
    marginTop: '4px',
    alignItems: 'center',
  },
  submitBtn: {
    padding: '3px 10px',
    background: 'var(--accent-green-dim)',
    color: 'var(--accent-green)',
    border: '1px solid var(--accent-green)',
    borderRadius: '2px',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '3px 10px',
    background: 'transparent',
    color: 'var(--chrome-text-dim)',
    border: '1px solid var(--chrome-border)',
    borderRadius: '2px',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
  },
}

export default function InteractiveSentence({ sentenceId, content, isRedacted = false, redactionThreshold = 5 }) {
  const { state, dispatch } = useTM()
  const [hovered, setHovered] = useState(false)
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const inputRef = useRef(null)

  const netScore = getSentenceNetScore(state, sentenceId)
  const correctionCount = getCorrectionCount(state, sentenceId)
  const annotationCount = getAnnotationCount(state, sentenceId)
  const redactionState = getRedactionState(state, sentenceId, redactionThreshold)
  const displayText = getDisplayText(state, sentenceId, content)
  const userVote = state.sentenceVotes[sentenceId]?.userVote || 0
  const corrections = state.corrections[sentenceId] || []
  const hasApplied = !!state.appliedTexts[sentenceId]
  const selected = state.selectedSentenceId === sentenceId

  const handleVote = useCallback((dir) => {
    dispatch({ type: 'VOTE_SENTENCE', sentenceId, direction: dir })
  }, [sentenceId, dispatch])

  const handleOpenAnnotation = useCallback(() => {
    if (selected) {
      dispatch({ type: 'CLOSE_ANNOTATION_PANEL' })
    } else {
      dispatch({ type: 'SELECT_SENTENCE', id: sentenceId })
    }
  }, [sentenceId, selected, dispatch])

  const handleCorrectionToggle = useCallback(() => {
    setCorrectionOpen(open => !open)
    setCorrectionText('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleSubmitCorrection = useCallback(() => {
    const trimmed = correctionText.trim()
    if (!trimmed || trimmed === content) return
    dispatch({ type: 'ADD_CORRECTION', sentenceId, text: trimmed })
    setCorrectionText('')
    setCorrectionOpen(false)
  }, [correctionText, content, sentenceId, dispatch])

  const handleApplyCorrection = useCallback((correctionId, text) => {
    dispatch({ type: 'APPLY_CORRECTION', sentenceId, correctionId, text })
  }, [sentenceId, dispatch])

  if (isRedacted && !redactionState.revealed) {
    return (
      <RedactionBlock
        sentenceId={sentenceId}
        threshold={redactionThreshold}
        currentVotes={redactionState.count}
        userVoted={redactionState.userVoted}
        onVote={() => dispatch({ type: 'VOTE_REDACTION', sentenceId, threshold: redactionThreshold })}
      />
    )
  }

  const isRevealing = isRedacted && redactionState.revealed

  return (
    <>
      <span
        style={S.wrap}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span
          style={{
            ...S.sentence(hovered, selected, hasApplied),
            animation: isRevealing ? 'declassify 1.2s ease forwards' : undefined,
          }}
        >
          {displayText}
        </span>
        {isRevealing && (
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-green)',
            marginLeft: '6px',
            opacity: 0.7,
            verticalAlign: 'super',
          }}>
            [DECLASSIFIED]
          </span>
        )}
        {' '}
        <span style={S.controls(hovered || correctionOpen || corrections.length > 0)}>
          {/* Vote up */}
          <button
            style={S.voteBtn(userVote === 1, 'var(--vote-up)')}
            onClick={() => handleVote(1)}
            title="Upvote this sentence"
          >▲</button>

          {/* Net score */}
          <span style={S.score(netScore)}>{netScore !== 0 ? (netScore > 0 ? `+${netScore}` : netScore) : '·'}</span>

          {/* Vote down */}
          <button
            style={S.voteBtn(userVote === -1, 'var(--vote-down)')}
            onClick={() => handleVote(-1)}
            title="Downvote this sentence"
          >▼</button>

          {/* Correction button */}
          <button
            style={S.editBtn(correctionCount > 0)}
            onClick={handleCorrectionToggle}
            title={correctionCount > 0 ? `${correctionCount} correction${correctionCount > 1 ? 's' : ''}` : 'Propose correction'}
          >
            ✎{correctionCount > 0 && (
              <span style={S.badge}>{correctionCount}</span>
            )}
          </button>

          {/* Annotation button */}
          <button
            style={S.annotateBtn(annotationCount > 0)}
            onClick={handleOpenAnnotation}
            title={annotationCount > 0 ? `${annotationCount} annotation${annotationCount > 1 ? 's' : ''}` : 'Add annotation'}
          >
            ¶{annotationCount > 0 && (
              <span style={{ ...S.badge, backgroundColor: 'var(--accent-red)' }}>{annotationCount}</span>
            )}
          </button>
        </span>
      </span>

      {/* Inline correction form */}
      {correctionOpen && (
        <span style={{ display: 'block', marginTop: '6px', marginBottom: '6px' }}>
          <span style={S.correctionInline}>
            <div style={{ fontSize: '12px', color: 'var(--chrome-text-dim)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              PROPOSE CORRECTION — original text will be preserved until author accepts
            </div>
            <textarea
              ref={inputRef}
              style={S.correctionInput}
              value={correctionText}
              onChange={e => setCorrectionText(e.target.value)}
              placeholder="Type your proposed replacement..."
              onKeyDown={e => {
                if (e.key === 'Escape') { setCorrectionOpen(false); setCorrectionText('') }
                if (e.key === 'Enter' && e.ctrlKey) handleSubmitCorrection()
              }}
            />
            <div style={S.correctionActions}>
              <button style={S.submitBtn} onClick={handleSubmitCorrection}>Submit [Ctrl+Enter]</button>
              <button style={S.cancelBtn} onClick={() => { setCorrectionOpen(false); setCorrectionText('') }}>Cancel [Esc]</button>
            </div>
          </span>
        </span>
      )}

      {/* Correction thread */}
      {corrections.length > 0 && (
        <CorrectionThread
          sentenceId={sentenceId}
          corrections={corrections}
          authorMode={state.authorMode}
          onVote={(correctionId, dir) => dispatch({ type: 'VOTE_CORRECTION', sentenceId, correctionId, direction: dir })}
          onApply={handleApplyCorrection}
        />
      )}
    </>
  )
}

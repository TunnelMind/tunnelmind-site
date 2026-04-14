import React, { useState, useRef, useEffect } from 'react'
import { useTM } from '../lib/state.jsx'

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function AnnotationItem({ ann, depth = 0, sentenceId, onVote, onReply, authorMode }) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const netScore = ann.votes.up - ann.votes.down

  return (
    <div style={{
      marginLeft: depth > 0 ? '16px' : 0,
      borderLeft: depth > 0 ? '1px solid var(--chrome-border)' : 'none',
      paddingLeft: depth > 0 ? '10px' : 0,
      marginBottom: '8px',
    }}>
      {/* Author badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        {ann.isAuthor && (
          <span style={{
            padding: '1px 5px',
            background: 'var(--accent-purple-dim)',
            border: '1px solid var(--accent-purple)',
            borderRadius: '10px',
            fontSize: '8px',
            color: 'var(--accent-purple)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}>AUTHOR</span>
        )}
        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: ann.isAuthor ? 'var(--accent-purple)' : 'var(--chrome-text)' }}>
          {ann.author || 'Anonymous'}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--chrome-text-dim)' }}>
          {timeAgo(ann.ts)}
        </span>
      </div>

      {/* Content */}
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '14px',
        lineHeight: '1.6',
        color: ann.isAuthor ? 'var(--accent-purple)' : 'var(--doc-text)',
        marginBottom: '6px',
        borderLeft: ann.isAuthor ? '2px solid var(--accent-purple)' : '2px solid var(--accent-red)',
        paddingLeft: '8px',
      }}>
        {ann.text}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <button
          style={{
            background: ann.votes.userVote === 1 ? 'var(--vote-up)' : 'transparent',
            color: ann.votes.userVote === 1 ? 'var(--chrome-bg)' : 'var(--chrome-text-dim)',
            border: '1px solid',
            borderColor: ann.votes.userVote === 1 ? 'var(--vote-up)' : 'var(--chrome-border)',
            borderRadius: '2px',
            width: '16px',
            height: '16px',
            fontSize: '8px',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
          onClick={() => onVote(ann.id, 1)}
        >▲</button>

        <span style={{
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: netScore > 0 ? 'var(--accent-green)' : netScore < 0 ? 'var(--accent-red)' : 'var(--chrome-text-dim)',
        }}>
          {netScore > 0 ? `+${netScore}` : netScore}
        </span>

        <button
          style={{
            background: ann.votes.userVote === -1 ? 'var(--vote-down)' : 'transparent',
            color: ann.votes.userVote === -1 ? 'var(--chrome-bg)' : 'var(--chrome-text-dim)',
            border: '1px solid',
            borderColor: ann.votes.userVote === -1 ? 'var(--vote-down)' : 'var(--chrome-border)',
            borderRadius: '2px',
            width: '16px',
            height: '16px',
            fontSize: '8px',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
          onClick={() => onVote(ann.id, -1)}
        >▼</button>

        <button
          style={{
            background: 'transparent',
            color: 'var(--chrome-text-dim)',
            border: 'none',
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            padding: 0,
          }}
          onClick={() => setReplying(r => !r)}
        >
          {authorMode ? '↩ Reply as Author' : '↩ Reply'}
        </button>
      </div>

      {/* Reply form */}
      {replying && (
        <div style={{ marginTop: '6px', marginBottom: '6px' }}>
          <textarea
            autoFocus
            style={{
              width: '100%',
              background: 'var(--chrome-bg)',
              border: '1px solid var(--chrome-border)',
              borderRadius: '3px',
              color: 'var(--doc-text)',
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              padding: '6px 8px',
              resize: 'vertical',
              outline: 'none',
              minHeight: '50px',
            }}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            onKeyDown={e => {
              if (e.key === 'Escape') { setReplying(false); setReplyText('') }
              if (e.key === 'Enter' && e.ctrlKey) {
                if (replyText.trim()) {
                  onReply(sentenceId, replyText.trim(), ann.id)
                  setReplyText('')
                  setReplying(false)
                }
              }
            }}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <button
              style={{
                padding: '2px 8px',
                background: 'var(--accent-green-dim)',
                color: 'var(--accent-green)',
                border: '1px solid var(--accent-green)',
                borderRadius: '2px',
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
              onClick={() => {
                if (replyText.trim()) {
                  onReply(sentenceId, replyText.trim(), ann.id)
                  setReplyText('')
                  setReplying(false)
                }
              }}
            >Submit [Ctrl+Enter]</button>
            <button
              style={{
                padding: '2px 8px',
                background: 'transparent',
                color: 'var(--chrome-text-dim)',
                border: '1px solid var(--chrome-border)',
                borderRadius: '2px',
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
              onClick={() => { setReplying(false); setReplyText('') }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* Replies */}
      {ann.replies && ann.replies.map(reply => (
        <AnnotationItem
          key={reply.id}
          ann={reply}
          depth={depth + 1}
          sentenceId={sentenceId}
          onVote={onVote}
          onReply={onReply}
          authorMode={authorMode}
        />
      ))}
    </div>
  )
}

export default function AnnotationPanel({ open }) {
  const { state, dispatch } = useTM()
  const [newText, setNewText] = useState('')
  const inputRef = useRef(null)

  const sentenceId = state.selectedSentenceId
  const annotations = sentenceId ? (state.annotations[sentenceId] || []) : []

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open, sentenceId])

  if (!open || !sentenceId) return null

  const handleSubmit = () => {
    if (!newText.trim()) return
    dispatch({ type: 'ADD_ANNOTATION', sentenceId, text: newText.trim() })
    setNewText('')
  }

  const handleVote = (annotationId, dir) => {
    dispatch({ type: 'VOTE_ANNOTATION', sentenceId, annotationId, direction: dir })
  }

  const handleReply = (sId, text, parentId) => {
    dispatch({ type: 'ADD_ANNOTATION', sentenceId: sId, text, parentId })
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 'var(--annotation-width)',
      height: '100%',
      background: 'var(--chrome-bg2)',
      borderLeft: '1px solid var(--chrome-border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      animation: 'slideInRight 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        padding: '8px 12px',
        background: 'var(--chrome-bg)',
        borderBottom: '1px solid var(--chrome-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '38px',
      }}>
        <span style={{
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-red)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          ANNOTATIONS — {annotations.length} note{annotations.length !== 1 ? 's' : ''}
        </span>
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--chrome-text-dim)',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            padding: '0 4px',
          }}
          onClick={() => dispatch({ type: 'CLOSE_ANNOTATION_PANEL' })}
          title="Close annotations"
        >×</button>
      </div>

      {/* Selected sentence preview */}
      {sentenceId && (
        <div style={{
          padding: '8px 12px',
          background: 'var(--doc-bg)',
          borderBottom: '1px solid var(--chrome-border)',
          fontSize: '11px',
          fontFamily: 'var(--font-serif)',
          color: 'var(--doc-text-dim)',
          fontStyle: 'italic',
          lineHeight: '1.5',
          maxHeight: '80px',
          overflow: 'hidden',
        }}>
          <span style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontSize: '9px', fontStyle: 'normal' }}>
            ¶ ANNOTATING:
          </span>
          {' '}
          {state.appliedTexts[sentenceId] || '—'}
        </div>
      )}

      {/* Annotations list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
      }}>
        {annotations.length === 0 ? (
          <div style={{
            color: 'var(--chrome-text-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textAlign: 'center',
            marginTop: '20px',
          }}>
            No annotations yet.<br />Be the first to mark this passage.
          </div>
        ) : (
          annotations.map(ann => (
            <AnnotationItem
              key={ann.id}
              ann={ann}
              depth={0}
              sentenceId={sentenceId}
              onVote={handleVote}
              onReply={handleReply}
              authorMode={state.authorMode}
            />
          ))
        )}
      </div>

      {/* New annotation form */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--chrome-border)',
        background: 'var(--chrome-bg)',
      }}>
        {state.authorMode && (
          <div style={{
            fontSize: '8px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-purple)',
            marginBottom: '4px',
            letterSpacing: '0.05em',
          }}>
            ● AUTHOR MODE — Reply will be badged
          </div>
        )}
        <textarea
          ref={inputRef}
          style={{
            width: '100%',
            background: 'var(--chrome-bg2)',
            border: '1px solid var(--chrome-border)',
            borderRadius: '3px',
            color: 'var(--doc-text)',
            fontFamily: 'var(--font-serif)',
            fontSize: '13px',
            padding: '6px 8px',
            resize: 'none',
            outline: 'none',
            height: '70px',
          }}
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Add a note to this passage..."
          onKeyDown={e => {
            if (e.key === 'Enter' && e.ctrlKey) handleSubmit()
          }}
        />
        <button
          style={{
            marginTop: '6px',
            width: '100%',
            padding: '5px',
            background: newText.trim() ? 'var(--accent-green-dim)' : 'var(--chrome-bg2)',
            color: newText.trim() ? 'var(--accent-green)' : 'var(--chrome-text-dim)',
            border: '1px solid',
            borderColor: newText.trim() ? 'var(--accent-green)' : 'var(--chrome-border)',
            borderRadius: '2px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            cursor: newText.trim() ? 'pointer' : 'default',
            transition: 'all var(--transition)',
          }}
          onClick={handleSubmit}
          disabled={!newText.trim()}
        >
          Post annotation [Ctrl+Enter]
        </button>
      </div>
    </div>
  )
}

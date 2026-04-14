import React, { useRef, useEffect, useState } from 'react'
import { useTM } from '../lib/state.jsx'
import InteractiveSentence from './InteractiveSentence.jsx'

// ── Sentence parser ────────────────────────────────────────────────
function parseParagraphs(raw) {
  return raw
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map((para, pi) => ({
      key: `p${pi}`,
      // Split on sentence-ending punctuation followed by whitespace or end
      sentences: para
        .replace(/([.!?])\s+/g, '$1||')
        .split('||')
        .map(s => s.trim())
        .filter(Boolean)
        .map((text, si) => ({ key: `s${si}`, text })),
    }))
}

// ── Empty state ────────────────────────────────────────────────────
function EmptyState({ authorMode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '40vh',
      color: 'var(--chrome-text-dim)',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      gap: '12px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '28px', opacity: 0.3 }}>▌</div>
      {authorMode
        ? <span>Author mode is on — start writing above</span>
        : <span>Nothing published yet.</span>
      }
    </div>
  )
}

// ── Author toolbar ─────────────────────────────────────────────────
function AuthorToolbar({ published, onPublish, onUnpublish, hasContent }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 0 16px',
      borderBottom: '1px solid var(--chrome-border)',
      marginBottom: '24px',
    }}>
      <span style={{
        fontSize: '9px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--accent-amber)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginRight: '4px',
      }}>
        ● AUTHOR MODE
      </span>

      {!published ? (
        <button
          style={{
            padding: '4px 12px',
            background: hasContent ? 'var(--accent-green-dim)' : 'transparent',
            color: hasContent ? 'var(--accent-green)' : 'var(--chrome-text-dim)',
            border: '1px solid',
            borderColor: hasContent ? 'var(--accent-green)' : 'var(--chrome-border)',
            borderRadius: '2px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            cursor: hasContent ? 'pointer' : 'default',
            letterSpacing: '0.05em',
          }}
          onClick={hasContent ? onPublish : undefined}
          title="Publish this document — community can then interact with it"
        >
          Publish →
        </button>
      ) : (
        <>
          <span style={{
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-green)',
          }}>
            ✓ Published — community can annotate and vote
          </span>
          <button
            style={{
              padding: '4px 10px',
              background: 'transparent',
              color: 'var(--chrome-text-dim)',
              border: '1px solid var(--chrome-border)',
              borderRadius: '2px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
            onClick={onUnpublish}
          >
            Edit draft
          </button>
        </>
      )}
    </div>
  )
}

// ── Published view ─────────────────────────────────────────────────
function PublishedView({ pageId, doc }) {
  if (!doc.paragraphs || doc.paragraphs.length === 0) {
    return <EmptyState authorMode={false} />
  }
  return (
    <div>
      {doc.paragraphs.map(para => (
        <p key={para.key} style={{ marginBottom: '18px', lineHeight: '1.7' }}>
          {para.sentences.map((s, si) => (
            <React.Fragment key={s.key}>
              <InteractiveSentence
                sentenceId={`doc-${pageId}-${para.key}-${s.key}`}
                content={s.text}
              />
              {si < para.sentences.length - 1 ? ' ' : ''}
            </React.Fragment>
          ))}
        </p>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function DocumentEditor({ pageId }) {
  const { state, dispatch } = useTM()
  const textareaRef = useRef(null)
  const titleRef = useRef(null)
  const [editingTitle, setEditingTitle] = useState(false)

  const doc = state.documents?.[pageId] || { title: '', raw: '', published: false, paragraphs: [] }
  const { authorMode } = state

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (authorMode && !doc.published && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [authorMode, doc.published])

  const handlePublish = () => {
    const paragraphs = parseParagraphs(doc.raw || '')
    dispatch({ type: 'PUBLISH_DOC', pageId, paragraphs })
  }

  const handleUnpublish = () => {
    dispatch({ type: 'UNPUBLISH_DOC', pageId })
  }

  const handleRawChange = (e) => {
    dispatch({ type: 'UPDATE_DOC_RAW', pageId, raw: e.target.value })
  }

  const handleTitleChange = (e) => {
    dispatch({ type: 'UPDATE_DOC_TITLE', pageId, title: e.target.value })
  }

  const showEditor = authorMode && !doc.published
  const showPublished = doc.published
  const showEmpty = !authorMode && !doc.published

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '32px 32px 64px' }}>

      {/* Title */}
      {(showEditor || doc.title) && (
        <div style={{ marginBottom: '24px' }}>
          {showEditor ? (
            <input
              ref={titleRef}
              type="text"
              value={doc.title || ''}
              onChange={handleTitleChange}
              placeholder="Title (optional)"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font-serif)',
                fontSize: '28px',
                fontWeight: 400,
                color: 'var(--doc-text)',
                padding: 0,
                letterSpacing: '-0.01em',
              }}
            />
          ) : doc.title ? (
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '28px',
              fontWeight: 400,
              color: 'var(--doc-text)',
              lineHeight: 1.3,
            }}>
              {doc.title}
            </h1>
          ) : null}
        </div>
      )}

      {/* Author toolbar */}
      {authorMode && (
        <AuthorToolbar
          published={doc.published}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          hasContent={!!(doc.raw && doc.raw.trim())}
        />
      )}

      {/* Writing surface */}
      {showEditor && (
        <textarea
          ref={textareaRef}
          value={doc.raw || ''}
          onChange={handleRawChange}
          placeholder={`Begin writing...\n\nPress Enter twice to start a new paragraph.\nPublish when ready — the community can annotate each sentence.`}
          style={{
            width: '100%',
            minHeight: '60vh',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-serif)',
            fontSize: '18px',
            lineHeight: '1.85',
            color: 'var(--doc-text)',
            resize: 'none',
            padding: 0,
            caretColor: 'var(--accent-blue)',
          }}
          spellCheck
        />
      )}

      {/* Published document */}
      {showPublished && (
        <PublishedView pageId={pageId} doc={doc} />
      )}

      {/* Empty reader state */}
      {showEmpty && <EmptyState authorMode={false} />}
    </div>
  )
}

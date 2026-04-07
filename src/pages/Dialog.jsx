import React from 'react'
import { Ruler } from '../components/WPChrome.jsx'
import DocumentEditor from '../components/DocumentEditor.jsx'
import PageDesc from '../components/PageDesc.jsx'

export default function Dialog() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="dialog" />
      <PageDesc
        title="t/dialog"
        desc="The main writing space. Read what's been published, annotate in red, vote sentences up or down, propose corrections, and submit ideas."
      />
      <DocumentEditor pageId="dialog" />
    </div>
  )
}

import React from 'react'
import { Ruler } from '../components/WPChrome.jsx'
import DocumentEditor from '../components/DocumentEditor.jsx'
import PageDesc from '../components/PageDesc.jsx'

export default function Roadmap() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="roadmap" />
      <PageDesc
        title="t/roadmap"
        desc="Where we're headed. Vote priorities up or down, annotate with what we're missing, propose corrections to timelines."
      />
      <DocumentEditor pageId="roadmap" />
    </div>
  )
}

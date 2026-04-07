import React from 'react'
import { Ruler } from '../components/WPChrome.jsx'
import DocumentEditor from '../components/DocumentEditor.jsx'
import PageDesc from '../components/PageDesc.jsx'

export default function About() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="about" />
      <PageDesc
        title="t/about"
        desc="What TunnelMind is, why it exists, and who's building it. 22 years of enterprise networking turned into tools for everyone."
      />
      <DocumentEditor pageId="about" />
    </div>
  )
}

import React from 'react'
import { Ruler } from '../components/WPChrome.jsx'
import DocumentEditor from '../components/DocumentEditor.jsx'
import PageDesc from '../components/PageDesc.jsx'

export default function Products() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--doc-bg)' }}>
      <Ruler page="products" />
      <PageDesc
        title="t/products"
        desc="Tools we've built and what's in development. Free tools live at explore, receipt, radar, and data.tunnelmind.ai — no account required."
      />
      <DocumentEditor pageId="products" />
    </div>
  )
}

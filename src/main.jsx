import React from 'react'
import ReactDOM from 'react-dom/client'

// Self-hosted fonts (latin subset) — bundled by Vite so the site never
// calls fonts.googleapis.com / fonts.gstatic.com (memory: feedback_no_big_tech).
import '@fontsource/jetbrains-mono/latin-300.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-600.css'
import '@fontsource/crimson-pro/latin-400.css'
import '@fontsource/crimson-pro/latin-400-italic.css'
import '@fontsource/crimson-pro/latin-600.css'
// Cinzel — sacred-geometry display face (P-GEO). Self-hosted, no CDN.
import '@fontsource/cinzel/latin-400.css'
import '@fontsource/cinzel/latin-600.css'

import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

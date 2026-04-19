# Tech Debt

## isPhase2 alias in supabase.js
Target removal: 2026-Q3
Call sites at last count: 7
Owner: Josh

The `isPhase2` shim lives in `src/lib/compat.js` (not synced to alloy-site).
`supabase.js` is clean. To finish: update 3 callers to import `isLive` directly, delete `compat.js`.
Files to update: `src/lib/state.jsx`, `src/pages/Contributors.jsx`, `src/components/AuthModal.jsx`.

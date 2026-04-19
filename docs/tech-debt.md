# Tech Debt

## isPhase2 alias in supabase.js
Target removal: 2026-Q3
Call sites at last count: 7
Owner: Josh

The `isPhase2` export in `src/lib/supabase.js` is an alias for `isLive`.
The alias predates the `isLive` rename. Migrate all callers and delete the export.
Files to update: `src/lib/state.jsx`, `src/pages/Contributors.jsx`, `src/components/AuthModal.jsx`.

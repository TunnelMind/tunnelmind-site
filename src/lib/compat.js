/**
 * Backwards-compat shims — tunnelmind-site only, not synced to alloy-site.
 * TODO(2026-Q3): remove this file after migrating all callers to canonical names.
 * See docs/tech-debt.md for details.
 */

// isPhase2 is the old name for isLive (3 files, 7 usages)
export { isLive as isPhase2 } from './supabase.js'

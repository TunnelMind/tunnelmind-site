// Single source of truth for drift-prone facts that otherwise get copied across
// pages and go stale. Import from here instead of hardcoding. Live-sourceable
// numbers (corpus stats) are fetched at runtime; the values here are only the
// graceful fallbacks + things that cannot be fetched client-side.
//
// When a number here changes, change it ONCE. Re-verify the as-of values against
// the live sources noted below.

// The four lenses on the one corpus. Canonical names + one-line blurbs.
export const LENSES = [
  { key: 'scry',       name: 'Scry',       blurb: 'Signed observations of hostile network actors — IPs, ASNs, behaviors, threat-feed overlap.' },
  { key: 'sigil',      name: 'Sigil',      blurb: 'Programmatic-advertising supply-graph trust — publishers, SSPs, DSPs, entity scoring.' },
  { key: 'tracker',    name: 'Tracker',    blurb: 'The demand-side graph of who watches whom on the open web.' },
  { key: 'ghostroute', name: 'GhostRoute', blurb: 'Routing integrity and sovereignty — origin AS, RPKI validity, claimed-versus-actual jurisdiction, first-party CT witness.' },
]

// Attestation tiers, lowest trust → highest. This ordering is load-bearing and
// must appear in exactly this order everywhere.
export const ATTESTATION_TIERS = ['self-asserted', 'software', 'tee-tpm', 'silicon-root']

// MCP tool counts, per server. Live source: POST tools/list to each /mcp.
// as of 2026-06-21.
export const MCP_TOOLS = { data: 67, scry: 12, sigil: 12 }

// Corpus-stat fallbacks for /compare. Live source: GET data.tunnelmind.ai/v1/stats
// (proxied via /api/ecosystem-stats). These literals are shown ONLY if the live
// fetch fails. as of 2026-06-20 snapshot.
export const STATS_FALLBACK = {
  seats:     '~971K',
  sellPaths: '~1.79M',
  entities:  '~59K',
  asOf:      '2026-06-20',
}

// src/config/glassbox.js — GROUND-TRUTH config for the GLASSBOX exhibit.
//
// Every string here is real: code excerpts are verbatim from the files named in
// `path`; schema fields are real served column projections (observed from live
// reads) or real parser output; metric keys index the live /v1/stats payload;
// every curl was run against production. No fabricated code, no invented numbers
// (P-GLASSBOX §0.1). The audit trail of what is abstracted lives in
// /REDACTION-LIST.md; the full discovery map in /GLASSBOX-MANIFEST.md (published).
//
// Build-states are determined by inspection (§0.2), not assumed:
//   scry LIVE · sigil LIVE · tracker PARTIAL · ghostroute LIVE.

import { ATTESTATION_TIERS } from './facts.js'

export { ATTESTATION_TIERS }

// Live metric source: the four-lens counts come from data.tunnelmind.ai/v1/stats,
// proxied same-origin via /api/ecosystem-stats (NOT /api/stats — that one proxies
// scry-server and has a different shape). A null lens count means "momentarily
// unavailable" — NEVER a silent zero (the upstream says so). Render null honestly.
export const STATS_ENDPOINT = '/api/ecosystem-stats'
// Scry's four-lens slot is frequently null; its real headline (observations) is
// served by scry-server via /api/stats. The page backfills from here so Scry
// shows a live number when the four-lens feed reports null.
export const SCRY_STATS_ENDPOINT = '/api/stats'

// ── The four lenses ──────────────────────────────────────────────────────────
// pipeline stage flags: `sensitive:true` nodes show SHAPE ONLY (§0.3) — the
// mechanism is named, the identifier is not. Everything from NORMALIZE on is open.

export const LENSES = [
  {
    key: 'scry',
    name: 'Scry',
    accent: 'cyan',
    buildState: 'LIVE',
    watches: 'Signed observations of hostile network actors — IPs, ASNs, behaviors, threat-feed overlap.',
    pipeline: [
      { stage: 'SOURCE',    label: 'honeypot fleet + threat feeds', lang: '', sensitive: true },
      { stage: 'COLLECT',   label: 'scry-augur / scry-ingest', lang: 'Node', sensitive: true },
      { stage: 'NORMALIZE', label: 'actor_class.js — classifyWithEvidence', lang: 'Node' },
      { stage: 'STORE',     label: 'Postgres (VPS)', lang: 'SQL' },
      { stage: 'VERIFY',    label: 'rDNS + ASN evidence', lang: 'Node' },
      { stage: 'SERVE',     label: 'api.tunnelmind.ai /v1/check · /v1/recent', lang: 'HTTP' },
    ],
    specimens: [
      {
        path: 'scry-server/src/routes/check.js',
        lang: 'JavaScript', lines: '1, 11, 67',
        code: `// GET /v1/check/{ip} — anonymous corpus lookup.
import { classifyWithRdns, classifyWithEvidence } from "../lib/actor_class.js";
… elided …
// Even an unobserved Googlebot / Bingbot / AppleBot IP still gets its
// crawler classification AND emits its evidence for the actor-class catalog.
const { classification: cls, via } = await classifyWithEvidence(ip, geo.asn ?? null);`,
      },
      {
        path: 'scry-server/src/routes/recent.js',
        lang: 'JavaScript', lines: '1–7 · serve',
        code: `// GET /v1/recent — recent-observations feed, aggregated per source_ip.
//
// Each actor is enriched with geo / network attribution: a LATERAL join
// against geo_ranges (the iptoasn dataset, schema 003) resolves the source
// IP to an ASN, ISO country, and network/org name. Sensor-supplied
// observations.source_asn / source_country take precedence when present;
// the geo dataset fills the (common) gap where they are null.`,
      },
    ],
    // Real served projection of the corpus check (check.js): the actor-class
    // result, not the raw honeypot row (that stays gated, REDACTION #1).
    schema: {
      title: 'served projection — /v1/check',
      note: 'Raw honeypot rows are gated (REDACTION #1); the classification is open.',
      fields: [
        ['classification', 'actor-class enum'],
        ['via', 'evidence path (rdns | asn | observed)'],
        ['asn', 'integer'],
        ['confidence', 'bucketized 0..1'],
      ],
    },
    metric: { label: 'attacker observations', path: ['scry', 'observations_total'], fmt: 'int' },
    curl: 'curl https://tunnelmind.ai/api/recent?limit=5',
  },

  {
    key: 'sigil',
    name: 'Sigil',
    accent: 'green',
    buildState: 'LIVE',
    watches: 'Programmatic-advertising supply-graph trust — publishers, SSPs, DSPs, entity scoring.',
    pipeline: [
      { stage: 'SOURCE',    label: 'publisher ads.txt / sellers.json', lang: 'HTTP' },
      { stage: 'COLLECT',   label: 'sigil-crawler — fetcher.js', lang: 'Node' },
      { stage: 'NORMALIZE', label: 'parser.js — IAB ads.txt v1.1', lang: 'Node' },
      { stage: 'STORE',     label: 'Supabase — exchange_seat · sells_through', lang: 'SQL' },
      { stage: 'VERIFY',    label: 'entity scoring + cross-lens fuse', lang: 'Node' },
      { stage: 'SERVE',     label: 'data.tunnelmind.ai /v1/verify · /v1/stats', lang: 'HTTP' },
    ],
    specimens: [
      {
        path: 'sigil-crawler/src/parser.js',
        lang: 'JavaScript', lines: '1, 32, 44–52, 113',
        code: `// IAB ads.txt v1.1 parser (spec: July 2022).
const ENTRY_TYPES = new Set(["DIRECT", "RESELLER"]);

export function parseAdsTxt(raw) {
  const lines = raw.split(/\\r\\n|\\r|\\n/);
  … elided …
  const fields = record.split(",").map((f) => f.trim());
  … elided …
  type, // 'DIRECT' | 'RESELLER' (uppercase preserved per IAB wire format)`,
      },
      {
        path: 'tunnelmind-data-api/api/routes/sigil-supply-path.js',
        lang: 'JavaScript', lines: '1–13 · serve',
        code: `// Sigil P31 — supply-path verification.
//   POST /v1/sigil/verify/supply_path  — the core pre-bid verification call
//
// supply_path composes the individual Sigil checks into one trust verdict:
//   - ads_txt         — is the exchange authorized in the publisher's ads.txt (P30)
//   - datacenter_ip   — is the IP a datacenter posing as a residential device (P33)
//   - fraud_signals   — is the IP in Scry's attacker corpus (Familiar + Augur)
//   - bundle_verified — does the app bundle exist in its store (P34)
//   … elided …`,
      },
    ],
    schema: {
      title: 'normalized ads.txt record — parser.js output',
      note: 'Schema open; the ~970K seat / ~1.79M sell-path bulk rows are gated (REDACTION #3).',
      fields: [
        ['exchange', 'domain'],
        ['seller_id', 'string'],
        ['type', "'DIRECT' | 'RESELLER'"],
        ['cert_authority_id', 'string | null'],
        ['owner_domain', 'directive · domain | null'],
      ],
    },
    metric: { label: 'supply paths mapped', path: ['sigil', 'sell_paths'], fmt: 'int' },
    curl: 'curl https://data.tunnelmind.ai/v1/stats',
  },

  {
    key: 'tracker',
    name: 'Tracker',
    accent: 'purple',
    buildState: 'PARTIAL',
    watches: 'The demand-side graph of who watches whom on the open web.',
    // Honest PARTIAL: tables + counts + cross-lens join + inspector tab are real;
    // there is NO Tracker-owned verify/receipt route. The receipt node renders as
    // blueprint line-art, not a working path (§0.2).
    pipeline: [
      { stage: 'SOURCE',    label: 'tracker disclosure + crawl', lang: 'HTTP' },
      { stage: 'COLLECT',   label: 'ingest → tracker_entities', lang: 'Node' },
      { stage: 'NORMALIZE', label: 'entity-resolution.js', lang: 'Node' },
      { stage: 'STORE',     label: 'Supabase — tracker_entities · entity_domain', lang: 'SQL' },
      { stage: 'VERIFY',    label: 'cross-lens fuse only', lang: 'Node' },
      { stage: 'SERVE',     label: '/api/corpus/tracker · POST /v1/verify', lang: 'HTTP', blueprint: true },
    ],
    specimens: [
      {
        path: 'tunnelmind-data-api/api/routes/cross-lens-verify.js',
        lang: 'JavaScript', lines: '1–16',
        code: `// A2 — Cross-lens verification (Scry × Sigil × GhostRoute).
//   POST /v1/verify/{node}
// Fuses the lenses into one verdict for an IP, domain, ASN, or entity_slug.
// Returns each single-lens block separately for transparency AND a fused
// \`cross_lens\` block — the fused block is the moat (no siloed competitor
// owns all the halves). Fusion: weighted-mean + co_observation_bonus.`,
      },
    ],
    schema: {
      title: 'served projection — /api/corpus/tracker/:domain',
      note: 'Live shape. Bulk tracker_entities / entity_domain rows are gated (REDACTION #4).',
      fields: [
        ['domain', 'text'], ['known', 'bool'], ['score', 'numeric | null'],
        ['entity', 'text | null'], ['entity_slug', 'slug | null'],
        ['categories', 'text[]'], ['prevalence', 'numeric | null'],
        ['first_seen', 'date | null'], ['last_seen', 'date | null'],
        ['cookies', 'jsonb | null'], ['fingerprinting', 'bool | null'],
      ],
    },
    metric: { label: 'tracker entities', path: ['tracker', 'entities'], fmt: 'int' },
    curl: 'curl https://tunnelmind.ai/api/corpus/tracker/doubleclick.net',
  },

  {
    key: 'ghostroute',
    name: 'GhostRoute',
    accent: 'amber',
    buildState: 'LIVE',
    watches: 'Routing integrity + sovereignty — origin AS, RPKI validity, claimed-vs-actual jurisdiction, first-party CT witness.',
    pipeline: [
      { stage: 'SOURCE',    label: 'RPKI (VPS Routinator) + CT logs + AS-ownership', lang: '' },
      { stage: 'COLLECT',   label: 'ghostroute-corpus workers', lang: 'Node' },
      { stage: 'NORMALIZE', label: 'pipeline.js + sovereignty.js (pure scorer)', lang: 'Node' },
      { stage: 'STORE',     label: 'Supabase — ct_proofs · ct_log_heads', lang: 'SQL' },
      { stage: 'VERIFY',    label: 'signing.js — canonical JSON + Ed25519', lang: 'Node' },
      { stage: 'SERVE',     label: '/v1/ghostroute/{check,proofs,witness,alerts}', lang: 'HTTP' },
    ],
    specimens: [
      {
        path: 'tunnelmind-data-api/api/lib/ghostroute/sovereignty.js',
        lang: 'JavaScript', lines: '49–56',
        code: `/** Map a [0,1] score to a sovereign tier string. */
export function tierFor(score) {
  if (score == null) return null;
  if (score >= TIER.VERIFIED)  return 'VERIFIED';
  if (score >= TIER.PLAUSIBLE) return 'PLAUSIBLE';
  if (score >= TIER.MISMATCH)  return 'MISMATCH';
  return 'CRITICAL_MISMATCH';
}`,
      },
      {
        path: 'tunnelmind-data-api/api/lib/ghostroute/signing.js',
        lang: 'JavaScript', lines: '27–39',
        code: `/** Recursively sort object keys → deterministic canonical JSON. */
export function canonicalJson(value) {
  return JSON.stringify(sortKeys(value));
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  }
  return v;
}`,
      },
    ],
    schema: {
      title: 'served projection — /v1/ghostroute/proofs',
      note: 'Live CT inclusion-proof shape (RPC ghostroute_ct_proofs, mig 031). Fully open.',
      fields: [
        ['domain', 'text'], ['ai_owner', 'text | null'], ['reason', "'proven' | …"],
        ['log_operator', 'text'], ['log_url', 'url'], ['tree_size', 'bigint'],
        ['leaf_index', 'bigint'], ['cert_sha256', 'hex(32)'],
        ['sth_root_hash', 'base64'], ['sct_timestamp', 'timestamptz'],
        ['observed_at', 'timestamptz'], ['inclusion_proven', 'bool'],
      ],
    },
    metric: { label: 'CT inclusion proofs', path: ['ghostroute', 'ct_inclusion_proofs'], fmt: 'int' },
    curl: 'curl https://data.tunnelmind.ai/v1/ghostroute/proofs?limit=3',
  },
]

// ── Receipt format (real implementation — JCS, not CBOR) ─────────────────────
export const RECEIPT_FORMAT = {
  title: 'The receipt: JCS (RFC 8785) + Ed25519',
  note: 'The prompt assumed CBOR; the shipped format is canonical JSON. We show what shipped.',
  specimen: {
    path: 'receipt-verify/src/jcs.ts',
    lang: 'TypeScript', lines: '1–4',
    code: `// JCS (RFC 8785) canonicalizer — bit-identical to the issuer-side
// serializers in scry-server (src/lib/receipt_v1.js) and tunnelmind-data-api
// (api/utils/receipt-v1.js). DO NOT diverge: any drift breaks signature
// verification for receipts signed by either issuer.`,
  },
  verify: 'open verifier: receipt-verify (npm) · re-canonicalize → Ed25519 check, offline.',
}

// ── GhostRoute live surface ──────────────────────────────────────────────────
// Read-only composition of already-collected reads. No collection from this page.
export const GHOSTROUTE_LIVE_ENDPOINT = '/api/ghostroute/live'
// φ-derived poll interval: 8000ms (the live proxy edge-caches 30s; many viewers
// in a colo share one upstream read). Honest connection state required.
export const GHOSTROUTE_POLL_MS = 8000

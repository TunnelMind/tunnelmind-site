-- 029_ghostroute_ct_log_heads.sql — P66 increment 1 (GhostRoute CT trust anchor).
--
-- First-party Certificate Transparency witnessing. The ct_witness worker (in the
-- ghostroute-corpus container, 12h cadence) fetches each trusted non-Google CT
-- log's Signed Tree Head, VERIFIES the signature against the log's own public key,
-- and appends the verified head here. This makes TunnelMind an independent witness
-- of the CT ecosystem rather than a reseller of crt.sh/certspotter: we hold our
-- own signature-checked roots, and the append-only history is tamper-evident — a
-- log that rewinds tree_size or forks its root shows up as a regression against
-- our prior snapshots.
--
-- no-big-tech: Google operates the largest CT logs (Argon/Xenon); the worker
-- EXCLUDES every Google-operated log. Browser policy mandates SCTs from >=2
-- operators, so non-Google logs still give wide coverage + an independent log to
-- verify against.
--
-- Why not tail every leaf? A full firehose tail is ~150 GB/day PER log (measured
-- against Cloudflare Nimbus2026, ~30M certs/day) — infeasible on the bootstrap
-- VPS, same footprint discipline that deferred Routinator. The verified-STH
-- witness is tiny (one get-sth per log, twice a day) and is the trust anchor for
-- per-cert inclusion verification (P66 increment 2 — verifyInclusion()/
-- extractScts() already ship validated in ct_logs.js, so that follow-on is wiring,
-- not new crypto).
--
-- Conventions match 028 (append-only snapshot tables): public.* schema-qualified;
-- bigserial PK; RLS enabled with an explicit anon+authenticated SELECT policy;
-- writes have NO policy → service-role only (the worker's service key). Purely
-- additive; IF NOT EXISTS throughout; never UPDATE/DELETE a row.
--
-- Apply via PAT REST (reference_supabase_pat_ddl_escape).

-- ════════════════════════════════════════════════════════════════════════════
-- ghostroute_ct_log_heads — signature-verified CT Signed Tree Heads.
--   Append-only: every witness cycle inserts one row per reachable trusted log.
--   Public-read (a verified tree head is a public attestation, like rpki_snapshots).
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ghostroute_ct_log_heads (
  id                  bigserial PRIMARY KEY,
  log_url             text NOT NULL,                    -- e.g. 'https://ct.cloudflare.com/logs/nimbus2026'
  log_operator        text,                             -- e.g. 'Cloudflare' (never 'Google' — excluded)
  log_description     text,                             -- e.g. "Cloudflare 'Nimbus 2026' log"
  log_state           text,                             -- 'usable' | 'readonly'
  tree_size           bigint NOT NULL,                  -- entries in the log at observation
  sth_timestamp       timestamptz NOT NULL,             -- timestamp the log signed into the STH
  root_hash           text NOT NULL,                    -- base64 sha256_root_hash
  signature_verified  boolean NOT NULL,                 -- did the STH signature check against the log key?
  observed_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghostroute_ct_heads_log         ON public.ghostroute_ct_log_heads (log_url);
CREATE INDEX IF NOT EXISTS idx_ghostroute_ct_heads_observed    ON public.ghostroute_ct_log_heads (observed_at);
CREATE INDEX IF NOT EXISTS idx_ghostroute_ct_heads_log_observed ON public.ghostroute_ct_log_heads (log_url, observed_at DESC);

ALTER TABLE public.ghostroute_ct_log_heads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghostroute_ct_log_heads_public_read ON public.ghostroute_ct_log_heads;
CREATE POLICY ghostroute_ct_log_heads_public_read ON public.ghostroute_ct_log_heads
  FOR SELECT TO anon, authenticated USING (true);

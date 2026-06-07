-- 030_ghostroute_ct_inclusion_proofs.sql — P66 increment 2 (GhostRoute per-cert proof).
--
-- The ct_inclusion worker (ghostroute-corpus container, 24h cadence) observes the
-- cert each AI-infra host actually serves over live TLS, reconstructs the RFC6962
-- precert MerkleTreeLeaf, and PROVES that cert's inclusion via get-proof-by-hash
-- against a signature-verified Signed Tree Head from a trusted (non-Google) log.
-- This upgrades a GhostRoute observation from "a monitor (crt.sh/certspotter) said
-- this cert exists" to "this exact cert is cryptographically proven to live in an
-- append-only public log whose root WE signature-verified" — the witnessability
-- pillar ([[tunnelmind_question]]) at the level of an individual certificate.
--
-- Builds on 029 (ghostroute_ct_log_heads holds the signature-verified roots) and
-- the same Google-excluding registry. Every attempt is recorded, INCLUDING
-- failures with a reason — a cert that suddenly can't be proven (hash_not_in_log,
-- sth_unverified, no_trusted_log_sct) is itself a GhostRoute signal, not noise.
--
-- Conventions match 028/029: public.* schema-qualified; bigserial PK; RLS enabled
-- with an explicit anon+authenticated SELECT policy; writes have NO policy →
-- service-role only (the worker's service key). Purely additive; IF NOT EXISTS
-- throughout; append-only (never UPDATE/DELETE a row).
--
-- Apply via PAT REST (reference_supabase_pat_ddl_escape).

-- ════════════════════════════════════════════════════════════════════════════
-- ghostroute_ct_inclusion_proofs — per-cert CT inclusion proofs.
--   Append-only: every cycle inserts one row per (cert, trusted log) attempt.
--   Public-read (an inclusion proof is a public, independently re-checkable
--   attestation, like ghostroute_ct_log_heads / rpki_snapshots).
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ghostroute_ct_inclusion_proofs (
  id                bigserial PRIMARY KEY,
  domain            text NOT NULL,            -- host we observed over live TLS
  ai_owner          text,                     -- ai_company from ghostroute_ai_infrastructure
  cert_sha256       text NOT NULL,            -- sha256 (hex) of the observed leaf DER
  log_url           text,                     -- log proven against (null = pre-proof gap)
  log_operator      text,                     -- never 'Google' (excluded)
  leaf_index        bigint,                   -- index of the leaf in the log
  tree_size         bigint,                   -- STH tree_size the proof was checked against
  sth_root_hash     text,                     -- base64 signature-verified root the proof recomputed to
  sct_timestamp     timestamptz,              -- timestamp from the cert's embedded SCT
  inclusion_proven  boolean NOT NULL,         -- did get-proof-by-hash recompute the verified root?
  reason            text,                     -- 'proven' | 'hash_not_in_log' | 'sth_unverified_or_unreachable' | ...
  observed_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghostroute_ct_incl_domain   ON public.ghostroute_ct_inclusion_proofs (domain);
CREATE INDEX IF NOT EXISTS idx_ghostroute_ct_incl_cert     ON public.ghostroute_ct_inclusion_proofs (cert_sha256);
CREATE INDEX IF NOT EXISTS idx_ghostroute_ct_incl_observed ON public.ghostroute_ct_inclusion_proofs (observed_at);
CREATE INDEX IF NOT EXISTS idx_ghostroute_ct_incl_proven   ON public.ghostroute_ct_inclusion_proofs (inclusion_proven);

ALTER TABLE public.ghostroute_ct_inclusion_proofs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghostroute_ct_inclusion_proofs_public_read ON public.ghostroute_ct_inclusion_proofs;
CREATE POLICY ghostroute_ct_inclusion_proofs_public_read ON public.ghostroute_ct_inclusion_proofs
  FOR SELECT TO anon, authenticated USING (true);

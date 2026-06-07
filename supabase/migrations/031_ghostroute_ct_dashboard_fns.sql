-- 031_ghostroute_ct_dashboard_fns.sql — P66 increment 3 (CT witness/proof dashboard).
--
-- Read-side aggregation for the GhostRoute Certificate-Transparency surface that
-- migrations 029 (ghostroute_ct_log_heads) and 030 (ghostroute_ct_inclusion_proofs)
-- write into. Two SECURITY DEFINER jsonb RPCs the data-api Worker exposes as
-- GET /v1/ghostroute/witness and GET /v1/ghostroute/proofs, plus the MCP tools.
--
-- WHY RPCs, NOT plain PostgREST reads. PostgREST silently caps every result at
-- 1000 rows (reference_supabase_max_rows_cap); ghostroute_ct_log_heads grows ~2
-- rows/log/day forever, so a naive "fetch all heads, diff in JS" would silently
-- miss regressions once the table passes the cap. Both functions return a single
-- jsonb scalar computed server-side over the FULL set — row-cap-immune, the same
-- discipline as P40 traverse_supply_path (025) and the P47/P48 signal fns.
--
-- THE SECURITY HEART — regression detection. The CT logs are append-only by
-- spec: a consistent log only ever grows, and a given tree_size has exactly one
-- Merkle root. ghostroute_ct_witness() flags any violation against our own
-- signature-verified history:
--   * tree_size_rewind  — a later snapshot reports FEWER entries than an earlier
--                         one (an append-only log must never shrink);
--   * root_fork         — the same tree_size was witnessed with two different
--                         root hashes (a split-view / equivocating log);
--   * sth_signature_invalid — the log's latest STH did not verify against its key.
-- A flagged log is a serious trust event, not noise — this is the witnessability
-- pillar (tunnelmind_question) made queryable.
--
-- Conventions match 025/028: public.* schema-qualified; jsonb scalar; STABLE;
-- SECURITY DEFINER + service-role-only EXECUTE; SET search_path. Read-only —
-- touches nothing the corpus worker writes. Purely additive.
--
-- Apply via PAT REST (reference_supabase_pat_ddl_escape).

-- ════════════════════════════════════════════════════════════════════════════
-- ghostroute_ct_witness() — corpus-wide CT witness health + regression scan.
--   Returns { summary, logs[], regressions[] } as one jsonb scalar.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ghostroute_ct_witness()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH ranked AS (
  SELECT log_url, log_operator, log_description, log_state,
         tree_size, sth_timestamp, root_hash, signature_verified, observed_at,
         row_number() OVER (PARTITION BY log_url ORDER BY observed_at DESC) AS rn,
         count(*)     OVER (PARTITION BY log_url)                           AS snapshots
    FROM ghostroute_ct_log_heads
),
latest AS (                              -- most-recent verified head per log
  SELECT * FROM ranked WHERE rn = 1
),
seq AS (                                 -- chronological neighbours per log
  SELECT log_url, log_operator, tree_size, observed_at,
         lag(tree_size)  OVER (PARTITION BY log_url ORDER BY observed_at) AS prev_size
    FROM ghostroute_ct_log_heads
),
rewinds AS (                             -- append-only violation: log shrank
  SELECT log_url, log_operator, 'tree_size_rewind'::text AS kind,
         prev_size AS from_tree_size, tree_size AS to_tree_size,
         NULL::bigint AS distinct_roots, observed_at
    FROM seq
   WHERE prev_size IS NOT NULL AND tree_size < prev_size
),
forks AS (                               -- equivocation: one size, two roots
  SELECT log_url, max(log_operator) AS log_operator, 'root_fork'::text AS kind,
         NULL::bigint AS from_tree_size, tree_size AS to_tree_size,
         count(DISTINCT root_hash) AS distinct_roots, max(observed_at) AS observed_at
    FROM ghostroute_ct_log_heads
   GROUP BY log_url, tree_size
  HAVING count(DISTINCT root_hash) > 1
),
unverified AS (                          -- latest STH failed signature verify
  SELECT log_url, log_operator, 'sth_signature_invalid'::text AS kind,
         NULL::bigint AS from_tree_size, tree_size AS to_tree_size,
         NULL::bigint AS distinct_roots, observed_at
    FROM latest WHERE signature_verified = false
),
regressions AS (
  SELECT * FROM rewinds
  UNION ALL SELECT * FROM forks
  UNION ALL SELECT * FROM unverified
)
SELECT jsonb_build_object(
  'summary', jsonb_build_object(
    'logs_witnessed',   (SELECT count(*) FROM latest),
    'verified_logs',    (SELECT count(*) FROM latest WHERE signature_verified),
    'unverified_logs',  (SELECT count(*) FROM latest WHERE NOT signature_verified),
    'all_verified',     NOT EXISTS (SELECT 1 FROM latest WHERE signature_verified = false),
    'total_snapshots',  (SELECT count(*) FROM ghostroute_ct_log_heads),
    'regressions',      (SELECT count(*) FROM regressions),
    'last_observed_at', (SELECT max(observed_at) FROM latest)
  ),
  'logs', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'log_url',            log_url,
             'log_operator',       log_operator,
             'log_description',    log_description,
             'log_state',          log_state,
             'tree_size',          tree_size,
             'sth_timestamp',      sth_timestamp,
             'root_hash',          root_hash,
             'signature_verified', signature_verified,
             'observed_at',        observed_at,
             'snapshots',          snapshots)
           ORDER BY log_operator NULLS LAST, log_url)
      FROM latest), '[]'::jsonb),
  'regressions', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'log_url',        log_url,
             'log_operator',   log_operator,
             'kind',           kind,
             'from_tree_size', from_tree_size,
             'to_tree_size',   to_tree_size,
             'distinct_roots', distinct_roots,
             'observed_at',    observed_at)
           ORDER BY observed_at DESC)
      FROM regressions), '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.ghostroute_ct_witness() IS
  'P66 — corpus-wide Certificate-Transparency witness health: latest signature-verified Signed Tree Head per trusted (non-Google) log, plus append-only regression detection (tree_size_rewind / root_fork / sth_signature_invalid). Row-cap-immune jsonb scalar. Read-only over ghostroute_ct_log_heads.';

-- ════════════════════════════════════════════════════════════════════════════
-- ghostroute_ct_proofs(p_domain, p_limit) — per-cert inclusion-proof rollup.
--   p_domain NULL → corpus-wide; otherwise one host. Returns
--   { domain, summary, recent[], by_domain[] } as one jsonb scalar.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ghostroute_ct_proofs(p_domain text DEFAULT NULL, p_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH lim AS (
  SELECT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200) AS n
),
filtered AS (
  SELECT * FROM ghostroute_ct_inclusion_proofs
   WHERE p_domain IS NULL OR domain = lower(p_domain)
),
recent AS (
  SELECT * FROM filtered ORDER BY observed_at DESC LIMIT (SELECT n FROM lim)
),
by_domain AS (
  SELECT domain, max(ai_owner) AS ai_owner,
         count(*)                              AS attempts,
         count(*) FILTER (WHERE inclusion_proven) AS proven,
         max(observed_at)                      AS last_observed_at
    FROM filtered
   GROUP BY domain
)
SELECT jsonb_build_object(
  'domain', CASE WHEN p_domain IS NULL THEN NULL ELSE lower(p_domain) END,
  'summary', jsonb_build_object(
    'total_attempts',  (SELECT count(*) FROM filtered),
    'proven',          (SELECT count(*) FROM filtered WHERE inclusion_proven),
    'unproven',        (SELECT count(*) FROM filtered WHERE NOT inclusion_proven),
    'domains',         (SELECT count(DISTINCT domain) FROM filtered),
    'last_observed_at',(SELECT max(observed_at) FROM filtered)
  ),
  'recent', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'domain',           domain,
             'ai_owner',         ai_owner,
             'cert_sha256',      cert_sha256,
             'log_url',          log_url,
             'log_operator',     log_operator,
             'leaf_index',       leaf_index,
             'tree_size',        tree_size,
             'sth_root_hash',    sth_root_hash,
             'sct_timestamp',    sct_timestamp,
             'inclusion_proven', inclusion_proven,
             'reason',           reason,
             'observed_at',      observed_at)
           ORDER BY observed_at DESC)
      FROM recent), '[]'::jsonb),
  'by_domain', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'domain',           domain,
             'ai_owner',         ai_owner,
             'attempts',         attempts,
             'proven',           proven,
             'last_observed_at', last_observed_at)
           ORDER BY domain)
      FROM by_domain), '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.ghostroute_ct_proofs(text, int) IS
  'P66 — per-cert CT inclusion-proof rollup. p_domain NULL = corpus-wide, else one host. Returns summary + recent attempts (incl. failures, with reason) + per-domain proven/attempts. Row-cap-immune jsonb scalar. Read-only over ghostroute_ct_inclusion_proofs.';

-- ── Least privilege: service-role EXECUTE only (the Worker's service key) ────
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.ghostroute_ct_witness()            FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.ghostroute_ct_proofs(text, int)    FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.ghostroute_ct_witness()         FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.ghostroute_ct_proofs(text, int) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.ghostroute_ct_witness()         FROM authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public.ghostroute_ct_proofs(text, int) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ghostroute_ct_witness()         TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ghostroute_ct_proofs(text, int) TO service_role';
  END IF;
END $$;

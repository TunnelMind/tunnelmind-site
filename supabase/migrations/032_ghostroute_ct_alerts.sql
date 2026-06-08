-- 032_ghostroute_ct_alerts.sql — P66 increment 4 (CT regression alerting).
--
-- The witness dashboard (031) makes regressions QUERYABLE, but a tree_size_rewind
-- or root_fork is a live equivocation event you want to know about within minutes,
-- not on next page load. This migration turns the pull-only regression scan into a
-- durable, deduplicated alert feed that the corpus worker pushes from.
--
-- DESIGN — detection stays in SQL, delivery lives in the worker.
--   * ghostroute_ct_alerts            — append-only, one row per DISTINCT regression
--                                       event (unique alert_key); first-detection
--                                       timestamp is immutable.
--   * ghostroute_ct_scan_alerts()     — recomputes the full regression set (same
--                                       append-only logic as ghostroute_ct_witness),
--                                       INSERTs any not-yet-recorded event ON CONFLICT
--                                       DO NOTHING, and RETURNS only the newly inserted
--                                       rows. The corpus worker calls this right after
--                                       writing fresh STHs; each returned row is a NEW
--                                       alert it then delivers (loud log + optional
--                                       webhook). Idempotent: a standing regression is
--                                       recorded once, never re-fired.
--   * ghostroute_ct_alerts_feed(n)    — read side for GET /v1/ghostroute/alerts + MCP.
--
-- WHY A SCAN RPC, NOT JS DIFF. Forks (one tree_size, two roots) and rewinds are
-- detected across the FULL head history, which PostgREST would silently cap at 1000
-- rows (reference_supabase_max_rows_cap). Computing + inserting server-side keeps it
-- row-cap-immune and makes the worker a thin delivery shell. Same discipline as 031.
--
-- alert_key granularity (one alert per genuine event, no 12h spam):
--   rewind      → rewind:{log_url}:{to_observed_at}   (each shrink transition is distinct)
--   root_fork   → fork:{log_url}:{tree_size}          (one forked size = one event)
--   bad sig     → siginvalid:{log_url}:{tree_size}    (re-fires only when a NEW size is bad)
--
-- Apply via PAT REST (reference_supabase_pat_ddl_escape).

-- ── Durable alert ledger ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ghostroute_ct_alerts (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_key       text        NOT NULL UNIQUE,
  kind            text        NOT NULL,            -- tree_size_rewind | root_fork | sth_signature_invalid
  severity        text        NOT NULL DEFAULT 'critical',
  log_url         text        NOT NULL,
  log_operator    text,
  from_tree_size  bigint,
  to_tree_size    bigint,
  distinct_roots  bigint,
  event_observed_at timestamptz,                   -- when the corpus observed the bad STH
  detected_at     timestamptz NOT NULL DEFAULT now(),  -- when TunnelMind first alerted (immutable)
  delivered       boolean     NOT NULL DEFAULT false   -- flipped true once the worker pushes it
);

CREATE INDEX IF NOT EXISTS ghostroute_ct_alerts_detected_idx
  ON public.ghostroute_ct_alerts (detected_at DESC);
CREATE INDEX IF NOT EXISTS ghostroute_ct_alerts_undelivered_idx
  ON public.ghostroute_ct_alerts (detected_at) WHERE NOT delivered;

COMMENT ON TABLE public.ghostroute_ct_alerts IS
  'P66 — durable, deduplicated ledger of CT append-only regression events (rewind / fork / bad STH signature). One row per distinct event; detected_at is the immutable first-detection time. Written only by ghostroute_ct_scan_alerts().';

-- ════════════════════════════════════════════════════════════════════════════
-- ghostroute_ct_scan_alerts() — detect + record NEW regressions, return them.
--   Returns { new_count, new_alerts[], open_total } as one jsonb scalar.
--   Idempotent; called by the corpus worker after each witness cycle.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ghostroute_ct_scan_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Recompute the full regression set, mirroring ghostroute_ct_witness (031).
  WITH ranked AS (
    SELECT log_url, log_operator, tree_size, root_hash, signature_verified, observed_at,
           row_number() OVER (PARTITION BY log_url ORDER BY observed_at DESC) AS rn
      FROM ghostroute_ct_log_heads
  ),
  latest AS (SELECT * FROM ranked WHERE rn = 1),
  seq AS (
    SELECT log_url, log_operator, tree_size, observed_at,
           lag(tree_size) OVER (PARTITION BY log_url ORDER BY observed_at) AS prev_size
      FROM ghostroute_ct_log_heads
  ),
  rewinds AS (
    SELECT 'rewind:' || log_url || ':' || to_char(observed_at, 'YYYYMMDD"T"HH24MISS') AS alert_key,
           'tree_size_rewind'::text AS kind, log_url, log_operator,
           prev_size AS from_tree_size, tree_size AS to_tree_size,
           NULL::bigint AS distinct_roots, observed_at AS event_observed_at
      FROM seq
     WHERE prev_size IS NOT NULL AND tree_size < prev_size
  ),
  forks AS (
    SELECT 'fork:' || log_url || ':' || tree_size::text AS alert_key,
           'root_fork'::text AS kind, log_url, max(log_operator) AS log_operator,
           NULL::bigint AS from_tree_size, tree_size AS to_tree_size,
           count(DISTINCT root_hash) AS distinct_roots, max(observed_at) AS event_observed_at
      FROM ghostroute_ct_log_heads
     GROUP BY log_url, tree_size
    HAVING count(DISTINCT root_hash) > 1
  ),
  unverified AS (
    SELECT 'siginvalid:' || log_url || ':' || tree_size::text AS alert_key,
           'sth_signature_invalid'::text AS kind, log_url, log_operator,
           NULL::bigint AS from_tree_size, tree_size AS to_tree_size,
           NULL::bigint AS distinct_roots, observed_at AS event_observed_at
      FROM latest WHERE signature_verified = false
  ),
  regressions AS (
    SELECT * FROM rewinds
    UNION ALL SELECT * FROM forks
    UNION ALL SELECT * FROM unverified
  ),
  inserted AS (
    INSERT INTO ghostroute_ct_alerts
      (alert_key, kind, severity, log_url, log_operator,
       from_tree_size, to_tree_size, distinct_roots, event_observed_at)
    SELECT alert_key, kind, 'critical', log_url, log_operator,
           from_tree_size, to_tree_size, distinct_roots, event_observed_at
      FROM regressions
    ON CONFLICT (alert_key) DO NOTHING
    RETURNING *
  )
  SELECT jsonb_build_object(
    'new_count', (SELECT count(*) FROM inserted),
    'new_alerts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id',                id,
               'alert_key',         alert_key,
               'kind',              kind,
               'severity',          severity,
               'log_url',           log_url,
               'log_operator',      log_operator,
               'from_tree_size',    from_tree_size,
               'to_tree_size',      to_tree_size,
               'distinct_roots',    distinct_roots,
               'event_observed_at', event_observed_at,
               'detected_at',       detected_at)
             ORDER BY detected_at)
        FROM inserted), '[]'::jsonb),
    'open_total', (SELECT count(*) FROM ghostroute_ct_alerts)
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.ghostroute_ct_scan_alerts() IS
  'P66 — detect + durably record NEW CT regression events (rewind / fork / bad STH sig), deduplicated by alert_key, returning only the newly inserted rows for the corpus worker to deliver. Idempotent. Writes ghostroute_ct_alerts.';

-- ── Mark an alert delivered (worker calls after a successful webhook push) ────
CREATE OR REPLACE FUNCTION public.ghostroute_ct_mark_delivered(p_ids bigint[])
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH upd AS (
    UPDATE ghostroute_ct_alerts SET delivered = true
     WHERE id = ANY(p_ids) AND NOT delivered
    RETURNING 1
  )
  SELECT count(*)::int FROM upd;
$$;

COMMENT ON FUNCTION public.ghostroute_ct_mark_delivered(bigint[]) IS
  'P66 — flip ghostroute_ct_alerts.delivered=true for the given ids after the corpus worker has pushed them. Returns rows updated.';

-- ════════════════════════════════════════════════════════════════════════════
-- ghostroute_ct_alerts_feed(p_limit) — read side for GET /v1/ghostroute/alerts.
--   Returns { summary, alerts[] } as one jsonb scalar.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ghostroute_ct_alerts_feed(p_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH lim AS (SELECT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200) AS n),
recent AS (
  SELECT * FROM ghostroute_ct_alerts ORDER BY detected_at DESC LIMIT (SELECT n FROM lim)
)
SELECT jsonb_build_object(
  'summary', jsonb_build_object(
    'total',          (SELECT count(*) FROM ghostroute_ct_alerts),
    'undelivered',    (SELECT count(*) FROM ghostroute_ct_alerts WHERE NOT delivered),
    'rewinds',        (SELECT count(*) FROM ghostroute_ct_alerts WHERE kind = 'tree_size_rewind'),
    'forks',          (SELECT count(*) FROM ghostroute_ct_alerts WHERE kind = 'root_fork'),
    'bad_signatures', (SELECT count(*) FROM ghostroute_ct_alerts WHERE kind = 'sth_signature_invalid'),
    'last_detected_at', (SELECT max(detected_at) FROM ghostroute_ct_alerts)
  ),
  'alerts', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'id',                id,
             'kind',              kind,
             'severity',          severity,
             'log_url',           log_url,
             'log_operator',      log_operator,
             'from_tree_size',    from_tree_size,
             'to_tree_size',      to_tree_size,
             'distinct_roots',    distinct_roots,
             'event_observed_at', event_observed_at,
             'detected_at',       detected_at,
             'delivered',         delivered)
           ORDER BY detected_at DESC)
      FROM recent), '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.ghostroute_ct_alerts_feed(int) IS
  'P66 — read side of the CT regression alert ledger: summary counts by kind + the most recent alerts. Row-cap-immune jsonb scalar.';

-- ── Least privilege: service-role EXECUTE only ───────────────────────────────
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.ghostroute_ct_scan_alerts()              FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.ghostroute_ct_mark_delivered(bigint[])   FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.ghostroute_ct_alerts_feed(int)           FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.ghostroute_ct_scan_alerts()            FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.ghostroute_ct_mark_delivered(bigint[]) FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.ghostroute_ct_alerts_feed(int)         FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.ghostroute_ct_scan_alerts()            FROM authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public.ghostroute_ct_mark_delivered(bigint[]) FROM authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public.ghostroute_ct_alerts_feed(int)         FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ghostroute_ct_scan_alerts()            TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ghostroute_ct_mark_delivered(bigint[]) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ghostroute_ct_alerts_feed(int)         TO service_role';
  END IF;
END $$;

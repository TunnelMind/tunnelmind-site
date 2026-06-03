-- 025_p40_traverse_supply_path.sql — P40 Phase 7.
--
-- Itemized supply-path traversal for a publisher domain. Where dark_pool_risk()
-- (migration 023) returns the AGGREGATE three-way reconciliation, this returns
-- the PER-PATH walk: every sell path the publisher declares, each joined to its
-- SSP identity and classified corroborated / contradicted / unchecked, plus one
-- level of downstream reseller expansion (the resells edge). It is the "walk the
-- graph" primitive — distinct from sigil/verify/supply_chain (which verifies a
-- schain the caller BRINGS) and from dark_pool_risk (which only counts).
--
-- Classification is identical to dark_pool_risk (feedback_signal_class_separation):
--   corroborated — declared seller_id present as a seat in the SSP's sellers.json
--   contradicted — SSP WAS crawled (≥1 seat) but this seller_id is absent → real risk
--   unchecked    — SSP's sellers.json never crawled (no seats)            → NOT risk
--
-- Row-cap-immune: returns a single jsonb scalar (PostgREST's 1000-row cap never
-- applies), with the path list bounded by p_limit (default 200, hard cap 500)
-- and ORDERED so a truncated view surfaces the riskiest paths first
-- (contradicted, then reseller). Aggregate counts always reflect the FULL set,
-- not the truncated page. SECURITY DEFINER + service-role-only, like P47/P48.
--
-- Additive + non-destructive. Apply via PAT REST (reference_supabase_pat_ddl_escape).

CREATE OR REPLACE FUNCTION public.traverse_supply_path(p_domain text, p_limit int DEFAULT 200)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH lim AS (
  SELECT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500) AS n
),
pub AS (
  SELECT id, entity_slug, ads_txt_parse_status,
         COALESCE(jsonb_array_length(ads_txt_entries), 0) AS entries_count,
         dns_verified
    FROM publisher
   WHERE domain = lower(p_domain)
   LIMIT 1
),
paths AS MATERIALIZED (
  SELECT st.ssp_id, st.seller_type, st.seller_id
    FROM sells_through st
    JOIN pub ON pub.id = st.publisher_id
),
crawled AS MATERIALIZED (          -- SSPs with ≥1 seat = sellers.json was crawled
  SELECT ds.ssp_id
    FROM (SELECT DISTINCT ssp_id FROM paths) ds
   WHERE EXISTS (SELECT 1 FROM exchange_seat es WHERE es.ssp_id = ds.ssp_id)
),
classified AS MATERIALIZED (
  SELECT
    p.ssp_id, p.seller_id, p.seller_type,
    CASE
      WHEN es.seat_id IS NOT NULL THEN 'corroborated'
      WHEN cr.ssp_id  IS NOT NULL THEN 'contradicted'
      ELSE                              'unchecked'
    END AS klass
    FROM paths p
    LEFT JOIN exchange_seat es ON es.ssp_id = p.ssp_id AND es.seat_id = p.seller_id
    LEFT JOIN crawled       cr ON cr.ssp_id = p.ssp_id
),
agg AS (                           -- counts over the FULL set, never truncated
  SELECT
    count(*)                                         AS paths_total,
    count(*) FILTER (WHERE seller_type = 'direct')   AS paths_direct,
    count(*) FILTER (WHERE seller_type = 'reseller') AS paths_reseller,
    count(*) FILTER (WHERE klass = 'corroborated')   AS corroborated,
    count(*) FILTER (WHERE klass = 'contradicted')   AS contradicted,
    count(*) FILTER (WHERE klass = 'unchecked')      AS unchecked
    FROM classified
),
ranked AS (                        -- bounded page, riskiest first
  SELECT c.ssp_id, c.seller_id, c.seller_type, c.klass,
         s.name AS ssp_name, s.domain AS ssp_domain, s.entity_slug AS ssp_entity_slug
    FROM classified c
    JOIN ssp s ON s.id = c.ssp_id
   ORDER BY (c.klass = 'contradicted') DESC,
            (c.seller_type = 'reseller') DESC,
            s.name
   LIMIT (SELECT n FROM lim)
),
expanded AS (                      -- one-level downstream reseller hop per ssp
  SELECT
    r.ssp_id, r.seller_id, r.seller_type, r.klass,
    r.ssp_name, r.ssp_domain, r.ssp_entity_slug,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'child_ssp_id',     cs.id,
               'child_ssp_name',   cs.name,
               'child_ssp_domain', cs.domain,
               'seller_id',        re.seller_id))
        FROM resells re
        JOIN ssp cs ON cs.id = re.child_ssp_id
       WHERE re.parent_ssp_id = r.ssp_id
    ), '[]'::jsonb) AS resells_to
    FROM ranked r
)
SELECT jsonb_build_object(
  'in_supply_graph', EXISTS (SELECT 1 FROM pub),
  'domain',          lower(p_domain),
  'entity_slug',     (SELECT entity_slug FROM pub),
  'ads_txt', jsonb_build_object(
    'parse_status',  (SELECT ads_txt_parse_status FROM pub),
    'entries_count', (SELECT entries_count FROM pub),
    'dns_verified',  (SELECT dns_verified FROM pub)
  ),
  'supply_paths', jsonb_build_object(
    'total',        (SELECT paths_total   FROM agg),
    'direct',       (SELECT paths_direct  FROM agg),
    'reseller',     (SELECT paths_reseller FROM agg),
    'corroborated', (SELECT corroborated  FROM agg),
    'contradicted', (SELECT contradicted  FROM agg),
    'unchecked',    (SELECT unchecked     FROM agg)
  ),
  'paths_returned', (SELECT count(*) FROM expanded),
  'paths', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'ssp_id',          ssp_id,
             'ssp_name',        ssp_name,
             'ssp_domain',      ssp_domain,
             'ssp_entity_slug', ssp_entity_slug,
             'seller_id',       seller_id,
             'seller_type',     seller_type,
             'klass',           klass,
             'resells_to',      resells_to))
      FROM expanded
  ), '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.traverse_supply_path(text, int) IS
  'P40 Phase 7 — itemized per-path traversal of a publisher''s declared sell paths, each classified (corroborated/contradicted/unchecked) and joined to SSP identity, with one-level reseller downstream expansion. Row-cap-immune jsonb scalar; counts are full-set, path list bounded. See ADR-2026-06-P40.';

-- Least privilege: callable only by the service role (the Worker's service key).
REVOKE ALL ON FUNCTION public.traverse_supply_path(text, int) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.traverse_supply_path(text, int) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.traverse_supply_path(text, int) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.traverse_supply_path(text, int) TO service_role';
  END IF;
END $$;

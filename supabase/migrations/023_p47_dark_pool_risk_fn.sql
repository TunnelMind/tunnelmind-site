-- 023_p47_dark_pool_risk_fn.sql — P47.
--
-- Server-side aggregation for dark_pool_risk. The edge implementation pulled
-- sells_through + exchange_seat rows to a Cloudflare Worker and classified them
-- in JS — but Supabase/PostgREST silently caps any result set at db-max-rows
-- (1000). For a real publisher that truncation is catastrophic to ACCURACY:
-- cnn.com has 3688 sell paths and its SSPs have 4–5k seats each, so the Worker
-- saw <1000 seats and mis-classified nearly every corroborated path as
-- contradicted/unchecked (corroborated collapsed to 0).
--
-- This SECURITY DEFINER function does the whole three-way classification inside
-- Postgres — no row cap, one round-trip, indexed EXISTS lookups against the
-- exchange_seat UNIQUE(seat_id, ssp_id) btree. Returns only aggregate counts
-- (+ a small contradicted sample), never bulk rows.
--
-- Classification (kept strictly separate — feedback_signal_class_separation):
--   corroborated — declared seller_id present as a seat in the SSP's sellers.json
--   contradicted — SSP WAS crawled (has ≥1 seat) but this seller_id is absent  → real risk
--   unchecked    — SSP's sellers.json never crawled (no seats at all)          → NOT risk
--
-- exchange_seat.seat_id IS the sellers.json seller_id (migration 021), so it
-- joins directly to sells_through.seller_id for the same ssp_id.
--
-- Additive + non-destructive. Apply via PAT REST (api.supabase.com/.../database/query).

CREATE OR REPLACE FUNCTION public.dark_pool_risk(p_domain text)
RETURNS TABLE (
  in_supply_graph        boolean,
  entity_slug            text,
  ads_txt_parse_status   text,
  ads_txt_entries_count  integer,
  dns_verified           boolean,
  paths_total            bigint,
  paths_direct           bigint,
  paths_reseller         bigint,
  corroborated           bigint,
  contradicted           bigint,
  unchecked              bigint,
  contradicted_sample    text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH pub AS (
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
crawled AS MATERIALIZED (          -- SSPs with ≥1 seat = sellers.json was crawled.
  -- One index probe per DISTINCT ssp (idx_exchange_seat_ssp_id), short-circuited
  -- by EXISTS — never scans the (huge) per-SSP seat lists just to dedupe.
  SELECT ds.ssp_id
    FROM (SELECT DISTINCT ssp_id FROM paths) ds
   WHERE EXISTS (SELECT 1 FROM exchange_seat es WHERE es.ssp_id = ds.ssp_id)
),
classified AS MATERIALIZED (
  -- One indexed probe per path: LEFT JOIN on the exchange_seat
  -- UNIQUE(seat_id, ssp_id) btree (≤1 match, no row multiplication). The
  -- correlated-EXISTS form re-ran 3688× per count and took ~9s; this scans once.
  SELECT
    p.ssp_id,
    p.seller_id,
    p.seller_type,
    CASE
      WHEN es.seat_id IS NOT NULL THEN 'corroborated'
      WHEN cr.ssp_id  IS NOT NULL THEN 'contradicted'
      ELSE                              'unchecked'
    END AS klass
    FROM paths p
    LEFT JOIN exchange_seat es ON es.ssp_id = p.ssp_id AND es.seat_id = p.seller_id
    LEFT JOIN crawled       cr ON cr.ssp_id = p.ssp_id
),
agg AS (                           -- single pass over classified
  SELECT
    count(*)                                              AS paths_total,
    count(*) FILTER (WHERE seller_type = 'direct')        AS paths_direct,
    count(*) FILTER (WHERE seller_type = 'reseller')      AS paths_reseller,
    count(*) FILTER (WHERE klass = 'corroborated')        AS corroborated,
    count(*) FILTER (WHERE klass = 'contradicted')        AS contradicted,
    count(*) FILTER (WHERE klass = 'unchecked')           AS unchecked,
    (array_agg(ssp_id::text || ':' || seller_id)
       FILTER (WHERE klass = 'contradicted'))[1:12]       AS contradicted_sample
    FROM classified
)
SELECT
  EXISTS (SELECT 1 FROM pub),
  (SELECT entity_slug          FROM pub),
  (SELECT ads_txt_parse_status FROM pub),
  (SELECT entries_count        FROM pub)::int,
  (SELECT dns_verified         FROM pub),
  agg.paths_total,
  agg.paths_direct,
  agg.paths_reseller,
  agg.corroborated,
  agg.contradicted,
  agg.unchecked,
  agg.contradicted_sample
  FROM agg;
$$;

COMMENT ON FUNCTION public.dark_pool_risk(text) IS
  'P47 — three-way (corroborated/contradicted/unchecked) reconciliation of a publisher''s declared sell paths against each SSP''s sellers.json. Aggregate-only; row-cap-immune. See ADR-2026-06-P47.';

-- Least privilege: callable only by the service role (the Worker uses the
-- service key). anon/authenticated get nothing.
REVOKE ALL ON FUNCTION public.dark_pool_risk(text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.dark_pool_risk(text) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.dark_pool_risk(text) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.dark_pool_risk(text) TO service_role';
  END IF;
END $$;

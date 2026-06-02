-- 021_p40_dsp_from_sellers_json.sql — P40 Phase 4.4.
--
-- Populate dsp from sellers.json INTERMEDIARY/BOTH seats already crawled into
-- exchange_seat. The plan said "seller_type = NETWORK"; the IAB sellers.json
-- 1.0 vocabulary is PUBLISHER | INTERMEDIARY | BOTH (migration 016), and the
-- network/demand-adjacent intermediaries are exactly INTERMEDIARY + BOTH.
--
-- The plan also said "top 500 SSPs by sells_through first" — that was an
-- incremental-crawl hint. A single server-side INSERT…SELECT covers ALL
-- intermediary seats at once (one representative seat per seller_domain),
-- which is a strict superset and far cheaper than thousands of REST writes.
--
-- ads_txt_authorized is set when the seller_id appears as a DIRECT row in
-- sells_through (i.e. some publisher's ads.txt authorized it directly).
--
-- IDEMPOTENT + non-destructive: ON CONFLICT (domain) updates only the
-- sellers.json-derived fields. The 33 curated seed rows (014) keep their
-- hand-set name / self_serve / atap_compatible / entity_slug; name and
-- entity_slug are only *filled* when currently empty, never overwritten.
--
-- Apply via PAT REST query (api.supabase.com/.../database/query).

BEGIN;

WITH direct_sellers AS (
  SELECT DISTINCT seller_id
    FROM sells_through
   WHERE seller_type = 'direct'
),
ranked AS (
  SELECT DISTINCT ON (es.seller_domain)
         es.seller_domain                         AS domain,
         COALESCE(NULLIF(es.seller_name, ''), es.seller_domain) AS name,
         es.seat_id                               AS seller_id,
         es.seller_type                           AS seller_type,
         es.owner_entity_slug                     AS entity_slug,
         s.domain                                 AS ssp_domain
    FROM exchange_seat es
    JOIN ssp s ON s.id = es.ssp_id
   WHERE es.seller_type IN ('INTERMEDIARY', 'BOTH')
     AND es.seller_domain IS NOT NULL
     AND es.seller_domain <> ''
   ORDER BY es.seller_domain, es.activity_last_seen DESC NULLS LAST
)
INSERT INTO dsp
  (entity_slug, name, domain, seller_id, seller_type, sellers_json_url,
   ads_txt_authorized, self_serve, atap_compatible)
SELECT
  r.entity_slug,
  r.name,
  r.domain,
  r.seller_id,
  r.seller_type,
  'https://' || r.ssp_domain || '/sellers.json',
  (d.seller_id IS NOT NULL),
  TRUE,    -- self_serve default for crawl-derived rows; curated rows keep theirs
  FALSE
FROM ranked r
LEFT JOIN direct_sellers d ON d.seller_id = r.seller_id
ON CONFLICT (domain) DO UPDATE SET
  seller_id          = EXCLUDED.seller_id,
  seller_type        = EXCLUDED.seller_type,
  sellers_json_url   = EXCLUDED.sellers_json_url,
  ads_txt_authorized = dsp.ads_txt_authorized OR EXCLUDED.ads_txt_authorized,
  name               = CASE WHEN dsp.name IS NULL OR dsp.name = ''
                            THEN EXCLUDED.name ELSE dsp.name END,
  entity_slug        = COALESCE(dsp.entity_slug, EXCLUDED.entity_slug);

COMMIT;

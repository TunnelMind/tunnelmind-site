-- 024_p48_halo_team_fns.sql — P48.
--
-- Two more adversary-track product signals, both server-side aggregate RPCs
-- (same row-cap-immune pattern as P47's dark_pool_risk, migration 023):
--
--   halo_score(p_entity_slug)  — peer-reputation halo. Scores an entity by the
--     trust character of its supply-graph NEIGHBOURS (the SSPs its publishers
--     sell through + the DSPs it buys through), lighting up the `peer_reputation`
--     component reserved-but-unevaluated in the P36 trust engine (migration 011).
--     Symmetric: reputable neighbours raise it, adversary-classified neighbours
--     (P46 oai_adversary_class) drag it down. Evidence, not a persisted label —
--     no profile poisoning (feedback_no_poisoning).
--
--   team_signal(p_entity_slug) — shared-identifier clustering. Surfaces other
--     entities that operate as a coordinated "team" with this one: they share a
--     seller account (same ssp_id + seller_id in sells_through) or co-own the
--     same exchange seat (owns_seat). A shared seller_id at an SSP is the same
--     account behind multiple "entities" — a strong same-operator signal.
--
-- Both return aggregate counts + small samples only (never bulk rows), are
-- SECURITY DEFINER + service-role-only, and read existing tables/views.
--
-- Additive + non-destructive. Apply via PAT REST (api.supabase.com/.../database/query).

-- Supporting indexes (idempotent). The shared-seller lookup matches on
-- (ssp_id, seller_id); the existing idx_sells_through_ssp covers only ssp_id.
DROP INDEX IF EXISTS public.idx_sells_through_ssp_seller;  -- superseded by the partial index below
CREATE INDEX IF NOT EXISTS idx_sells_through_direct_ssp_seller
  ON public.sells_through (ssp_id, seller_id) WHERE seller_type = 'direct';
-- Neighbour-trust join hits mv_entity_trust_scores by entity_slug (the MV ships
-- with indexes on entity_type/entity_key only).
CREATE INDEX IF NOT EXISTS idx_mv_entity_trust_scores_slug
  ON public.mv_entity_trust_scores (entity_slug);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ halo_score                                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
DROP FUNCTION IF EXISTS public.halo_score(text);
CREATE OR REPLACE FUNCTION public.halo_score(p_entity_slug text)
RETURNS TABLE (
  in_supply_graph          boolean,
  neighbor_count           bigint,
  scored_neighbor_count    bigint,
  mean_neighbor_trust      numeric,
  min_neighbor_trust       numeric,
  adversary_neighbor_count bigint,
  adversary_classes        text[],
  neighbor_sample          text[],
  adversary_sample         text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH neighbors AS (
  -- sell-side: SSP operators this entity's publishers sell through
  SELECT DISTINCT s.entity_slug AS neighbor_slug
    FROM sells_through st
    JOIN publisher p ON p.id = st.publisher_id AND p.entity_slug = lower(p_entity_slug)
    JOIN ssp s       ON s.id = st.ssp_id
   WHERE s.entity_slug IS NOT NULL AND s.entity_slug <> lower(p_entity_slug)
  UNION
  -- buy-side: DSP operators this entity buys through
  SELECT DISTINCT d.entity_slug AS neighbor_slug
    FROM buys_through bt
    JOIN dsp d ON d.id = bt.dsp_id
   WHERE bt.buyer_entity_slug = lower(p_entity_slug)
     AND d.entity_slug IS NOT NULL AND d.entity_slug <> lower(p_entity_slug)
),
neighbor_trust AS (
  SELECT n.neighbor_slug, avg(m.trust_score) AS t
    FROM neighbors n
    LEFT JOIN mv_entity_trust_scores m ON m.entity_slug = n.neighbor_slug
   GROUP BY n.neighbor_slug
),
adversary AS (
  SELECT DISTINCT n.neighbor_slug, a.adversary_class
    FROM neighbors n
    JOIN oai_registry r        ON r.aliases && ARRAY['oai:' || n.neighbor_slug]
    JOIN oai_adversary_class a  ON a.oai_id = r.oai_id
)
SELECT
  EXISTS (SELECT 1 FROM tracker_entities WHERE entity_slug = lower(p_entity_slug)),
  (SELECT count(*) FROM neighbors),
  (SELECT count(*) FROM neighbor_trust WHERE t IS NOT NULL),
  (SELECT round(avg(t), 4) FROM neighbor_trust WHERE t IS NOT NULL),
  (SELECT round(min(t), 4) FROM neighbor_trust WHERE t IS NOT NULL),
  (SELECT count(DISTINCT neighbor_slug) FROM adversary),
  (SELECT array_agg(DISTINCT adversary_class) FROM adversary),
  (SELECT (array_agg(neighbor_slug ORDER BY neighbor_slug))[1:12] FROM neighbors),
  (SELECT (array_agg(neighbor_slug || ':' || adversary_class))[1:12] FROM adversary);
$$;

COMMENT ON FUNCTION public.halo_score(text) IS
  'P48 — peer-reputation halo: trust character of an entity''s supply-graph neighbours + adversary-classified neighbour count. Aggregate-only. See ADR-2026-06-P48.';

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ team_signal                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
DROP FUNCTION IF EXISTS public.team_signal(text);
CREATE OR REPLACE FUNCTION public.team_signal(p_entity_slug text)
RETURNS TABLE (
  in_supply_graph          boolean,
  shared_direct_accounts   bigint,   -- X's direct accounts narrowly shared (2..8 entities)
  house_account_pairs      bigint,   -- excluded: direct accounts shared by >8 entities
  seller_mate_count        bigint,
  coowned_seat_count       bigint,
  seat_mate_count          bigint,
  teammate_count           bigint,
  teammate_sample          text[],
  evidence_sample          text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH x_pairs AS MATERIALIZED (          -- this entity's DIRECT (ssp_id, seller_id) accounts
  SELECT DISTINCT st.ssp_id, st.seller_id
    FROM sells_through st
    JOIN publisher p ON p.id = st.publisher_id AND p.entity_slug = lower(p_entity_slug)
   WHERE st.seller_type = 'direct'
),
pair_fanout AS MATERIALIZED (
  -- For each of X's direct accounts, how many DISTINCT entities use it, and who.
  -- A direct account shared by hundreds of entities is a network/house account,
  -- NOT coordination — the data shows single accounts shared by 300+ entities.
  -- Only NARROW sharing (2..8 entities incl. X) is a same-operator signal; wide
  -- sharing is counted separately as house_account_pairs and excluded from mates.
  SELECT xp.ssp_id, xp.seller_id,
         count(DISTINCT p2.entity_slug) AS n_ent,
         array_agg(DISTINCT p2.entity_slug)
           FILTER (WHERE p2.entity_slug <> lower(p_entity_slug)) AS mates
    FROM x_pairs xp
    JOIN sells_through st2
      ON st2.ssp_id = xp.ssp_id AND st2.seller_id = xp.seller_id AND st2.seller_type = 'direct'
    JOIN publisher p2 ON p2.id = st2.publisher_id
   WHERE p2.entity_slug IS NOT NULL
   GROUP BY xp.ssp_id, xp.seller_id
),
narrow AS (
  SELECT ssp_id, seller_id, unnest(mates) AS mate
    FROM pair_fanout
   WHERE n_ent BETWEEN 2 AND 8
),
x_seats AS (
  SELECT exchange_seat_id FROM owns_seat WHERE owner_entity_slug = lower(p_entity_slug)
),
seat_mates AS (                         -- other entities co-owning one of those seats
  SELECT DISTINCT o2.owner_entity_slug AS mate, o2.exchange_seat_id
    FROM owns_seat o2
    JOIN x_seats xs ON xs.exchange_seat_id = o2.exchange_seat_id
   WHERE o2.owner_entity_slug <> lower(p_entity_slug)
),
all_mates AS (
  SELECT mate FROM narrow
  UNION
  SELECT mate FROM seat_mates
)
SELECT
  EXISTS (SELECT 1 FROM tracker_entities WHERE entity_slug = lower(p_entity_slug)),
  (SELECT count(DISTINCT (ssp_id, seller_id)) FROM narrow),
  (SELECT count(*) FROM pair_fanout WHERE n_ent > 8),
  (SELECT count(DISTINCT mate) FROM narrow),
  (SELECT count(DISTINCT exchange_seat_id) FROM seat_mates),
  (SELECT count(DISTINCT mate) FROM seat_mates),
  (SELECT count(*) FROM all_mates),
  (SELECT (array_agg(mate ORDER BY mate))[1:12] FROM all_mates),
  (SELECT (array_agg(ssp_id::text || ':' || seller_id || '->' || mate))[1:12] FROM narrow);
$$;

COMMENT ON FUNCTION public.team_signal(text) IS
  'P48 — shared-identifier clustering: entities NARROWLY sharing a direct seller account (2..8 entities, excluding network house accounts) or co-owning a seat with this one = coordinated operation. Aggregate-only. See ADR-2026-06-P48.';

-- Least privilege: service-role only (the Worker uses the service key).
REVOKE ALL ON FUNCTION public.halo_score(text), public.team_signal(text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.halo_score(text), public.team_signal(text) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.halo_score(text), public.team_signal(text) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.halo_score(text), public.team_signal(text) TO service_role';
  END IF;
END $$;

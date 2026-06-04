-- 027_p40_bgp_events.sql — P40 Phase 8: BGP routing-anomaly observation.
--
-- Adds the witnessability layer's routing dimension: a watchlist of resources
-- (prefixes / ASNs) and a tamper-evident log of routing anomalies observed
-- against them. The bgp-monitor (a cron-triggered Worker, tunnelmind-data-api
-- /bgp-monitor) polls RIPEstat — RIPE NCC, the non-profit RIR, per
-- feedback_no_big_tech, same source as the existing /api/corpus/asn tab — and
-- writes an event whenever a watched resource's visible origin set, RPKI
-- validity, or more-specific coverage deviates from its recorded baseline.
--
-- Drift correction vs. the original P40 plan: the plan named a "bgp-monitor
-- CONTAINER". Retargeted to a cron Worker (mirrors Phase 4.3, which retargeted
-- threat_intel_cache → an Augur source rather than new infra): a routing poll
-- runs a few times a day, so an always-on VPS Docker service would be idle
-- compute. The Worker is serverless, persists to this Postgres (never KV, per
-- feedback_no_freetier_loadbearing), and reuses the data-api Supabase binding.
--
-- Self-baselining: on first sight of a watched resource the monitor records the
-- currently-visible origin set as its baseline (no event). Subsequent polls
-- diff against that baseline; a new origin → origin_change, RPKI invalid →
-- rpki_invalid, an unexpected more-specific → new_more_specific. This avoids
-- hand-maintaining an expected-origin column for every entry.
--
-- Purely additive. IF NOT EXISTS guards throughout. Apply via PAT REST
-- (reference_supabase_pat_ddl_escape).

-- ── (a) bgp_watchlist — what we monitor ─────────────────────────────────────
-- Service-role only. A watchlist row names a resource we care about (our own
-- sensor-fleet prefixes for witnessability; high-value SSP/publisher prefixes
-- for Sigil supply-chain integrity; canaries to prove the pipeline). It is NOT
-- public-read: exposing the fleet's announcing prefixes would let an adversary
-- enumerate sensor infrastructure (same rationale oai_sensors omits IPs, mig 020).
CREATE TABLE IF NOT EXISTS public.bgp_watchlist (
  id               bigserial PRIMARY KEY,
  resource         text NOT NULL,                 -- a CIDR prefix ('45.32.0.0/24') or 'AS####'
  kind             text NOT NULL DEFAULT 'prefix'
        CHECK (kind IN ('prefix','asn')),
  label            text,                           -- human label, e.g. 'tunnelmind-fleet-de'
  reason           text NOT NULL DEFAULT 'manual'
        CHECK (reason IN ('fleet','ssp','publisher','canary','manual')),
  baseline_origins integer[] NOT NULL DEFAULT '{}',  -- expected origin ASNs (self-baselined on first sight)
  baseline_set_at  timestamptz,
  enabled          boolean NOT NULL DEFAULT true,
  last_checked_at  timestamptz,
  last_error       text,
  added_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource)
);

ALTER TABLE public.bgp_watchlist ENABLE ROW LEVEL SECURITY;
-- No policies → service-role only (the monitor + read RPC use the service key).

-- ── (b) bgp_events — observed routing anomalies ─────────────────────────────
-- Public-read: routing anomalies are public observations, like
-- sensor_observations (mig 020). Writes are service-role only (the monitor).
CREATE TABLE IF NOT EXISTS public.bgp_events (
  id            bigserial PRIMARY KEY,
  observed_at   timestamptz NOT NULL DEFAULT now(),
  resource      text NOT NULL,                     -- the watched resource this event is about
  event_type    text NOT NULL
        CHECK (event_type IN ('origin_change','rpki_invalid','new_more_specific','visibility_drop','withdrawn')),
  prefix        text,                              -- the specific prefix involved (may be a more-specific)
  origin_asn    integer,                           -- the newly-observed origin ASN, when applicable
  prev_origins  integer[] NOT NULL DEFAULT '{}',   -- the baseline origin set the event deviated from
  rpki_status   text                               -- valid | invalid | unknown | not-checked
        CHECK (rpki_status IN ('valid','invalid','unknown','not-checked')),
  severity      text NOT NULL DEFAULT 'info'
        CHECK (severity IN ('info','low','medium','high','critical')),
  visible_peers integer,                           -- RIS peers seeing the announcement (visibility proxy)
  detail        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_bgp_events_observed ON public.bgp_events (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bgp_events_resource ON public.bgp_events (resource, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bgp_events_type     ON public.bgp_events (event_type);

ALTER TABLE public.bgp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bgp_events_public_read ON public.bgp_events;
CREATE POLICY bgp_events_public_read ON public.bgp_events
  FOR SELECT TO anon, authenticated USING (true);
-- No INSERT/UPDATE/DELETE policies → writes via service-role only (monitor).

-- ── (c) recent_bgp_events RPC — the read path ───────────────────────────────
-- Row-cap-immune jsonb scalar (PostgREST's 1000-row cap never applies),
-- consistent with traverse_supply_path (025) / dark_pool_risk (023). Optional
-- resource filter; p_since_ms bounds the window; p_limit bounds the list (newest
-- first). SECURITY DEFINER + service-role-only, like P47/P48/P40-7.
CREATE OR REPLACE FUNCTION public.recent_bgp_events(
  p_resource text   DEFAULT NULL,
  p_since_ms  bigint DEFAULT NULL,
  p_limit     int    DEFAULT 100
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH lim AS (
  SELECT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500) AS n
),
since AS (
  SELECT CASE WHEN p_since_ms IS NULL THEN NULL
              ELSE to_timestamp(p_since_ms / 1000.0) END AS ts
),
filtered AS (
  SELECT e.*
    FROM bgp_events e, since s
   WHERE (p_resource IS NULL OR e.resource = p_resource)
     AND (s.ts IS NULL OR e.observed_at >= s.ts)
),
total AS (SELECT count(*) AS c FROM filtered),
page AS (
  SELECT * FROM filtered
   ORDER BY observed_at DESC
   LIMIT (SELECT n FROM lim)
)
SELECT jsonb_build_object(
  'resource',     p_resource,
  'since_ms',     p_since_ms,
  'limit',        (SELECT n FROM lim),
  'count',        (SELECT c FROM total),
  'returned',     (SELECT count(*) FROM page),
  'events', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'id',            id,
             'observed_at',   observed_at,
             'resource',      resource,
             'event_type',    event_type,
             'prefix',        prefix,
             'origin_asn',    origin_asn,
             'prev_origins',  prev_origins,
             'rpki_status',   rpki_status,
             'severity',      severity,
             'visible_peers', visible_peers,
             'detail',        detail)
             ORDER BY observed_at DESC)
      FROM page
  ), '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.recent_bgp_events(text, bigint, int) IS
  'P40 Phase 8 — recent BGP routing-anomaly events, optionally filtered by resource and time window. Row-cap-immune jsonb scalar; count is full-set, events list bounded newest-first. Populated by the bgp-monitor cron Worker from RIPEstat. See ADR-2026-06-P40-bgp.';

-- Least privilege: callable only by the service role (the Worker's service key).
REVOKE ALL ON FUNCTION public.recent_bgp_events(text, bigint, int) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.recent_bgp_events(text, bigint, int) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.recent_bgp_events(text, bigint, int) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.recent_bgp_events(text, bigint, int) TO service_role';
  END IF;
END $$;

-- ── (d) Seed canaries ───────────────────────────────────────────────────────
-- Two stable, well-known prefixes purely as monitoring TARGETS (observation, not
-- infrastructure use — feedback_no_big_tech is about what we build ON, not what
-- we watch). They establish a baseline and report "stable" on every poll, which
-- proves the pipeline end-to-end before fleet/SSP prefixes are curated in. Fleet
-- prefixes (reason='fleet') and high-value SSP/publisher prefixes (reason='ssp'/
-- 'publisher') are added post-deploy — see the Phase 8 follow-up.
INSERT INTO public.bgp_watchlist (resource, kind, label, reason)
VALUES
  ('8.8.8.0/24', 'prefix', 'canary-quad8',      'canary'),
  ('1.1.1.0/24', 'prefix', 'canary-one-one',    'canary')
ON CONFLICT (resource) DO NOTHING;

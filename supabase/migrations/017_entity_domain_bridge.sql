-- Migration 017 — entity_domain bridge table.
--
-- The Supabase `tracker_entities` mirror holds entity_slug + name but has no
-- domain data (entity_metadata is {} for every row, website is NULL for
-- every row). The DDG Tracker Radar entity→domain map lives in Cloudflare
-- D1 behind data.tunnelmind.ai/v1/entities and exposes a multi-domain array
-- per entity (e.g. The Trade Desk → thetradedesk.com + adsrvr.org + ...).
--
-- This bridge table mirrors the relevant subset of that map into Supabase
-- so entity resolution at crawl time and at backfill time is a single SQL
-- join, not an HTTP round-trip per row. The cost is one column per row of
-- duplication and a periodic sync; the benefit is sub-millisecond domain →
-- entity lookups across the entire Sigil graph (publisher, ssp, exchange_seat).
--
-- Populated by sigil-crawler/scripts/sync-entity-domains.js (run on-demand
-- or weekly). The (domain) primary key enforces 1-domain → 1-entity; if
-- Tracker Radar later disambiguates, the sync script picks the highest
-- score and the existing row is overwritten.
--
-- Provenance: `source` and `score` come from the upstream /v1/entities
-- response; `synced_at` lets us age out stale mappings if the upstream
-- evicts a domain.

CREATE TABLE IF NOT EXISTS public.entity_domain (
  domain       TEXT PRIMARY KEY,
  entity_slug  TEXT NOT NULL REFERENCES public.tracker_entities(entity_slug) ON DELETE CASCADE,
  category     TEXT,
  source       TEXT,
  score        INTEGER,
  prevalence   DOUBLE PRECISION,
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_domain_entity_slug
  ON public.entity_domain (entity_slug);

-- RLS: service-role only, mirrors the rest of the Sigil tables.
ALTER TABLE public.entity_domain ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.entity_domain FROM anon, authenticated;

-- Hide from auto-generated PostgREST GraphQL surface.
COMMENT ON TABLE public.entity_domain IS '@graphql({"enabled": false})';

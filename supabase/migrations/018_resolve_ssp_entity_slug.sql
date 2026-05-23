-- Migration 018 — resolve ssp.entity_slug from entity_domain.
--
-- Companion to migration 017 (entity_domain bridge). The ssp table has
-- 2,595 rows from the ads.txt crawler with entity_slug all NULL because
-- the sigil-crawler's resolveEntitySlug() was a no-op before PR
-- TunnelMind/sigil-crawler#4. Now that entity_domain is populated, we can
-- backfill ssp.entity_slug in one SQL pass.
--
-- This unblocks the resells backfill: with ssp.entity_slug populated,
-- lookupSspIdsByEntitySlug() finds child-SSP rows by the resolved owner
-- entity, and the skip-reason `no_child_ssp` drops accordingly.
--
-- The future steady-state will rely on the crawler writing entity_slug
-- at upsert time; this migration backfills the existing rows.
--
-- Already applied to production via Supabase MCP earlier this session;
-- this file reconciles disk-side migration state.

UPDATE public.ssp
SET entity_slug = ed.entity_slug
FROM public.entity_domain ed
WHERE ssp.domain = ed.domain
  AND ssp.entity_slug IS NULL;

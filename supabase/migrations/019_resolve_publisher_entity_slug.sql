-- Migration 019 — resolve publisher.entity_slug from entity_domain.
--
-- Companion to migration 018 — same mechanism, different target table.
-- The publisher table has 10,001 rows from the ads.txt crawler with
-- entity_slug all NULL. After the bridge is populated, we can backfill in
-- one SQL pass. Today's resolution rate: ~23% (2,260 / 10,001), bounded
-- by entity_domain catalog coverage.
--
-- Already applied to production via Supabase MCP earlier this session;
-- this file reconciles disk-side migration state.

UPDATE public.publisher
SET entity_slug = ed.entity_slug
FROM public.entity_domain ed
WHERE publisher.domain = ed.domain
  AND publisher.entity_slug IS NULL;

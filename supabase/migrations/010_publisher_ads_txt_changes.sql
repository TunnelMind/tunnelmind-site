-- 010_publisher_ads_txt_changes.sql
--
-- RECONSTRUCTED 2026-05-22 from the live schema (project ujosrvwcimdqofwjhnan,
-- migration applied 2026-05-16). The original file was missing from disk
-- although the migration was tracked in supabase_migrations.schema_migrations.
-- This file makes a re-apply against a fresh database reproduce the live state.
--
-- Purpose: Sigil G9 — append-only changelog of per-publisher ads.txt
-- seller-set changes. The crawler in sigil-crawler diffs each crawl against
-- the prior `publisher.ads_txt_entries` snapshot and writes one row here
-- when something changed.
--
-- Keyed by publisher_domain (TEXT, not publisher.id FK) so the change log
-- survives publisher row deletes / renumbering. NOT indexed for publisher
-- joins; the index on (publisher_domain, observed_at DESC) supports the
-- "show me recent changes for this publisher" query pattern.
--
-- RLS: enabled with no policies — service-role only, mirroring the rest of
-- the Sigil supply-chain stack.

CREATE TABLE IF NOT EXISTS publisher_ads_txt_changes (
  id                BIGSERIAL PRIMARY KEY,
  publisher_domain  TEXT NOT NULL,
  observed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_count       INTEGER NOT NULL DEFAULT 0,
  removed_count     INTEGER NOT NULL DEFAULT 0,
  additions         JSONB NOT NULL DEFAULT '[]'::JSONB,
  removals          JSONB NOT NULL DEFAULT '[]'::JSONB,
  directive_changes JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_adstxt_changes_domain_time
  ON publisher_ads_txt_changes(publisher_domain, observed_at DESC);

COMMENT ON TABLE publisher_ads_txt_changes IS
  'Sigil G9 — append-only log of ads.txt seller-set changes per publisher, written by sigil-crawler when a crawl differs from the prior one.';

ALTER TABLE publisher_ads_txt_changes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON publisher_ads_txt_changes FROM anon, authenticated;

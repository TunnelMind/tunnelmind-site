-- 009_publisher_adstxt_directives.sql
--
-- RECONSTRUCTED 2026-05-22 from the live schema (project ujosrvwcimdqofwjhnan,
-- migration applied 2026-05-16). The original file was missing from disk
-- although the migration was tracked in supabase_migrations.schema_migrations.
-- This file makes a re-apply against a fresh database reproduce the live state.
--
-- Purpose: Sigil G1 — persist ads.txt v1.1 variable directives
-- (OWNERDOMAIN, MANAGERDOMAIN, INVENTORYPARTNERDOMAIN, SUBDOMAIN, CONTACT)
-- alongside the seller list. The crawler in sigil-crawler writes this
-- JSONB on every successful crawl.
--
-- Shape (matches sigil-crawler/src/parser.js emptyDirectives()):
--   {
--     "owner_domain": string|null,
--     "manager_domains": [{ "domain": string, "country": string|null }],
--     "inventory_partner_domains": string[],
--     "subdomains": string[],
--     "contact": string|null
--   }
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + reapplied COMMENT.

ALTER TABLE publisher
  ADD COLUMN IF NOT EXISTS directives JSONB NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN publisher.directives IS
  'ads.txt v1.1 variable directives (OWNERDOMAIN/MANAGERDOMAIN/INVENTORYPARTNERDOMAIN/SUBDOMAIN/CONTACT). Populated by sigil-crawler.';

-- 007_supply_chain_entities.sql
-- Sigil P29 — Supply chain entity graph extension.
--
-- Two parts:
--   1. tracker_entities — read-only mirror of tunnelmind-data-api D1.entities,
--      synced once a day from Hetzner. Keyed by entity_slug (the stable TEXT
--      identifier from D1, NOT D1's auto-increment INTEGER). Sigil-specific
--      metadata goes in entity_metadata JSONB on this row.
--   2. New supply chain entity tables (ssp / dsp / publisher / app_bundle /
--      exchange_seat) and relationship tables (sells_through / buys_through /
--      resells / owns_seat / claims_bundle). All entity references join to
--      tracker_entities by entity_slug.
--
-- Locked architectural decision (project_sigil.md, 2026-05-13): Shape B.
-- The D1 entity graph is authoritative; Sigil's joins live in Supabase so
-- trust scoring (P36) can use materialized views and cross-reference OAI IDs
-- natively. Re-syncs MUST NOT break downstream rows — string FK by slug
-- guarantees this.
--
-- Layers on top of:
--   - 001_initial_schema.sql .. 003_missing_tables.sql (Shadow Graph)
--   - 003a_shadow_graph_rls.sql
--   - 004_oai_registry.sql .. 006_oai_seed.sql (OAI v1.0)

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ 1. tracker_entities — mirror of D1.entities (one-way sync from Hetzner)   ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS tracker_entities (
  entity_slug      TEXT PRIMARY KEY,            -- stable string FK target
  name             TEXT NOT NULL,
  parent_company   TEXT,
  industry         TEXT NOT NULL DEFAULT 'unknown',
  data_categories  JSONB NOT NULL DEFAULT '[]'::JSONB,
  data_cost_usd    NUMERIC NOT NULL DEFAULT 0,
  description      TEXT,
  website          TEXT,
  sources          JSONB NOT NULL DEFAULT '[]'::JSONB,
  entity_metadata  JSONB NOT NULL DEFAULT '{}'::JSONB,  -- Sigil-specific; NOT in D1
  d1_id            INTEGER,                     -- D1 auto-increment, for cross-system trace
  d1_created_at    TIMESTAMPTZ,                 -- mirror of D1 row created_at
  d1_updated_at    TIMESTAMPTZ,                 -- mirror of D1 row updated_at
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracker_entities_industry ON tracker_entities(industry);
CREATE INDEX IF NOT EXISTS idx_tracker_entities_website  ON tracker_entities(website);
CREATE INDEX IF NOT EXISTS idx_tracker_entities_synced   ON tracker_entities(synced_at DESC);

COMMENT ON TABLE tracker_entities IS
  'One-way mirror of tunnelmind-data-api D1.entities. Synced daily from Hetzner cron via scripts/sync-entities-to-supabase.js. Downstream Sigil tables reference this by entity_slug.';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ 2a. Supply chain entity types (ssp / dsp / publisher / app_bundle / seat) ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS ssp (
  id                            BIGSERIAL PRIMARY KEY,
  entity_slug                   TEXT REFERENCES tracker_entities(entity_slug) ON DELETE SET NULL,
  name                          TEXT NOT NULL,
  domain                        TEXT NOT NULL UNIQUE,
  seller_id_patterns            JSONB NOT NULL DEFAULT '[]'::JSONB,
  known_reseller_relationships  JSONB NOT NULL DEFAULT '[]'::JSONB,
  mrc_accredited                BOOLEAN NOT NULL DEFAULT FALSE,
  mrc_accredited_date           DATE,
  integration_types             JSONB NOT NULL DEFAULT '[]'::JSONB,
    -- subset of: ['header_bidding','server_to_server','sdk','tag']
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ssp_entity_slug ON ssp(entity_slug);

CREATE TABLE IF NOT EXISTS dsp (
  id                BIGSERIAL PRIMARY KEY,
  entity_slug       TEXT REFERENCES tracker_entities(entity_slug) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  domain            TEXT NOT NULL UNIQUE,
  buying_patterns   JSONB NOT NULL DEFAULT '[]'::JSONB,
  self_serve        BOOLEAN NOT NULL DEFAULT TRUE,
  atap_compatible   BOOLEAN NOT NULL DEFAULT FALSE,
    -- Does this DSP integrate @tunnelmindai/atap? Used by P32 (media buyer profile).
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dsp_entity_slug ON dsp(entity_slug);
CREATE INDEX IF NOT EXISTS idx_dsp_atap_compatible ON dsp(atap_compatible) WHERE atap_compatible = TRUE;

CREATE TABLE IF NOT EXISTS publisher (
  id                       BIGSERIAL PRIMARY KEY,
  entity_slug              TEXT REFERENCES tracker_entities(entity_slug) ON DELETE SET NULL,
  domain                   TEXT NOT NULL UNIQUE,
  ads_txt_url              TEXT,
  app_ads_txt_url          TEXT,
  ads_txt_last_parsed      TIMESTAMPTZ,
  ads_txt_parse_status     TEXT,
    -- 'ok' | 'malformed' | 'unreachable' | 'blocked_robots' | 'not_found'
  ads_txt_entries          JSONB NOT NULL DEFAULT '[]'::JSONB,
  iab_category             TEXT,  -- IAB Content Taxonomy v3
  dns_verified             BOOLEAN NOT NULL DEFAULT FALSE,
  dns_verified_at          TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_publisher_entity_slug         ON publisher(entity_slug);
CREATE INDEX IF NOT EXISTS idx_publisher_ads_txt_last_parsed ON publisher(ads_txt_last_parsed);
CREATE INDEX IF NOT EXISTS idx_publisher_parse_status        ON publisher(ads_txt_parse_status);

CREATE TABLE IF NOT EXISTS app_bundle (
  id                     BIGSERIAL PRIMARY KEY,
  entity_slug            TEXT REFERENCES tracker_entities(entity_slug) ON DELETE SET NULL,
  bundle_id              TEXT NOT NULL,
  platform               TEXT NOT NULL CHECK (platform IN (
    'ios','android','ctv_roku','ctv_fire','ctv_samsung','ctv_lg','ctv_vizio','web'
  )),
  store_listing_url      TEXT,
  store_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  store_verified_at      TIMESTAMPTZ,
  developer_entity_slug  TEXT REFERENCES tracker_entities(entity_slug) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bundle_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_app_bundle_entity_slug     ON app_bundle(entity_slug);
CREATE INDEX IF NOT EXISTS idx_app_bundle_developer_slug  ON app_bundle(developer_entity_slug);
CREATE INDEX IF NOT EXISTS idx_app_bundle_platform        ON app_bundle(platform);

CREATE TABLE IF NOT EXISTS exchange_seat (
  id                   BIGSERIAL PRIMARY KEY,
  seat_id              TEXT NOT NULL,
  ssp_id               BIGINT NOT NULL REFERENCES ssp(id) ON DELETE CASCADE,
  owner_entity_slug    TEXT REFERENCES tracker_entities(entity_slug) ON DELETE SET NULL,
  activity_first_seen  TIMESTAMPTZ,
  activity_last_seen   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(seat_id, ssp_id)
);
CREATE INDEX IF NOT EXISTS idx_exchange_seat_owner_slug ON exchange_seat(owner_entity_slug);

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ 2b. Relationship tables                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS sells_through (
  id            BIGSERIAL PRIMARY KEY,
  publisher_id  BIGINT NOT NULL REFERENCES publisher(id) ON DELETE CASCADE,
  ssp_id        BIGINT NOT NULL REFERENCES ssp(id) ON DELETE CASCADE,
  seller_type   TEXT NOT NULL CHECK (seller_type IN ('direct','reseller')),
  seller_id     TEXT NOT NULL,
  observed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(publisher_id, ssp_id, seller_id)
);
CREATE INDEX IF NOT EXISTS idx_sells_through_publisher ON sells_through(publisher_id);
CREATE INDEX IF NOT EXISTS idx_sells_through_ssp       ON sells_through(ssp_id);

CREATE TABLE IF NOT EXISTS buys_through (
  id                  BIGSERIAL PRIMARY KEY,
  buyer_entity_slug   TEXT NOT NULL REFERENCES tracker_entities(entity_slug),
  dsp_id              BIGINT NOT NULL REFERENCES dsp(id) ON DELETE CASCADE,
  first_seen          TIMESTAMPTZ,
  last_seen           TIMESTAMPTZ,
  UNIQUE(buyer_entity_slug, dsp_id)
);
CREATE INDEX IF NOT EXISTS idx_buys_through_dsp ON buys_through(dsp_id);

CREATE TABLE IF NOT EXISTS resells (
  id              BIGSERIAL PRIMARY KEY,
  parent_ssp_id   BIGINT NOT NULL REFERENCES ssp(id) ON DELETE CASCADE,
  child_ssp_id    BIGINT NOT NULL REFERENCES ssp(id) ON DELETE CASCADE,
  seller_id       TEXT NOT NULL,
  observed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_ssp_id, child_ssp_id, seller_id),
  CHECK (parent_ssp_id <> child_ssp_id)
);
CREATE INDEX IF NOT EXISTS idx_resells_parent ON resells(parent_ssp_id);
CREATE INDEX IF NOT EXISTS idx_resells_child  ON resells(child_ssp_id);

CREATE TABLE IF NOT EXISTS owns_seat (
  id                  BIGSERIAL PRIMARY KEY,
  owner_entity_slug   TEXT NOT NULL REFERENCES tracker_entities(entity_slug),
  exchange_seat_id    BIGINT NOT NULL REFERENCES exchange_seat(id) ON DELETE CASCADE,
  first_seen          TIMESTAMPTZ,
  last_seen           TIMESTAMPTZ,
  UNIQUE(owner_entity_slug, exchange_seat_id)
);
CREATE INDEX IF NOT EXISTS idx_owns_seat_seat ON owns_seat(exchange_seat_id);

CREATE TABLE IF NOT EXISTS claims_bundle (
  id                    BIGSERIAL PRIMARY KEY,
  claimer_entity_slug   TEXT NOT NULL REFERENCES tracker_entities(entity_slug),
  app_bundle_id         BIGINT NOT NULL REFERENCES app_bundle(id) ON DELETE CASCADE,
  verified              BOOLEAN NOT NULL DEFAULT FALSE,
  observed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(claimer_entity_slug, app_bundle_id)
);
CREATE INDEX IF NOT EXISTS idx_claims_bundle_bundle ON claims_bundle(app_bundle_id);

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ 3. updated_at trigger (shared)                                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION touch_updated_at_p29()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ssp_touch_updated_at
  BEFORE UPDATE ON ssp FOR EACH ROW EXECUTE FUNCTION touch_updated_at_p29();
CREATE TRIGGER trg_dsp_touch_updated_at
  BEFORE UPDATE ON dsp FOR EACH ROW EXECUTE FUNCTION touch_updated_at_p29();
CREATE TRIGGER trg_publisher_touch_updated_at
  BEFORE UPDATE ON publisher FOR EACH ROW EXECUTE FUNCTION touch_updated_at_p29();
CREATE TRIGGER trg_app_bundle_touch_updated_at
  BEFORE UPDATE ON app_bundle FOR EACH ROW EXECUTE FUNCTION touch_updated_at_p29();
CREATE TRIGGER trg_exchange_seat_touch_updated_at
  BEFORE UPDATE ON exchange_seat FOR EACH ROW EXECUTE FUNCTION touch_updated_at_p29();

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ 4. Row Level Security                                                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
--
-- All tables RLS-enabled with no policies — service-role only access until
-- P36 (trust scoring) is built and we decide what's publicly readable. Service
-- role bypasses RLS. anon/authenticated roles get nothing. This mirrors the
-- pattern used by 005c_oai_security_hardening.sql for OAI internal tables.

ALTER TABLE tracker_entities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssp               ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsp               ENABLE ROW LEVEL SECURITY;
ALTER TABLE publisher         ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_bundle        ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_seat     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sells_through     ENABLE ROW LEVEL SECURITY;
ALTER TABLE buys_through      ENABLE ROW LEVEL SECURITY;
ALTER TABLE resells           ENABLE ROW LEVEL SECURITY;
ALTER TABLE owns_seat         ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims_bundle     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON tracker_entities, ssp, dsp, publisher, app_bundle, exchange_seat,
              sells_through, buys_through, resells, owns_seat, claims_bundle
       FROM anon, authenticated;

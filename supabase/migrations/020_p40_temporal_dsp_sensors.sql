-- Migration 020: P40 Phase 2 — temporal fields, dsp extension, sensor contract.
-- Purely additive. No DROP/RENAME/retype. Safe to re-run (IF NOT EXISTS guards).
--
-- Drift correction vs. the original P40 plan (verified 2026-06-01, P40 Phase 1):
--   * Plan said "migration 014" — schema was already at 019. This is 020.
--   * Plan's ip_observations temporal ALTER is DROPPED: there is no
--     ip_observations table in this Supabase. Those fields live in
--     scry-server.actors (first_seen_ms/last_seen_ms/observation_count) and
--     are served by api.tunnelmind.ai/v1/check. /v1/profile (Phase 5) will
--     CALL Scry rather than duplicate the column (feedback_eat_own_dogfood).
--   * Plan's "CREATE TABLE dsp (0 rows)" is an ALTER: dsp exists since
--     migration 007 (BIGSERIAL pk, FK from buys_through, updated_at trigger,
--     RLS, 33 rows). All existing consumers select explicit columns.
--   * Plan's sensor_registry is folded into the existing oai_sensors table
--     (004b) per Josh's call 2026-06-01 — no parallel registry. oai_sensors
--     is public-read, so sensor IP is deliberately NOT stored here.

-- ── (a) tracker_entities temporal ──────────────────────────────────────────
-- Populated by Phase 4.1 DDG Tracker Radar merge.
ALTER TABLE tracker_entities
  ADD COLUMN IF NOT EXISTS first_seen timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen  timestamptz;

-- ── (b) dsp demand-side enrichment (Sigil) ─────────────────────────────────
ALTER TABLE dsp
  ADD COLUMN IF NOT EXISTS seller_id          text,
  ADD COLUMN IF NOT EXISTS seller_type        text,    -- NETWORK | PUBLISHER | BOTH
  ADD COLUMN IF NOT EXISTS relationship       text,    -- DIRECT | RESELLER
  ADD COLUMN IF NOT EXISTS sellers_json_url   text,
  ADD COLUMN IF NOT EXISTS ads_txt_authorized boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trust_score        numeric(4,3),
  ADD COLUMN IF NOT EXISTS atap_witness_count integer DEFAULT 0;

-- ── (c) Extend oai_sensors with the Familiar fleet contract fields ─────────
-- attestation_tier is bounded; a software-tier sensor cannot emit silicon_root
-- observations (enforced at ingest, ADR-2026-06-P40). NO ip_address column:
-- oai_sensors RLS is public-read by design (004b), and exposing honeypot
-- sensor IPs would let adversaries enumerate and avoid the fleet.
ALTER TABLE oai_sensors
  ADD COLUMN IF NOT EXISTS attestation_tier text NOT NULL DEFAULT 'self_asserted'
        CHECK (attestation_tier IN ('self_asserted','software','tee_tpm','silicon_root')),
  ADD COLUMN IF NOT EXISTS node_type    text NOT NULL DEFAULT 'familiar', -- only 'familiar' exists today; open for future node classes (no CHECK by design)
  ADD COLUMN IF NOT EXISTS asn          text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Bootstrap: the existing minted Hetzner Familiar nodes are software-tier.
UPDATE oai_sensors SET attestation_tier = 'software' WHERE attestation_tier = 'self_asserted';

-- ── (d) sensor_observations — what sensors see and report ──────────────────
-- FK to oai_sensors(sensor_id TEXT). payload_hash only, never raw payload.
CREATE TABLE IF NOT EXISTS sensor_observations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id        text NOT NULL REFERENCES oai_sensors(sensor_id),
  observed_ip      inet NOT NULL,
  observation_type text NOT NULL
        CHECK (observation_type IN ('port_scan','brute_force','c2_beacon','ad_fraud_signal','honeypot_probe')),
  protocol         text,
  port             integer,
  payload_hash     text,
  confidence       numeric(4,3),
  receipt          jsonb,
  observed_at      timestamptz NOT NULL DEFAULT now(),
  ingested_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensor_obs_ip     ON sensor_observations(observed_ip);
CREATE INDEX IF NOT EXISTS idx_sensor_obs_type   ON sensor_observations(observation_type);
CREATE INDEX IF NOT EXISTS idx_sensor_obs_sensor ON sensor_observations(sensor_id);

ALTER TABLE sensor_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sensor_obs_public_read ON sensor_observations;
CREATE POLICY sensor_obs_public_read ON sensor_observations
  FOR SELECT TO anon, authenticated USING (true);
-- No INSERT/UPDATE/DELETE policies → writes via service-role only (P28 flow).

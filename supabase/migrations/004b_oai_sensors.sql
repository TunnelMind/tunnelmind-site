-- Migration 004b: OAI sensors — separate registry for attested observation sensors
-- Per P26 Gap 4 (2026-05-12). Sensor IDs: OAI-SENSOR-{cc}-{seq} where cc is
-- lowercase ISO 3166-1 alpha-2 and seq is 3-digit zero-padded.
--
-- Sensors are kept OUT of oai_registry so the entity-ID regex stays clean.
-- Per the standard: retired sensors retain their ID and remain resolvable;
-- their pubkey is no longer accepted on new observations.
-- Sequence is per-country, never reissued, never reused across sensors.

CREATE TABLE IF NOT EXISTS oai_sensors (
  sensor_id      TEXT PRIMARY KEY
                 CHECK (sensor_id ~ '^OAI-SENSOR-[a-z]{2}-\d{3}$'),
  country        TEXT NOT NULL CHECK (country ~ '^[a-z]{2}$'),
  operator       TEXT NOT NULL CHECK (length(trim(operator)) > 0),
  pubkey_ed25519 TEXT NOT NULL CHECK (length(pubkey_ed25519) BETWEEN 32 AND 256),
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','retired')),
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS oai_sensors_country_idx ON oai_sensors (country);

-- ── Consistency: retired_at iff status = 'retired' ────────────────
-- Mirrors the oai_superseded_consistency CHECK on oai_registry. Same
-- foot-gun pattern (marked retired but no timestamp, or active with a
-- stale timestamp); same guard. A status flip MUST set retired_at in
-- the same UPDATE.

ALTER TABLE oai_sensors
  DROP CONSTRAINT IF EXISTS oai_sensors_retired_consistency;

ALTER TABLE oai_sensors
  ADD CONSTRAINT oai_sensors_retired_consistency CHECK (
    (status = 'retired'  AND retired_at IS NOT NULL) OR
    (status = 'active'   AND retired_at IS NULL)
  );

-- ── RLS ───────────────────────────────────────────────────────────
-- Public read on all rows is BY DESIGN, not a leak:
--   * pubkey_ed25519 must be public so anyone verifying a signed
--     observation can fetch the verifying key.
--   * operator must be public because attested sensors are not
--     anonymous; the transparency model requires operator identity
--     to be discoverable. Operators wanting pseudonymity register
--     under a pseudonymous handle here.
--   * country, status, registered_at, retired_at are all low-
--     sensitivity metadata.
-- The resolver itself reads via service_role (RLS bypass); this
-- policy is the defense-in-depth path for anon REST callers.

ALTER TABLE oai_sensors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oai_sensors_public_read ON oai_sensors;

CREATE POLICY oai_sensors_public_read ON oai_sensors
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies → anon/authenticated cannot write.
-- Sensor registration happens via a service-role flow (P28).

-- Migration 004: OAI registry — entity table for Observed Actor Identifiers
-- Per P26 spec (gap closure 2026-05-12). Canonical IDs: OAI-YYYY-NNNNNNN.
-- Public read on active + deprecated only; writes via service role through issue_oai().

CREATE TABLE IF NOT EXISTS oai_registry (
  oai_id               TEXT PRIMARY KEY
                       CHECK (oai_id ~ '^OAI-\d{4}-\d{7}$'),
  aliases              TEXT[] NOT NULL DEFAULT '{}',
  record               JSONB NOT NULL,
  status               TEXT NOT NULL
                       CHECK (status IN ('active','deprecated','superseded','reserved')),
  superseded_by        TEXT REFERENCES oai_registry(oai_id),
  issued_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  attestation_log_root TEXT
);

CREATE INDEX IF NOT EXISTS oai_registry_aliases_gin ON oai_registry USING GIN (aliases);
CREATE INDEX IF NOT EXISTS oai_registry_status_idx  ON oai_registry (status);

-- ── Consistency constraints ───────────────────────────────────────

ALTER TABLE oai_registry
  DROP CONSTRAINT IF EXISTS oai_superseded_consistency;

ALTER TABLE oai_registry
  ADD CONSTRAINT oai_superseded_consistency CHECK (
    (status =  'superseded' AND superseded_by IS NOT NULL) OR
    (status <> 'superseded' AND superseded_by IS NULL)
  );

-- The embedded JSON-LD payload's id/status must match the row's columns.
-- Without this the canonical row and the served payload can drift.
ALTER TABLE oai_registry
  DROP CONSTRAINT IF EXISTS oai_registry_record_consistency;

ALTER TABLE oai_registry
  ADD CONSTRAINT oai_registry_record_consistency CHECK (
    record ? 'id' AND record->>'id' = oai_id
    AND record ? 'status' AND record->>'status' = status
  );

-- ── Alias format trigger ──────────────────────────────────────────
-- Every alias must match the lowercase `oai:slug` form defined in the
-- standard. CHECK can't iterate an array, so this lives in a trigger.

CREATE OR REPLACE FUNCTION oai_validate_aliases()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  a TEXT;
BEGIN
  IF NEW.aliases IS NULL OR array_length(NEW.aliases, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  FOREACH a IN ARRAY NEW.aliases LOOP
    IF a !~ '^oai:[a-z0-9][a-z0-9_-]*$' THEN
      RAISE EXCEPTION 'oai_registry: invalid alias %: must match oai:[a-z0-9][a-z0-9_-]*', a;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS oai_registry_validate_aliases ON oai_registry;

CREATE TRIGGER oai_registry_validate_aliases
  BEFORE INSERT OR UPDATE ON oai_registry
  FOR EACH ROW EXECUTE FUNCTION oai_validate_aliases();

-- ── updated_at trigger ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS oai_registry_touch_updated_at ON oai_registry;

CREATE TRIGGER oai_registry_touch_updated_at
  BEFORE UPDATE ON oai_registry
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────
-- Public read on active + deprecated only. Reserved and superseded are
-- not returned to anon callers: reservation state must not leak (admin-
-- only); superseded callers should follow the 303 from the resolver to
-- the supersession target rather than fetch the stale record directly.

ALTER TABLE oai_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oai_registry_public_read ON oai_registry;

CREATE POLICY oai_registry_public_read ON oai_registry
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('active','deprecated'));

-- No INSERT/UPDATE/DELETE policies → anon/authenticated cannot write.
-- All writes go through service_role, and the canonical issuance path
-- is issue_oai() in migration 005.

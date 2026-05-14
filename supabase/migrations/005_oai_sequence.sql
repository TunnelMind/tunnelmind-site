-- Migration 005: OAI sequence + atomic issuance function + issuance audit log
-- Per P26 Phase 2 spec. The ONLY write path into oai_registry's oai_id space
-- is issue_oai() — atomic UPSERT-with-increment on (year, last_seq) plus an
-- append-only audit insert recording the category of every issuance.
--
-- `category` is required and is the field downstream tooling will use to
-- bucket issuance for governance metrics (e.g. "zero canonical IDs repointed"
-- maturity gate in the OAI Standard, Section 12).

CREATE TABLE IF NOT EXISTS oai_sequence (
  year      INTEGER PRIMARY KEY,
  last_seq  BIGINT  NOT NULL DEFAULT 0 CHECK (last_seq >= 0)
);

-- ── Issuance audit log (append-only) ──────────────────────────────
-- Every call to issue_oai() inserts one row here. This is the canonical
-- record of "who issued what, when, under which category." Append-only by
-- trigger; service_role only by RLS.

CREATE TABLE IF NOT EXISTS oai_issuance_log (
  oai_id     TEXT PRIMARY KEY
             CHECK (oai_id ~ '^OAI-\d{4}-\d{7}$'),
  category   TEXT NOT NULL CHECK (length(trim(category)) > 0),
  issued_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS oai_issuance_log_category_idx  ON oai_issuance_log (category);
CREATE INDEX IF NOT EXISTS oai_issuance_log_issued_at_idx ON oai_issuance_log (issued_at);

-- Append-only enforcement: reject UPDATE and DELETE on the audit log.
CREATE OR REPLACE FUNCTION oai_reject_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'oai_issuance_log is append-only';
END $$;

DROP TRIGGER IF EXISTS oai_issuance_log_no_update ON oai_issuance_log;
DROP TRIGGER IF EXISTS oai_issuance_log_no_delete ON oai_issuance_log;

CREATE TRIGGER oai_issuance_log_no_update
  BEFORE UPDATE ON oai_issuance_log
  FOR EACH ROW EXECUTE FUNCTION oai_reject_modification();

CREATE TRIGGER oai_issuance_log_no_delete
  BEFORE DELETE ON oai_issuance_log
  FOR EACH ROW EXECUTE FUNCTION oai_reject_modification();

-- ── Issuance function ─────────────────────────────────────────────
-- Atomic: bumps the sequence, formats the canonical ID, records the
-- issuance, and returns the new ID. If any step fails the whole call
-- rolls back — no "burned" sequence numbers.

CREATE OR REPLACE FUNCTION issue_oai(category TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
BEGIN
  IF category IS NULL OR length(trim(category)) = 0 THEN
    RAISE EXCEPTION 'issue_oai: category is required';
  END IF;

  WITH bumped AS (
    INSERT INTO oai_sequence (year, last_seq)
    VALUES (EXTRACT(YEAR FROM now())::INTEGER, 1)
    ON CONFLICT (year) DO UPDATE
      SET last_seq = oai_sequence.last_seq + 1
    RETURNING year, last_seq
  )
  SELECT format('OAI-%s-%s', year, lpad(last_seq::TEXT, 7, '0'))
    INTO new_id
    FROM bumped;

  INSERT INTO oai_issuance_log (oai_id, category, issued_by)
  VALUES (new_id, trim(category), current_user);

  RETURN new_id;
END $$;

-- ── Permissions: service_role only ────────────────────────────────
-- The issuance function must never be callable from the client.

REVOKE ALL ON FUNCTION issue_oai(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION issue_oai(TEXT) TO service_role;

-- Sequence and audit log: no public access at all.
ALTER TABLE oai_sequence      ENABLE ROW LEVEL SECURITY;
ALTER TABLE oai_issuance_log  ENABLE ROW LEVEL SECURITY;
-- No policies defined on either → anon/authenticated cannot read or write.
-- service_role bypasses RLS for both. The append-only trigger applies even
-- to service_role: the audit log truly cannot be rewritten.

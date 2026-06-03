-- Migration 022: P46 — adversary classification layer + attribution-cartel seed
--
-- See docs/decisions/ADR-2026-06-P46-attribution-cartel.md and the Claude Memory
-- note project_p45_p49_adversary_track.
--
-- ── DISCOVERY that reshaped this migration (2026-06-02) ───────────────────
-- The original draft tried to *register* Google/Meta/Amazon/Microsoft as new
-- OAIs. Smoke-testing revealed they ALREADY EXIST as reserved entries from the
-- 006 seed (oai:google=OAI-2026-0000006, oai:amazon=…0011, oai:microsoft=…0017,
-- oai:meta=…0031), categorized tracker.pixel.* . Creating second OAIs for the
-- same alias would fork canonical identity (forbidden). Overwriting their
-- `category` to a fake "surveillance.*" value would be destructive AND the v1
-- record schema (005b) is frozen `additionalProperties:false`, so no new field
-- can be added either.
--
-- Resolution: adversary classification is a TunnelMind *editorial judgment*
-- layered ON TOP of canonical OAI identity — not a mutation of it. This migration
-- adds an additive `oai_adversary_class` table that maps an existing OAI to one
-- of the three adversary classes, with a recorded rationale. The P49 cross-lens
-- classifier joins this table. Generalizes to all three classes
-- (human_hacker / rogue_agent / surveillance_bigtech).
--
-- ── "publicly active", honestly ──────────────────────────────────────────
-- Josh chose the cartel classification be publicly visible. The blocker on the
-- registry side was: oai_registry.status='active' ⇒ a real ed25519 SENSOR
-- attestation we cannot produce in SQL. That requirement does NOT apply here:
-- this table is a curation judgment, not a sensor observation. So it is
-- public-read NOW (anon SELECT) and asserts the classification immediately —
-- with zero fabricated signatures. The underlying oai_registry rows stay
-- 'reserved'; promoting THEM to 'active' remains a separate, gated step if/when
-- a curated-authority attestation exists (ADR §5.1). Non-destructive, reversible
-- (DROP TABLE).

-- ── Adversary-class layer ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS oai_adversary_class (
  oai_id          TEXT PRIMARY KEY REFERENCES oai_registry(oai_id),
  adversary_class TEXT NOT NULL
                  CHECK (adversary_class IN ('human_hacker','rogue_agent','surveillance_bigtech')),
  rationale       TEXT NOT NULL CHECK (length(trim(rationale)) > 0),
  classified_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  classified_by   TEXT NOT NULL DEFAULT 'tunnelmind-curation'
);

CREATE INDEX IF NOT EXISTS oai_adversary_class_class_idx
  ON oai_adversary_class (adversary_class);

-- Public read (the classification IS the product surface); writes service-role only.
ALTER TABLE oai_adversary_class ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oai_adversary_class_public_read ON oai_adversary_class;
CREATE POLICY oai_adversary_class_public_read ON oai_adversary_class
  FOR SELECT TO anon, authenticated USING (true);
-- No INSERT/UPDATE/DELETE policy → only service_role can write.

-- ── Seed: the attribution cartel (Josh-locked 2026-06-02) ─────────────────
-- Joins the EXISTING seed OAIs by alias — no new identities issued, no category
-- overwritten. Idempotent via ON CONFLICT.

INSERT INTO oai_adversary_class (oai_id, adversary_class, rationale)
SELECT
  r.oai_id,
  'surveillance_bigtech',
  format(
    'Attribution-cartel member (%s): operates ad/identity-attribution surveillance at scale; on the TunnelMind no-big-tech prohibited-vendor list. P46.',
    r.record->>'name'
  )
FROM oai_registry r
WHERE r.aliases && ARRAY['oai:google','oai:meta','oai:amazon','oai:microsoft']::text[]
ON CONFLICT (oai_id) DO NOTHING;

-- Migration 003: Add missing transmission/voting tables
-- (contributors, score_weights, payout tables already applied)

CREATE TABLE IF NOT EXISTS transmissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  section_key TEXT,
  title TEXT,
  origin_asn TEXT,
  classification TEXT,
  node_location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transmission_id UUID REFERENCES transmissions(id) ON DELETE CASCADE,
  sentence_key TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  is_redacted BOOLEAN DEFAULT false,
  redaction_threshold INTEGER DEFAULT 5,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sentence_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence_id UUID REFERENCES sentences(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  direction SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sentence_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence_id UUID REFERENCES sentences(id) ON DELETE CASCADE,
  proposed_text TEXT NOT NULL,
  contributor_handle TEXT,
  contributor_fingerprint TEXT NOT NULL,
  is_applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS correction_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correction_id UUID REFERENCES corrections(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  direction SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(correction_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence_id UUID REFERENCES sentences(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES annotations(id),
  content TEXT NOT NULL,
  contributor_handle TEXT,
  contributor_fingerprint TEXT NOT NULL,
  is_author BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS annotation_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  direction SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(annotation_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS redaction_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence_id UUID REFERENCES sentences(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sentence_id, fingerprint)
);

CREATE OR REPLACE VIEW sentence_net_scores AS
SELECT
  sentence_id,
  COALESCE(SUM(direction), 0) AS net_score,
  COUNT(*) AS total_votes
FROM sentence_votes
GROUP BY sentence_id;

CREATE OR REPLACE VIEW correction_net_scores AS
SELECT
  correction_id,
  COALESCE(SUM(direction), 0) AS net_score,
  COUNT(*) AS total_votes
FROM correction_votes
GROUP BY correction_id;

CREATE OR REPLACE VIEW redaction_progress AS
SELECT
  s.id AS sentence_id,
  s.redaction_threshold,
  COUNT(rv.id) AS current_votes,
  COUNT(rv.id) >= s.redaction_threshold AS is_declassified
FROM sentences s
LEFT JOIN redaction_votes rv ON rv.sentence_id = s.id
WHERE s.is_redacted = true
GROUP BY s.id, s.redaction_threshold;

CREATE OR REPLACE FUNCTION check_vote_rate_limit(fp TEXT)
RETURNS BOOLEAN AS $$
  SELECT (
    (SELECT COUNT(*) FROM sentence_votes WHERE fingerprint = fp AND created_at > now() - interval '1 hour') +
    (SELECT COUNT(*) FROM correction_votes WHERE fingerprint = fp AND created_at > now() - interval '1 hour')
  ) < 30;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_annotation_rate_limit(fp TEXT)
RETURNS BOOLEAN AS $$
  SELECT COUNT(*) < 10
  FROM annotations
  WHERE contributor_fingerprint = fp
  AND created_at > now() - interval '1 day';
$$ LANGUAGE sql SECURITY DEFINER;

DROP FUNCTION IF EXISTS refresh_contributor_scores() CASCADE;
CREATE OR REPLACE FUNCTION refresh_contributor_scores()
RETURNS VOID AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY contributor_scores;
$$ LANGUAGE sql SECURITY DEFINER;

-- TunnelMind Community Platform — Initial Schema
-- Phase 2: Run this after connecting Supabase project

-- ── Core Tables ───────────────────────────────────────────────────

CREATE TABLE transmissions (
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

CREATE TABLE sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transmission_id UUID REFERENCES transmissions(id) ON DELETE CASCADE,
  -- Phase 1 compatibility: store the string key used in frontend
  sentence_key TEXT NOT NULL UNIQUE, -- e.g. 'transmission-001-p1-s1'
  content TEXT NOT NULL,
  is_redacted BOOLEAN DEFAULT false,
  redaction_threshold INTEGER DEFAULT 5,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sentence_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence_id UUID REFERENCES sentences(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  direction SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sentence_id, fingerprint)
);

CREATE TABLE corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence_id UUID REFERENCES sentences(id) ON DELETE CASCADE,
  proposed_text TEXT NOT NULL,
  contributor_handle TEXT,
  contributor_fingerprint TEXT NOT NULL,
  is_applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE correction_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correction_id UUID REFERENCES corrections(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  direction SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(correction_id, fingerprint)
);

CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence_id UUID REFERENCES sentences(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES annotations(id),
  content TEXT NOT NULL,
  contributor_handle TEXT,
  contributor_fingerprint TEXT NOT NULL,
  is_author BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE annotation_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  direction SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(annotation_id, fingerprint)
);

CREATE TABLE contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  fingerprint TEXT NOT NULL,
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  -- Future payment fields (commented out until compensation launches):
  -- wallet_address TEXT,
  -- payment_method TEXT,
  -- payout_currency TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- APPEND-ONLY contribution ledger — source of truth for future payments
CREATE TABLE contribution_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID REFERENCES contributors(id),
  contributor_fingerprint TEXT, -- for anonymous contributors
  action_type TEXT NOT NULL,
  target_id UUID,
  target_type TEXT,
  points INTEGER NOT NULL,
  page TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Configurable score weights (not hardcoded)
CREATE TABLE score_weights (
  action_type TEXT PRIMARY KEY,
  weight INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Separate redaction vote table (different semantics from sentence votes)
CREATE TABLE redaction_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence_id UUID REFERENCES sentences(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sentence_id, fingerprint)
);

-- ── Views ──────────────────────────────────────────────────────────

CREATE VIEW sentence_net_scores AS
SELECT
  sentence_id,
  COALESCE(SUM(direction), 0) AS net_score,
  COUNT(*) AS total_votes
FROM sentence_votes
GROUP BY sentence_id;

CREATE VIEW correction_net_scores AS
SELECT
  correction_id,
  COALESCE(SUM(direction), 0) AS net_score,
  COUNT(*) AS total_votes
FROM correction_votes
GROUP BY correction_id;

CREATE VIEW redaction_progress AS
SELECT
  s.id AS sentence_id,
  s.redaction_threshold,
  COUNT(rv.id) AS current_votes,
  COUNT(rv.id) >= s.redaction_threshold AS is_declassified
FROM sentences s
LEFT JOIN redaction_votes rv ON rv.sentence_id = s.id
WHERE s.is_redacted = true
GROUP BY s.id, s.redaction_threshold;

-- Materialized view for contributor scores (refresh periodically)
CREATE MATERIALIZED VIEW contributor_scores AS
SELECT
  COALESCE(c.id::TEXT, cl.contributor_fingerprint) AS contributor_ref,
  c.handle,
  COALESCE(SUM(cl.points), 0) AS total_score,
  COUNT(DISTINCT cl.id) AS total_actions,
  MAX(cl.created_at) AS last_action
FROM contribution_ledger cl
LEFT JOIN contributors c ON c.id = cl.contributor_id
GROUP BY COALESCE(c.id::TEXT, cl.contributor_fingerprint), c.handle
ORDER BY total_score DESC;

-- ── RLS Functions ─────────────────────────────────────────────────

-- Rate limit: max 30 votes per hour per fingerprint
CREATE OR REPLACE FUNCTION check_vote_rate_limit(fp TEXT)
RETURNS BOOLEAN AS $$
  SELECT (
    (SELECT COUNT(*) FROM sentence_votes WHERE fingerprint = fp AND created_at > now() - interval '1 hour') +
    (SELECT COUNT(*) FROM correction_votes WHERE fingerprint = fp AND created_at > now() - interval '1 hour')
  ) < 30;
$$ LANGUAGE sql SECURITY DEFINER;

-- Rate limit: max 10 annotations per day without email verification
CREATE OR REPLACE FUNCTION check_annotation_rate_limit(fp TEXT)
RETURNS BOOLEAN AS $$
  SELECT COUNT(*) < 10
  FROM annotations
  WHERE contributor_fingerprint = fp
  AND created_at > now() - interval '1 day';
$$ LANGUAGE sql SECURITY DEFINER;

-- Refresh materialized view (called by a scheduled function)
CREATE OR REPLACE FUNCTION refresh_contributor_scores()
RETURNS VOID AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY contributor_scores;
$$ LANGUAGE sql SECURITY DEFINER;

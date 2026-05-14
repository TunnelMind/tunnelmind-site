-- Migration 003a: Add RLS to Shadow Graph tables introduced by 003.
-- The advisor flagged these 8 tables as fully exposed to anon and
-- authenticated roles — anyone with the anon key could UPDATE or DELETE
-- arbitrary rows. This migration enables RLS with a conservative posture:
--
-- * Curated content (transmissions, sentences): public read only.
--   Writes happen via service_role (admin tooling).
-- * User contributions (votes, corrections, annotations): public read,
--   public insert. Existing rate-limit helpers in 001_initial_schema.sql
--   remain authoritative (SECURITY DEFINER, so they keep working under RLS).
-- * UPDATE/DELETE on all 8 tables is service_role only — no policy
--   defined for anon/authenticated, so RLS denies by default.

ALTER TABLE public.transmissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transmissions_public_read ON public.transmissions;
CREATE POLICY transmissions_public_read ON public.transmissions
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.sentences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sentences_public_read ON public.sentences;
CREATE POLICY sentences_public_read ON public.sentences
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.sentence_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sentence_votes_public_read ON public.sentence_votes;
DROP POLICY IF EXISTS sentence_votes_anon_insert ON public.sentence_votes;
CREATE POLICY sentence_votes_public_read ON public.sentence_votes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY sentence_votes_anon_insert ON public.sentence_votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (fingerprint IS NOT NULL AND length(trim(fingerprint)) > 0);

ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS corrections_public_read ON public.corrections;
DROP POLICY IF EXISTS corrections_anon_insert ON public.corrections;
CREATE POLICY corrections_public_read ON public.corrections
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY corrections_anon_insert ON public.corrections
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    contributor_fingerprint IS NOT NULL
    AND length(trim(contributor_fingerprint)) > 0
    AND is_applied = false
  );

ALTER TABLE public.correction_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS correction_votes_public_read ON public.correction_votes;
DROP POLICY IF EXISTS correction_votes_anon_insert ON public.correction_votes;
CREATE POLICY correction_votes_public_read ON public.correction_votes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY correction_votes_anon_insert ON public.correction_votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (fingerprint IS NOT NULL AND length(trim(fingerprint)) > 0);

ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS annotations_public_read ON public.annotations;
DROP POLICY IF EXISTS annotations_anon_insert ON public.annotations;
CREATE POLICY annotations_public_read ON public.annotations
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY annotations_anon_insert ON public.annotations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    contributor_fingerprint IS NOT NULL
    AND length(trim(contributor_fingerprint)) > 0
    AND is_author = false
  );

ALTER TABLE public.annotation_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS annotation_votes_public_read ON public.annotation_votes;
DROP POLICY IF EXISTS annotation_votes_anon_insert ON public.annotation_votes;
CREATE POLICY annotation_votes_public_read ON public.annotation_votes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY annotation_votes_anon_insert ON public.annotation_votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (fingerprint IS NOT NULL AND length(trim(fingerprint)) > 0);

ALTER TABLE public.redaction_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS redaction_votes_public_read ON public.redaction_votes;
DROP POLICY IF EXISTS redaction_votes_anon_insert ON public.redaction_votes;
CREATE POLICY redaction_votes_public_read ON public.redaction_votes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY redaction_votes_anon_insert ON public.redaction_votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (fingerprint IS NOT NULL AND length(trim(fingerprint)) > 0);

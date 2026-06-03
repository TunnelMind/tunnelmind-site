-- 026_p49_adversary_curated_lookup.sql — P49.
--
-- Resolve a verify node (domain or entity_slug) to a curated adversary class via
-- the oai_adversary_class table (migration 022). This is the AUTHORITATIVE anchor
-- the P49 cross-lens classifier joins: it maps a node to one of the three
-- adversary classes by editorial curation layered on top of canonical OAI
-- identity (never a mutation of it — see ADR-2026-06-P46).
--
-- Two precise match paths (no fuzzy name matching — would manufacture hits):
--   domain  — the node domain equals, or is a subdomain of, any domain in the
--             classified OAI's record.domains[] (e.g. analytics.google.com →
--             Google → surveillance_bigtech). Subdomain match via LIKE '%.'||elem.
--   entity  — the node entity_slug's canonical OAI alias `oai:{slug}` is present
--             in the classified OAI's aliases[] (e.g. google → oai:google).
--
-- Returns the matched class(es) with the OAI id, the matched name, HOW it matched
-- (audit trail for the receipt evidence), and the curation rationale. Aggregate /
-- bounded; oai_adversary_class is tiny. SECURITY DEFINER + service-role-only,
-- matching the P47/P48 signal functions.
--
-- Additive + non-destructive. Apply via PAT REST (reference_supabase_pat_ddl_escape).

CREATE OR REPLACE FUNCTION public.adversary_curated_lookup(
  p_domain      text DEFAULT NULL,
  p_entity_slug text DEFAULT NULL
)
RETURNS TABLE (
  oai_id          text,
  adversary_class text,
  matched_name    text,
  matched_via     text,
  rationale       text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- domain → record.domains[] membership (exact or subdomain)
  SELECT DISTINCT ON (ac.oai_id)
         ac.oai_id,
         ac.adversary_class,
         r.record->>'name'           AS matched_name,
         'domain:' || elem           AS matched_via,
         ac.rationale
    FROM oai_adversary_class ac
    JOIN oai_registry r ON r.oai_id = ac.oai_id
    CROSS JOIN LATERAL jsonb_array_elements_text(
      COALESCE(r.record->'domains', '[]'::jsonb)) AS elem
   WHERE p_domain IS NOT NULL
     AND ( lower(p_domain) = lower(elem)
        OR lower(p_domain) LIKE '%.' || lower(elem) )

  UNION

  -- entity_slug → canonical alias oai:{slug} present in aliases[]
  SELECT ac.oai_id,
         ac.adversary_class,
         r.record->>'name'                  AS matched_name,
         'alias:oai:' || lower(p_entity_slug) AS matched_via,
         ac.rationale
    FROM oai_adversary_class ac
    JOIN oai_registry r ON r.oai_id = ac.oai_id
   WHERE p_entity_slug IS NOT NULL
     AND r.aliases && ARRAY['oai:' || lower(p_entity_slug)]::text[]

  LIMIT 8;
$$;

COMMENT ON FUNCTION public.adversary_curated_lookup(text, text) IS
  'P49 — resolve a verify node (domain via record.domains[] subdomain match, or entity_slug via oai:{slug} alias) to its curated adversary class from oai_adversary_class. Authoritative editorial anchor for the cross-lens classifier. See ADR-2026-06-P49.';

-- Least privilege: service role only (the Worker's service key).
REVOKE ALL ON FUNCTION public.adversary_curated_lookup(text, text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.adversary_curated_lookup(text, text) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.adversary_curated_lookup(text, text) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.adversary_curated_lookup(text, text) TO service_role';
  END IF;
END $$;

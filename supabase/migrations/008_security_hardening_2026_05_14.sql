-- 008_security_hardening_2026_05_14.sql
-- Address Supabase advisor lints surfaced 2026-05-14 after P29/P30a ship:
--   * 3 of 4 security_definer_view ERRORs (Shadow Graph aggregate views)
--   * 4 pg_graphql_*_table_exposed WARNs (oai_registry + oai_sensors)

-- (1) Shadow Graph aggregate views: flip SECURITY DEFINER -> SECURITY INVOKER.
-- All three read from tables that already have *_public_read RLS policies
-- (correction_votes, sentence_votes, redaction_votes, sentences), so the
-- aggregates remain functionally identical for callers but RLS is now
-- honored properly per the Supabase database-linter recommendation.
ALTER VIEW public.correction_net_scores SET (security_invoker = on);
ALTER VIEW public.sentence_net_scores  SET (security_invoker = on);
ALTER VIEW public.redaction_progress   SET (security_invoker = on);

-- proposal_scores is intentionally left as SECURITY DEFINER for now.
-- It depends on proposal_votes, which has an own-only RLS policy
-- (proposal_votes_read_own). Switching to INVOKER would limit the aggregate
-- to the caller's own vote, breaking the score display. Shadow Graph
-- proposal flow is being deprecated as part of the P25 pivot; the view
-- will be dropped or replaced (likely a SECURITY DEFINER function) during
-- pivot cleanup.

-- (2) Revoke anon + authenticated direct access to OAI registry tables.
-- The OAI v1 standard is consumed via the Cloudflare Worker resolver at
-- /id/{OAI}, which authenticates with the service-role JWT. Direct
-- PostgREST / pg_graphql access from anon or authenticated was never a
-- documented client path. service_role retains full SELECT.
REVOKE SELECT ON public.oai_registry FROM anon, authenticated;
REVOKE SELECT ON public.oai_sensors  FROM anon, authenticated;

-- 033_security_rls_lockdown.sql — Supabase security-advisor remediation (2026-06-09).
--
-- Applied to prod via Supabase MCP apply_migration (recorded in
-- supabase_migrations.schema_migrations). Committed here for version control.
--
-- Advisor flagged: (ERROR) ghostroute_ct_alerts RLS disabled while anon had
-- SELECT+INSERT; (WARN) 15 tables readable by the public anon key via
-- _public_read policies; (WARN) anon-executable SECURITY DEFINER function +
-- one mutable search_path.
--
-- Posture: the corpus is the paid moat, gated through the data-api
-- (rate limits / receipts / x402). Every legitimate reader/writer uses
-- service_role (tunnelmind-data-api Worker, VPS ghostroute-corpus writer),
-- which BYPASSES RLS + grants — verified in code. The site's anon
-- supabase.js client is dead (no imports, no .from() calls). So locking
-- Supabase to service-role-only is invisible to the app while closing the
-- raw-PostgREST bulk-clone path and the anon write hole. Fully reversible.
-- See vault: Claude Memory/feedback_supabase_service_role_only.md.

-- (1) The one RLS-disabled table → enable RLS (deny-all default).
ALTER TABLE public.ghostroute_ct_alerts ENABLE ROW LEVEL SECURITY;

-- (2) Drop the permissive public-read policies (anon+authenticated, USING true).
DROP POLICY IF EXISTS bgp_events_public_read                  ON public.bgp_events;
DROP POLICY IF EXISTS ghostroute_ai_infra_public_read         ON public.ghostroute_ai_infrastructure;
DROP POLICY IF EXISTS ghostroute_asn_ownership_public_read    ON public.ghostroute_asn_ownership;
DROP POLICY IF EXISTS ghostroute_bgp_public_read              ON public.ghostroute_bgp_snapshots;
DROP POLICY IF EXISTS ghostroute_country_zones_public_read    ON public.ghostroute_country_zones;
DROP POLICY IF EXISTS ghostroute_ct_inclusion_proofs_public_read ON public.ghostroute_ct_inclusion_proofs;
DROP POLICY IF EXISTS ghostroute_ct_log_heads_public_read     ON public.ghostroute_ct_log_heads;
DROP POLICY IF EXISTS ghostroute_ct_public_read               ON public.ghostroute_ct_observations;
DROP POLICY IF EXISTS ghostroute_receipts_public_read         ON public.ghostroute_receipts;
DROP POLICY IF EXISTS ghostroute_rpki_public_read             ON public.ghostroute_rpki_snapshots;
DROP POLICY IF EXISTS ghostroute_sovereign_zones_public_read  ON public.ghostroute_sovereign_zones;
DROP POLICY IF EXISTS oai_adversary_class_public_read         ON public.oai_adversary_class;
DROP POLICY IF EXISTS oai_registry_public_read                ON public.oai_registry;
DROP POLICY IF EXISTS oai_sensors_public_read                 ON public.oai_sensors;
DROP POLICY IF EXISTS sensor_obs_public_read                  ON public.sensor_observations;

-- (3) Strip every anon + authenticated table privilege in the schema.
--     Idempotent; service_role unaffected.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- (4) SECURITY DEFINER trigger helper must not be RPC-callable by the public
--     (triggers keep firing — EXECUTE is only needed for direct /rpc/ calls).
--     NOTE: completed in 034 — functions grant EXECUTE to PUBLIC by default,
--     so the revoke must target PUBLIC, not just anon/authenticated.
REVOKE ALL ON FUNCTION public.touch_updated_at_p29() FROM anon, authenticated;

-- (5) Pin the remaining mutable search_path (advisor 0011).
ALTER FUNCTION public.issue_ghostroute_receipt() SET search_path = public, pg_temp;

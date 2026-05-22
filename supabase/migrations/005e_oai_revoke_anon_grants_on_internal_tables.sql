-- 005e_oai_revoke_anon_grants_on_internal_tables.sql
--
-- RECONSTRUCTED 2026-05-22 from the live schema (project ujosrvwcimdqofwjhnan,
-- migration applied 2026-05-13). The original file was missing from disk
-- although the migration was tracked in supabase_migrations.schema_migrations.
-- This file makes a re-apply against a fresh database reproduce the live state.
--
-- Purpose: revoke ALL table-level grants from anon + authenticated on the
-- internal OAI bookkeeping tables. 005c added RLS deny-all policies, but
-- Postgres still grants table-level privileges to the public roles by default
-- in some bootstrap paths — and information_schema.role_table_grants leaks
-- those grants to anon even when RLS blocks the actual data. This migration
-- closes that hole.
--
-- After this migration:
--   - oai_sequence    : grants present only for postgres + service_role
--   - oai_issuance_log: grants present only for postgres + service_role
--
-- Idempotent.

REVOKE ALL ON public.oai_sequence     FROM anon, authenticated;
REVOKE ALL ON public.oai_issuance_log FROM anon, authenticated;

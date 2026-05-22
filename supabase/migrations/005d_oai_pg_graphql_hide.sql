-- 005d_oai_pg_graphql_hide.sql
--
-- RECONSTRUCTED 2026-05-22 from the live schema (project ujosrvwcimdqofwjhnan,
-- migration applied 2026-05-13). The original file was missing from disk
-- although the migration was tracked in supabase_migrations.schema_migrations.
-- This file makes a re-apply against a fresh database reproduce the live state.
--
-- Purpose: hide internal OAI bookkeeping tables (oai_sequence,
-- oai_issuance_log) from Supabase's auto-generated pg_graphql schema. Both
-- tables are service-role-only (RLS deny-all from 005c). Even with RLS,
-- pg_graphql resolves them in introspection and surfaces their column shapes
-- to anon — the @graphql({"enabled": false}) comment suppresses that.
--
-- Idempotent: re-running just rewrites the same comment.

COMMENT ON TABLE oai_sequence     IS '@graphql({"enabled": false})';
COMMENT ON TABLE oai_issuance_log IS '@graphql({"enabled": false})';

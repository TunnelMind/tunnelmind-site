-- Migration 005c: Address advisor findings on OAI functions and admin-only tables.
-- 1. Pin search_path to ('public', 'pg_temp') on all OAI-introduced functions so
--    a malicious schema in the caller's search_path can't shadow our objects.
--    Without this pin, a SECURITY DEFINER function (or any function called from
--    a session that controls search_path) can be hijacked by a malicious schema
--    earlier in the path that exposes a shadowed table or operator.
-- 2. Add explicit deny-all policies on oai_sequence and oai_issuance_log. RLS
--    is enabled but has no policies, which works (no policy + RLS = deny). The
--    explicit deny policy makes intent obvious to reviewers and silences the
--    "rls_enabled_no_policy" advisor.

ALTER FUNCTION public.issue_oai(text) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.oai_validate_aliases() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.oai_reject_modification() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.touch_updated_at() SET search_path = 'public', 'pg_temp';

DROP POLICY IF EXISTS oai_sequence_deny_all ON oai_sequence;
CREATE POLICY oai_sequence_deny_all ON oai_sequence
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS oai_issuance_log_deny_all ON oai_issuance_log;
CREATE POLICY oai_issuance_log_deny_all ON oai_issuance_log
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

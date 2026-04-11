-- TunnelMind Community Platform — Stripe Connect Migration
-- Run after 001_initial_schema.sql

-- ── Stripe fields on contributors ────────────────────────────────────────────

ALTER TABLE contributors
  ADD COLUMN IF NOT EXISTS stripe_account_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarded       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_deauthorized    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_tier          TEXT NOT NULL DEFAULT 'email'
                                                  CHECK (identity_tier IN ('email', 'verified', 'atap')),
  ADD COLUMN IF NOT EXISTS payout_balance_cents   INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS contributors_stripe_account_id_idx
  ON contributors (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

-- ── Payout ledger ─────────────────────────────────────────────────────────────
-- One row per credit or debit to a contributor's balance.
-- All amounts in cents (integers, never floats).

CREATE TABLE IF NOT EXISTS payout_ledger (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id   UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  amount_cents     INTEGER NOT NULL,          -- positive = credit, negative = debit
  reason           TEXT NOT NULL,             -- 'monthly_share' | 'payout_debit' | 'adjustment'
  payout_run_id    UUID,                      -- NULL until assigned to a run
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_ledger_contributor_idx ON payout_ledger (contributor_id);
CREATE INDEX IF NOT EXISTS payout_ledger_run_idx         ON payout_ledger (payout_run_id);

-- ── Payout runs ───────────────────────────────────────────────────────────────
-- One row per monthly payout cycle.

CREATE TABLE IF NOT EXISTS payout_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period           TEXT NOT NULL UNIQUE,      -- e.g. '2026-04'
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_revenue_cents     INTEGER NOT NULL DEFAULT 0,
  business_reserve_cents  INTEGER NOT NULL DEFAULT 0,
  contributor_pool_cents  INTEGER NOT NULL DEFAULT 0,
  total_paid_cents        INTEGER NOT NULL DEFAULT 0,
  contributor_count       INTEGER NOT NULL DEFAULT 0,
  error                   TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── RLS: service role bypasses, anon cannot touch these tables ────────────────

ALTER TABLE payout_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_runs   ENABLE ROW LEVEL SECURITY;

-- Only service role (server-side) may read/write payout data
CREATE POLICY payout_ledger_service_only ON payout_ledger
  USING (auth.role() = 'service_role');

CREATE POLICY payout_runs_service_only ON payout_runs
  USING (auth.role() = 'service_role');

-- ── RPC helpers ───────────────────────────────────────────────────────────────

-- Called by webhook handler when a transfer succeeds
CREATE OR REPLACE FUNCTION decrement_payout_balance(
  p_contributor_id UUID,
  p_amount_cents   INTEGER
) RETURNS VOID AS $$
  UPDATE contributors
  SET payout_balance_cents = payout_balance_cents - p_amount_cents
  WHERE id = p_contributor_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Called by payout run to credit a contributor's balance
CREATE OR REPLACE FUNCTION credit_payout_balance(
  p_contributor_id UUID,
  p_amount_cents   INTEGER,
  p_run_id         UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE contributors
  SET payout_balance_cents = payout_balance_cents + p_amount_cents
  WHERE id = p_contributor_id;

  INSERT INTO payout_ledger (contributor_id, amount_cents, reason, payout_run_id)
  VALUES (p_contributor_id, p_amount_cents, 'monthly_share', p_run_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

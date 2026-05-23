-- Migration 016 — capture seller-record data on exchange_seat.
--
-- The sellers.json crawler observes seller.name, seller.domain, and
-- seller.seller_type on every parsed record but currently discards them,
-- persisting only the seat_id/ssp_id pair. Without seller_domain on disk,
-- there is no SQL path to resolve owner_entity_slug after the fact — a full
-- re-crawl would be required just to bring the values back into memory.
--
-- This migration adds the three columns the crawler will start persisting in
-- the very next code release. All three are nullable: existing 856K rows
-- pre-date them. A subsequent re-crawl of all SSPs backfills the existing
-- rows on the next upsert (idempotent on (seat_id, ssp_id)).
--
-- seller_type is constrained to the three IAB sellers.json 1.0 values
-- (PUBLISHER, INTERMEDIARY, BOTH). These are the sellers.json vocabulary —
-- DISTINCT from the ads.txt vocabulary (DIRECT, RESELLER) used by the
-- sells_through table. The crawler upper-cases on read so the constraint
-- matches what gets written.
--
-- Indexed: seller_domain only — that is the join key for the
-- owner_entity_slug resolver (against the entity_domain bridge added in
-- migration 017). Partial index keeps it lean during the recrawl window
-- when many rows still have NULL seller_domain.

ALTER TABLE public.exchange_seat
  ADD COLUMN IF NOT EXISTS seller_domain TEXT,
  ADD COLUMN IF NOT EXISTS seller_name   TEXT,
  ADD COLUMN IF NOT EXISTS seller_type   TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exchange_seat_seller_type_check'
      AND conrelid = 'public.exchange_seat'::regclass
  ) THEN
    ALTER TABLE public.exchange_seat
      ADD CONSTRAINT exchange_seat_seller_type_check
      CHECK (seller_type IS NULL OR seller_type IN ('PUBLISHER','INTERMEDIARY','BOTH'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exchange_seat_seller_domain
  ON public.exchange_seat (seller_domain)
  WHERE seller_domain IS NOT NULL;

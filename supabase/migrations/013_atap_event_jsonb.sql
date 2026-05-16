-- 013_atap_event_jsonb.sql
-- Sigil P32 Phase 2 — store the full signed Witness Event object.
--
-- 012 stored Witness Events decomposed into columns. But `witnessed_at` is a
-- timestamptz: Postgres normalises the signed `...Z` form to `...+00:00` on
-- read, so an event reconstructed from columns no longer canonicalizes to the
-- bytes that were signed — its hash and signature would not verify. AITs and
-- Attestation Blocks already keep the full signed object in a jsonb column;
-- Witness Events now do too. The decomposed columns stay for indexing/queries;
-- `event` is the canonical artifact a receipt and a verifier read.

alter table atap_witness_events add column event jsonb;

-- Re-freeze the append-only trigger to cover the new column.
create or replace function atap_events_append_only()
returns trigger language plpgsql set search_path = public, pg_temp as $fn$
begin
  if tg_op = 'DELETE' then
    raise exception 'atap_witness_events is append-only';
  end if;
  if old.block_id is not null then
    raise exception 'atap_witness_events.block_id is write-once';
  end if;
  if new.id is distinct from old.id
  or new.ait is distinct from old.ait
  or new.seq is distinct from old.seq
  or new.event_type is distinct from old.event_type
  or new.payload is distinct from old.payload
  or new.event is distinct from old.event
  or new.witnessed_at is distinct from old.witnessed_at
  or new.prev_event_hash is distinct from old.prev_event_hash
  or new.self_hash is distinct from old.self_hash
  or new.witness_signature is distinct from old.witness_signature
  or new.tier is distinct from old.tier
  or new.anchor_token is distinct from old.anchor_token
  or new.created_at is distinct from old.created_at then
    raise exception 'atap_witness_events is append-only (only block_id may be set once)';
  end if;
  return new;
end $fn$;

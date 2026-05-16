-- 012_atap_witness_storage.sql
-- Sigil P32 Phase 2 — ATAP v0.1 witness backend storage.
--
-- Sigil is the ATAP witness for the sigil:media_buyer:v1 profile. These tables
-- hold the AITs it signs, the hash-chained Witness Events, and the rolled-up
-- Attestation Blocks. The signed artifacts are immutable: witness events and
-- attestation blocks are append-only (the block_id back-pointer on an event is
-- the one write-once exception). Service-role only — the Sigil Worker mediates
-- every read and write. See TunnelMind/prompts/sigil-p32-revised-spec.md.

-- 1. Registered AITs ------------------------------------------------------
create table atap_aits (
  id           text primary key
               check (id ~ '^AIT-[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  ait          jsonb not null,          -- the full signed AIT object
  profile      text  not null,
  operator_oai text  not null check (operator_oai ~ '^OAI-[0-9]{4}-[0-9]{7}$'),
  witness_oai  text  not null check (witness_oai  ~ '^OAI-[0-9]{4}-[0-9]{7}$'),
  issued_at    timestamptz not null,
  expires_at   timestamptz not null,
  status       text not null default 'active'
               check (status in ('active', 'expired', 'retired')),
  created_at   timestamptz not null default now()
);
create index atap_aits_status_idx on atap_aits (status);

-- The signed AIT body is frozen; only lifecycle `status` may change.
create or replace function atap_aits_freeze()
returns trigger language plpgsql set search_path = public, pg_temp as $fn$
begin
  if new.id           is distinct from old.id
  or new.ait          is distinct from old.ait
  or new.profile      is distinct from old.profile
  or new.operator_oai is distinct from old.operator_oai
  or new.witness_oai  is distinct from old.witness_oai
  or new.issued_at    is distinct from old.issued_at
  or new.expires_at   is distinct from old.expires_at
  or new.created_at   is distinct from old.created_at then
    raise exception 'atap_aits: only status is mutable';
  end if;
  return new;
end $fn$;
create trigger atap_aits_freeze_trg
  before update on atap_aits
  for each row execute function atap_aits_freeze();

-- 2. Witness Events (append-only) ----------------------------------------
create table atap_witness_events (
  id              text primary key
                  check (id ~ '^ATAP-WE-[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  ait             text not null references atap_aits(id),
  seq             integer not null check (seq >= 1),
  event_type      text not null,
  payload         jsonb not null,
  witnessed_at    timestamptz not null,
  prev_event_hash text not null check (prev_event_hash ~ '^0x[0-9a-f]{64}$'),
  self_hash       text not null check (self_hash       ~ '^0x[0-9a-f]{64}$'),
  witness_signature text not null check (witness_signature ~ '^ed25519:0x[0-9a-f]{128}$'),
  tier            text not null check (tier in ('witnessed', 'anchored', 'asserted')),
  anchor_token    text,                 -- the cited sigil_token, when tier = anchored
  block_id        text,                 -- write-once: set when rolled into a block
  created_at      timestamptz not null default now(),
  unique (ait, seq)
);
create index atap_witness_events_ait_idx on atap_witness_events (ait, seq);
create index atap_witness_events_pending_idx on atap_witness_events (ait) where block_id is null;

-- Append-only: no DELETE; UPDATE may only set block_id once (null -> value).
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
create trigger atap_events_no_update before update on atap_witness_events
  for each row execute function atap_events_append_only();
create trigger atap_events_no_delete before delete on atap_witness_events
  for each row execute function atap_events_append_only();

-- 3. Attestation Blocks (append-only) ------------------------------------
create table atap_attestation_blocks (
  id              text primary key
                  check (id ~ '^ATAP-AB-[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  ait             text not null references atap_aits(id),
  profile         text not null,
  period_start    timestamptz not null,
  period_end      timestamptz not null,
  first_event     text not null,
  last_event      text not null,
  event_count     integer not null check (event_count >= 1),
  chain_head_hash text not null check (chain_head_hash ~ '^0x[0-9a-f]{64}$'),
  period_summary  jsonb not null,
  block           jsonb not null,       -- the full signed Attestation Block object
  prev_block_hash text not null check (prev_block_hash ~ '^0x[0-9a-f]{64}$'),
  self_hash       text not null check (self_hash       ~ '^0x[0-9a-f]{64}$'),
  witness_signature text not null check (witness_signature ~ '^ed25519:0x[0-9a-f]{128}$'),
  created_at      timestamptz not null default now()
);
create index atap_blocks_ait_idx on atap_attestation_blocks (ait, period_start);

create or replace function atap_blocks_append_only()
returns trigger language plpgsql set search_path = public, pg_temp as $fn$
begin
  raise exception 'atap_attestation_blocks is append-only';
end $fn$;
create trigger atap_blocks_no_update before update on atap_attestation_blocks
  for each row execute function atap_blocks_append_only();
create trigger atap_blocks_no_delete before delete on atap_attestation_blocks
  for each row execute function atap_blocks_append_only();

-- 4. Lock-down — service-role only ---------------------------------------
alter table atap_aits              enable row level security;
alter table atap_witness_events    enable row level security;
alter table atap_attestation_blocks enable row level security;

revoke all on atap_aits               from anon, authenticated;
revoke all on atap_witness_events     from anon, authenticated;
revoke all on atap_attestation_blocks from anon, authenticated;

comment on table atap_witness_events is '@graphql({"enabled": false})';
comment on table atap_attestation_blocks is '@graphql({"enabled": false})';
comment on table atap_aits is '@graphql({"enabled": false})';

-- 011_sigil_entity_trust_scoring.sql
-- Sigil P36 — Entity Trust Scoring Engine.
--
-- Pre-computes a deterministic 0.0–1.0 trust score for every supply-chain
-- entity (publishers + SSPs today; DSPs + app bundles auto-included once those
-- tables populate). The materialized view holds the raw component values; the
-- weighted score is derived by sigil_weighted_score() so the Sigil API can
-- re-weight per consumer without recomputation. pg_cron refreshes daily at
-- 05:00 UTC — one hour after the ads.txt crawler (04:00) and entity sync
-- (03:30) settle, which is the real cadence of the underlying data.
--
-- v1 evaluated components (structural, pure-SQL, auditable):
--   publisher: ads_txt_health, supply_chain_directness, historical_stability
--   ssp:       supply_reach, directness
-- Reserved / not_evaluated (excluded from the weighted mean until their
-- enrichment paths exist): scry_overlap, fraud_signals, domain_age,
-- peer_reputation, store_verification_rate. The API reports these explicitly.
-- Component columns are nullable and weights are versioned, so lighting one up
-- later is a new migration that bumps the active weights version — no rewrite.

begin;

-- 1. pg_cron --------------------------------------------------------------
create extension if not exists pg_cron;

-- 2. Versioned scoring weights -------------------------------------------
create table sigil_score_weights (
  version    integer primary key,
  weights    jsonb   not null,   -- { "<entity_type>": { "<component>": <weight> } }
  is_active  boolean not null default false,
  note       text,
  created_at timestamptz not null default now()
);

-- Exactly one active version at a time.
create unique index sigil_score_weights_one_active
  on sigil_score_weights (is_active) where is_active;

insert into sigil_score_weights (version, weights, is_active, note) values (
  1,
  '{
    "publisher": {
      "ads_txt_health": 0.50,
      "supply_chain_directness": 0.30,
      "historical_stability": 0.20
    },
    "ssp": {
      "supply_reach": 0.45,
      "directness": 0.55
    }
  }'::jsonb,
  true,
  'P36 v1 default weights. Structural components only; scry_overlap / fraud_signals / domain_age / peer_reputation / store_verification_rate are reserved (not_evaluated) pending their enrichment paths.'
);

-- 3. Weighted-score helper ------------------------------------------------
-- Weighted mean over EVALUATED (non-null, present) components only, with the
-- weights renormalised across whatever components an entity actually has.
-- Deterministic: same components + same active weights => same score.
create or replace function sigil_weighted_score(p_components jsonb, p_entity_type text)
returns numeric
language plpgsql
stable
set search_path = public, pg_temp
as $fn$
declare
  v_weights jsonb;
  v_key     text;
  v_val     text;
  v_w       numeric;
  v_sum_w   numeric := 0;
  v_sum_wv  numeric := 0;
begin
  select weights -> p_entity_type into v_weights
  from sigil_score_weights where is_active limit 1;
  if v_weights is null or p_components is null then
    return null;
  end if;

  for v_key, v_val in select key, value from jsonb_each_text(p_components)
  loop
    if v_val is null then
      continue;
    end if;
    v_w := coalesce((v_weights ->> v_key)::numeric, 0);
    if v_w = 0 then
      continue;
    end if;
    v_sum_w  := v_sum_w  + v_w;
    v_sum_wv := v_sum_wv + v_w * v_val::numeric;
  end loop;

  if v_sum_w = 0 then
    return null;
  end if;
  return round(v_sum_wv / v_sum_w, 3);
end
$fn$;

-- 4. Append-only score history ------------------------------------------
create table entity_trust_score_history (
  id              bigint generated always as identity primary key,
  entity_type     text not null check (entity_type in ('publisher','ssp','dsp','app_bundle')),
  entity_key      text not null,
  trust_score     numeric(4,3) check (trust_score is null or trust_score between 0 and 1),
  components      jsonb not null default '{}'::jsonb,
  weights_version integer not null references sigil_score_weights(version),
  computed_at     timestamptz not null default now()
);

create index entity_trust_score_history_lookup
  on entity_trust_score_history (entity_type, entity_key, computed_at desc);

-- Append-only: even service_role cannot rewrite history.
create or replace function sigil_reject_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  raise exception 'entity_trust_score_history is append-only';
end
$fn$;

create trigger entity_trust_score_history_no_update
  before update on entity_trust_score_history
  for each row execute function sigil_reject_mutation();
create trigger entity_trust_score_history_no_delete
  before delete on entity_trust_score_history
  for each row execute function sigil_reject_mutation();

-- 5. Trust-score materialized view ---------------------------------------
create materialized view mv_entity_trust_scores as
with
pub_st as (
  select publisher_id,
         count(*)::numeric                                          as total_entries,
         count(*) filter (where seller_type = 'direct')::numeric     as direct_entries
  from sells_through
  group by publisher_id
),
pub_churn as (
  -- Event count, not magnitude: a publisher's first-ever crawl diff logs the
  -- whole seller set as "added", so counting events (capped at 10) avoids that
  -- baseline artifact while still penalising genuinely churny ads.txt files.
  select publisher_domain, count(*)::numeric as events_14d
  from publisher_ads_txt_changes
  where observed_at > now() - interval '14 days'
  group by publisher_domain
),
publishers as (
  select
    'publisher'::text as entity_type,
    p.domain          as entity_key,
    p.domain          as entity_name,
    p.entity_slug,
    -- ads_txt_health: persistent unreachability is a weak negative, not pure
    -- indeterminacy; only a never-crawled (null status) row is left null.
    case p.ads_txt_parse_status
      when 'ok'             then 1.00
      when 'ok_placeholder' then 0.55
      when 'restricted_401' then 0.50
      when 'malformed'      then 0.45
      when 'redirect_error' then 0.35
      when 'unreachable'    then 0.30
      when 'blocked_robots' then 0.30   -- legacy status, pre-G1 rows
      when 'absent_404'     then 0.15
      when 'not_found'      then 0.15   -- legacy status, pre-G1 rows
      else null
    end as c_ads_txt_health,
    -- supply_chain_directness: share of this publisher's sellers listed DIRECT.
    case when st.total_entries is null or st.total_entries = 0 then null
         else round(st.direct_entries / st.total_entries, 4) end
      as c_supply_chain_directness,
    -- historical_stability: only meaningful when a file was actually retrieved.
    case when p.ads_txt_parse_status in ('ok','ok_placeholder','malformed','restricted_401')
         then round(1.0 - least(1.0, coalesce(ch.events_14d, 0) / 10.0), 4)
         else null end
      as c_historical_stability
  from publisher p
  left join pub_st    st on st.publisher_id    = p.id
  left join pub_churn ch on ch.publisher_domain = p.domain
),
ssp_st as (
  select ssp_id,
         count(*)::numeric                                       as total_entries,
         count(*) filter (where seller_type = 'direct')::numeric as direct_entries,
         count(distinct publisher_id)::numeric                   as reach
  from sells_through
  group by ssp_id
),
ssps as (
  select
    'ssp'::text as entity_type,
    s.domain    as entity_key,
    s.name      as entity_name,
    s.entity_slug,
    -- supply_reach: log-scaled distinct-publisher reach, normalised against a
    -- fixed 2000-publisher "broad reach" reference (data-independent => stable).
    case when st.reach is null or st.reach = 0 then null
         else round(least(1.0, ln(1 + st.reach) / ln(1 + 2000.0)), 4) end
      as c_supply_reach,
    -- directness: share of entries naming this SSP that are DIRECT.
    case when st.total_entries is null or st.total_entries = 0 then null
         else round(st.direct_entries / st.total_entries, 4) end
      as c_directness
  from ssp s
  left join ssp_st st on st.ssp_id = s.id
),
base as (
  select entity_type, entity_key, entity_name, entity_slug,
         jsonb_strip_nulls(jsonb_build_object(
           'ads_txt_health',          c_ads_txt_health,
           'supply_chain_directness', c_supply_chain_directness,
           'historical_stability',    c_historical_stability
         )) as components
  from publishers
  union all
  select entity_type, entity_key, entity_name, entity_slug,
         jsonb_strip_nulls(jsonb_build_object(
           'supply_reach', c_supply_reach,
           'directness',   c_directness
         )) as components
  from ssps
)
select
  entity_type,
  entity_key,
  entity_name,
  entity_slug,
  components,
  sigil_weighted_score(components, entity_type) as trust_score,
  now() as computed_at
from base;

-- Unique index is mandatory for REFRESH ... CONCURRENTLY.
create unique index mv_entity_trust_scores_pk
  on mv_entity_trust_scores (entity_type, entity_key);
create index mv_entity_trust_scores_type
  on mv_entity_trust_scores (entity_type);

comment on materialized view mv_entity_trust_scores is
  '@graphql({"enabled": false})';

-- 6. Refresh + snapshot routine ------------------------------------------
-- Refreshes the view, then appends one history snapshot per entity. Returns
-- the number of entities scored.
create or replace function sigil_refresh_trust_scores()
returns integer
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  v_version integer;
  v_count   integer;
begin
  refresh materialized view concurrently mv_entity_trust_scores;
  select version into v_version from sigil_score_weights where is_active limit 1;
  insert into entity_trust_score_history
    (entity_type, entity_key, trust_score, components, weights_version)
  select entity_type, entity_key, trust_score, components, v_version
  from mv_entity_trust_scores;
  get diagnostics v_count = row_count;
  return v_count;
end
$fn$;

-- 7. Daily schedule -------------------------------------------------------
-- 05:00 UTC — after the 04:00 ads.txt crawl and 03:30 entity sync.
select cron.schedule(
  'sigil-trust-scores-daily',
  '0 5 * * *',
  $cron$select sigil_refresh_trust_scores()$cron$
);

-- 8. Lock-down ------------------------------------------------------------
-- Service-role only; the Sigil Worker mediates all access (auth + rate limit).
alter table sigil_score_weights         enable row level security;
alter table entity_trust_score_history  enable row level security;

revoke all on sigil_score_weights        from anon, authenticated;
revoke all on entity_trust_score_history from anon, authenticated;
revoke all on mv_entity_trust_scores     from anon, authenticated;

commit;

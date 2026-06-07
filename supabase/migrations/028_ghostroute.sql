-- 028_ghostroute.sql — P58 (GhostRoute Fourth Lens, schema).
--
-- GhostRoute is the routing-integrity / sovereignty lens. It answers: "Is this
-- infrastructure where it claims to be, owned by who it claims, routing where it
-- says — and does that match the sovereign jurisdiction it asserts?" It joins
-- the existing three lenses (Scry = who attacks, Sigil = who to trust, Tracker =
-- who watches) as the fourth, weighted 30/30/25/15 in /v1/check.
--
-- SUPERSESSION NOTE. A GhostRoute v1 shipped 2026-04-11 (DNS-traffic jurisdiction
-- certificates per enrolled peer; D1 table `ghostroute_certificates`; receipt ids
-- `gr-YYYYMMDD-{hex}`; Python `server/ghostroute/`) and was cut from data-api
-- 2026-06-04 (branch chore/cut-ghostroute-refresh-discovery, recoverable). THIS
-- migration is the v2 redesign: on-demand entity verification, Supabase-backed,
-- canonical receipt ids `GR-YYYY-NNNNNNN` (issue_ghostroute_receipt(), below,
-- mirrors issue_oai() in migration 005). The v1 D1 cert path is legacy and is NOT
-- migrated here — it remains a separate, dormant concern. The shared commercial
-- framing (GDPR Art. 44 / sovereign evidence) carries forward.
--
-- Renumbering: the original plan labelled this "P45 / migration 014". Both were
-- stale — P45-P49 are the shipped Marti adversary track (migrations 022-026), and
-- 014 already exists (014_sigil_dsp_seed.sql). Live head is 027; this is 028. The
-- GhostRoute arc is renumbered P58-P65. See session note 2026-06-05-ghostroute.
--
-- Conventions matched to the live schema (027, 026, 005):
--   * public.* schema-qualified; lowercase types; CHECK ... IN (...) for enums.
--   * RLS model: public observation/reference tables get an explicit anon+
--     authenticated SELECT policy; writes have NO policy → service-role only
--     (the worker's service key). Bookkeeping tables (sequence) get RLS enabled,
--     no policy, and anon/authenticated grants revoked — exactly like oai_sequence.
--   * Receipt-id issuance is a SECURITY-style atomic function over a (year,
--     last_seq) table, never a bare SEQUENCE — mirrors issue_oai (005).
--   * Purely additive; IF NOT EXISTS guards throughout; no existing column is
--     altered or dropped; longitudinal snapshot tables are append-only by design.
--
-- Apply via PAT REST (reference_supabase_pat_ddl_escape). DO NOT apply until the
-- P58 stop gate is cleared by Josh.

-- ════════════════════════════════════════════════════════════════════════════
-- (1) ghostroute_receipts — the signed verdict, one row per check.
--     Public-read (a receipt is a public attestation, like bgp_events /
--     sensor_observations); writes service-role only.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ghostroute_receipts (
  id                      bigserial PRIMARY KEY,
  receipt_id              text NOT NULL UNIQUE
        CHECK (receipt_id ~ '^GR-\d{4}-\d{7}$'),       -- GR-YYYY-NNNNNNN
  entity_input            text NOT NULL,               -- raw input: IP/domain/cert/ASN
  entity_canonical        text NOT NULL,               -- resolved canonical form
  entity_type             text NOT NULL
        CHECK (entity_type IN ('ip','domain','asn','cert')),

  -- Routing
  origin_as               text,                        -- e.g. 'AS16509'
  origin_asn_name         text,                        -- e.g. 'AMAZON-02'
  rpki_valid              boolean,
  rpki_status             text
        CHECK (rpki_status IN ('VALID','INVALID','NOT_FOUND','UNKNOWN')),
  transit_jurisdictions   text[],                      -- ISO country codes
  unexpected_crossings    integer NOT NULL DEFAULT 0,
  hijack_score            numeric(4,3) NOT NULL DEFAULT 0
        CHECK (hijack_score >= 0 AND hijack_score <= 1),
  bgp_route_prefix        text,                        -- e.g. '54.240.0.0/13'
  bgp_snapshot_at         timestamptz,

  -- Certificate
  cert_ca                 text,
  cert_ca_country         text,
  cert_ct_logged          boolean,
  cert_transparency_score numeric(4,3)
        CHECK (cert_transparency_score IS NULL OR (cert_transparency_score >= 0 AND cert_transparency_score <= 1)),
  cert_fingerprint        text,
  cert_ja4                text,                         -- TLS fingerprint if observed

  -- Infrastructure
  dc_city                 text,
  dc_country              text,
  dc_operator             text,
  dc_operator_country     text,
  cloud_provider          text,
  cloud_provider_country  text,
  sanctions_match         boolean NOT NULL DEFAULT false,
  bis_entity_list         boolean NOT NULL DEFAULT false,

  -- AI context
  is_ai_infrastructure    boolean NOT NULL DEFAULT false,
  ai_owner                text,
  inference_zone_verified boolean,
  sovereign_ai_program    text,                         -- e.g. 'EUCS','TRA','IndiaAI'
  sovereign_ai_verified   boolean NOT NULL DEFAULT false,

  -- Sovereign integrity
  claimed_sovereign_zone  text,
  sovereign_integrity     numeric(4,3)
        CHECK (sovereign_integrity IS NULL OR (sovereign_integrity >= 0 AND sovereign_integrity <= 1)),
  sovereign_tier          text
        CHECK (sovereign_tier IS NULL OR sovereign_tier IN ('VERIFIED','PLAUSIBLE','MISMATCH','CRITICAL_MISMATCH')),
  sovereign_finding       text,

  -- Receipt metadata
  attestation_tier        text NOT NULL DEFAULT 'software'
        CHECK (attestation_tier IN ('self-asserted','software','tee-tpm','silicon-root')),
  lens_version            text NOT NULL DEFAULT 'ghostroute-v1',
  signed_by               text NOT NULL DEFAULT 'TunnelMind GhostRoute v1',
  signature               text,                         -- ed25519 hex signature
  receipt_url             text,

  -- Cross-lens correlation (soft references — no enforced FK, matches mig 022/025 style)
  scry_correlation_id     text,
  sigil_entity_id         bigint,
  check_receipt_id        text,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghostroute_receipts_canonical ON public.ghostroute_receipts (entity_canonical);
CREATE INDEX IF NOT EXISTS idx_ghostroute_receipts_tier      ON public.ghostroute_receipts (sovereign_tier);
CREATE INDEX IF NOT EXISTS idx_ghostroute_receipts_created   ON public.ghostroute_receipts (created_at DESC);

ALTER TABLE public.ghostroute_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghostroute_receipts_public_read ON public.ghostroute_receipts;
CREATE POLICY ghostroute_receipts_public_read ON public.ghostroute_receipts
  FOR SELECT TO anon, authenticated USING (true);
-- No INSERT/UPDATE/DELETE policy → writes via service-role only.

-- ════════════════════════════════════════════════════════════════════════════
-- (2) ghostroute_asn_ownership — the AS ownership graph (the long-term moat).
--     Public WHOIS-derived; public-read. parent_org/parent_org_country are the
--     enrichment moat (registrant → ultimate corporate parent), filled in P60/P61
--     — the P59 ASN worker only sets registrant_org + sovereign_zone.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ghostroute_asn_ownership (
  id                      bigserial PRIMARY KEY,
  asn                     text NOT NULL UNIQUE
        CHECK (asn ~ '^AS\d+$'),                        -- canonical 'AS16509'
  asn_name                text,
  registrant_org          text,                         -- direct WHOIS registrant
  parent_org              text,                         -- ultimate corporate parent (Sigil graph)
  parent_org_country      text,                         -- HQ country ISO code
  parent_org_hq_city      text,
  sovereign_zone          text,                         -- 'EU'|'US'|'CN'|'RU'|'IN'|...
  rir                     text
        CHECK (rir IS NULL OR rir IN ('RIPE','ARIN','APNIC','LACNIC','AFRINIC')),
  sanctions_match         boolean NOT NULL DEFAULT false,
  bis_entity_list         boolean NOT NULL DEFAULT false,
  is_cloud_provider       boolean NOT NULL DEFAULT false,
  cloud_provider_name     text,
  is_ai_infrastructure    boolean NOT NULL DEFAULT false,
  ai_owner                text,
  peering_db_id           integer,
  raw_whois               text,
  whois_fetched_at        timestamptz,
  sigil_entity_id         bigint,                        -- soft xref to Sigil entity
  last_verified_at        timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghostroute_asn_ownership_sovereign ON public.ghostroute_asn_ownership (sovereign_zone);
CREATE INDEX IF NOT EXISTS idx_ghostroute_asn_ownership_ai        ON public.ghostroute_asn_ownership (is_ai_infrastructure) WHERE is_ai_infrastructure = true;

ALTER TABLE public.ghostroute_asn_ownership ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghostroute_asn_ownership_public_read ON public.ghostroute_asn_ownership;
CREATE POLICY ghostroute_asn_ownership_public_read ON public.ghostroute_asn_ownership
  FOR SELECT TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════════════════════
-- (3) ghostroute_rpki_snapshots — longitudinal RPKI validity. Append-only:
--     never UPDATE/DELETE a row; every poll inserts. Public-read.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ghostroute_rpki_snapshots (
  id            bigserial PRIMARY KEY,
  prefix        text NOT NULL,                          -- e.g. '54.240.0.0/13'
  origin_asn    text NOT NULL,                          -- e.g. 'AS16509'
  roa_asn       text,                                   -- ASN in the ROA if different
  roa_max_length integer,
  rpki_status   text NOT NULL
        CHECK (rpki_status IN ('VALID','INVALID','NOT_FOUND')),
  rir           text,
  snapshot_at   timestamptz NOT NULL DEFAULT now(),
  source        text NOT NULL DEFAULT 'routinator'
);

CREATE INDEX IF NOT EXISTS idx_ghostroute_rpki_prefix      ON public.ghostroute_rpki_snapshots (prefix);
CREATE INDEX IF NOT EXISTS idx_ghostroute_rpki_asn         ON public.ghostroute_rpki_snapshots (origin_asn);
CREATE INDEX IF NOT EXISTS idx_ghostroute_rpki_snapshot_at ON public.ghostroute_rpki_snapshots (snapshot_at);

ALTER TABLE public.ghostroute_rpki_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghostroute_rpki_public_read ON public.ghostroute_rpki_snapshots;
CREATE POLICY ghostroute_rpki_public_read ON public.ghostroute_rpki_snapshots
  FOR SELECT TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════════════════════
-- (4) ghostroute_sovereign_zones — zone classification reference. Public-read.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ghostroute_sovereign_zones (
  id                bigserial PRIMARY KEY,
  zone_code         text NOT NULL UNIQUE,               -- 'EU'|'US'|'CN'|'FIVE_EYES'|...
  zone_name         text NOT NULL,
  member_countries  text[],                             -- ISO country codes
  gdpr_adequate     boolean NOT NULL DEFAULT false,
  eu_ai_act_applies boolean NOT NULL DEFAULT false,
  sanctions_active  boolean NOT NULL DEFAULT false,
  notes             text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ghostroute_sovereign_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghostroute_sovereign_zones_public_read ON public.ghostroute_sovereign_zones;
CREATE POLICY ghostroute_sovereign_zones_public_read ON public.ghostroute_sovereign_zones
  FOR SELECT TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════════════════════
-- (5) ghostroute_country_zones — ISO country → zone mapping. Public-read.
--     Loaded by sovereignty.js (P60) at startup, cached 1h.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ghostroute_country_zones (
  id               bigserial PRIMARY KEY,
  country_iso      text NOT NULL UNIQUE,                -- ISO 3166-1 alpha-2
  country_name     text NOT NULL,
  primary_zone     text NOT NULL,                       -- → ghostroute_sovereign_zones.zone_code
  additional_zones text[],                              -- e.g. both 'EU' and 'NATO'
  gdpr_adequate    boolean NOT NULL DEFAULT false,
  eu_member        boolean NOT NULL DEFAULT false,
  nato_member      boolean NOT NULL DEFAULT false,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ghostroute_country_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghostroute_country_zones_public_read ON public.ghostroute_country_zones;
CREATE POLICY ghostroute_country_zones_public_read ON public.ghostroute_country_zones
  FOR SELECT TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════════════════════
-- (6) ghostroute_ct_observations — certificate-transparency observations.
--     Public-read; upsert-on-fingerprint by the P59 CT worker.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ghostroute_ct_observations (
  id                bigserial PRIMARY KEY,
  domain            text NOT NULL,
  cert_fingerprint  text NOT NULL UNIQUE,
  subject_cn        text,
  sans              text[],
  issuer_ca         text,
  issuer_ca_country text,
  issuer_ca_zone    text,
  not_before        timestamptz,
  not_after         timestamptz,
  ct_log_source     text,                               -- 'crt.sh'|'google-argon'|'lets-encrypt'
  is_ai_domain      boolean NOT NULL DEFAULT false,
  ai_owner          text,
  observed_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghostroute_ct_domain ON public.ghostroute_ct_observations (domain);
CREATE INDEX IF NOT EXISTS idx_ghostroute_ct_ai     ON public.ghostroute_ct_observations (is_ai_domain) WHERE is_ai_domain = true;

ALTER TABLE public.ghostroute_ct_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghostroute_ct_public_read ON public.ghostroute_ct_observations;
CREATE POLICY ghostroute_ct_public_read ON public.ghostroute_ct_observations
  FOR SELECT TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════════════════════
-- (7) ghostroute_ai_infrastructure — curated AI-infra fingerprint DB.
--     Public-read; manually curated + auto-updated by the P59 ASN worker.
--     NB: the seed ASN/domain rows below are UNVERIFIED starter data (several are
--     CDN-fronted or cloud-hosted, so the ASN is the front not the operator) —
--     they exist only to bootstrap the matcher and are corrected by enrichment.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ghostroute_ai_infrastructure (
  id                     bigserial PRIMARY KEY,
  ai_company             text NOT NULL,                 -- 'OpenAI'|'Anthropic'|'Mistral'|...
  ai_product             text,
  sovereign_ai_program   text,                          -- 'EUCS'|'FedRAMP'|'TRA'|'IndiaAI'|...
  claimed_sovereign_zone text,
  hq_country             text,
  asn                    text,
  cidr_prefix            text,
  domain_pattern         text,                          -- 'api.openai.com'|'*.anthropic.com'
  cert_ca                text,
  infrastructure_type    text
        CHECK (infrastructure_type IS NULL OR infrastructure_type IN ('inference','training','storage','cdn')),
  verified_sovereign     boolean NOT NULL DEFAULT false,
  verification_source    text,
  notes                  text,
  last_verified_at       timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ghostroute_ai_infra_unique
  ON public.ghostroute_ai_infrastructure (ai_company, asn, cidr_prefix, domain_pattern) NULLS NOT DISTINCT;

ALTER TABLE public.ghostroute_ai_infrastructure ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghostroute_ai_infra_public_read ON public.ghostroute_ai_infrastructure;
CREATE POLICY ghostroute_ai_infra_public_read ON public.ghostroute_ai_infrastructure
  FOR SELECT TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════════════════════
-- (8) ghostroute_bgp_snapshots — longitudinal BGP path snapshots. Append-only.
--     Public-read. (Distinct from bgp_events in mig 027, which is anomaly-only;
--     this is raw path capture for the GhostRoute corpus.)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ghostroute_bgp_snapshots (
  id          bigserial PRIMARY KEY,
  prefix      text NOT NULL,
  origin_asn  text NOT NULL,
  as_path     text[],
  next_hop    text,
  communities text[],
  collector   text,                                     -- 'routeviews-sfmix'|'ripe-ris-rrc00'|...
  snapshot_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghostroute_bgp_prefix ON public.ghostroute_bgp_snapshots (prefix);
CREATE INDEX IF NOT EXISTS idx_ghostroute_bgp_asn    ON public.ghostroute_bgp_snapshots (origin_asn);
CREATE INDEX IF NOT EXISTS idx_ghostroute_bgp_at     ON public.ghostroute_bgp_snapshots (snapshot_at);

ALTER TABLE public.ghostroute_bgp_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghostroute_bgp_public_read ON public.ghostroute_bgp_snapshots;
CREATE POLICY ghostroute_bgp_public_read ON public.ghostroute_bgp_snapshots
  FOR SELECT TO anon, authenticated USING (true);

-- ════════════════════════════════════════════════════════════════════════════
-- (9) ghostroute_sequence + issue_ghostroute_receipt() — atomic GR-id issuance.
--     Mirrors oai_sequence + issue_oai() (mig 005): the ONLY write path into the
--     GR-id space, atomic UPSERT-with-increment on (year, last_seq), no burned
--     numbers. Service-role only; hidden from pg_graphql; anon/auth revoked.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ghostroute_sequence (
  year     integer PRIMARY KEY,
  last_seq bigint  NOT NULL DEFAULT 0 CHECK (last_seq >= 0)
);

CREATE OR REPLACE FUNCTION public.issue_ghostroute_receipt()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_id text;
BEGIN
  WITH bumped AS (
    INSERT INTO public.ghostroute_sequence (year, last_seq)
    VALUES (EXTRACT(YEAR FROM now())::integer, 1)
    ON CONFLICT (year) DO UPDATE
      SET last_seq = public.ghostroute_sequence.last_seq + 1
    RETURNING year, last_seq
  )
  SELECT format('GR-%s-%s', year, lpad(last_seq::text, 7, '0'))
    INTO new_id
    FROM bumped;
  RETURN new_id;
END $$;

-- Issuance must never be callable from the client.
REVOKE ALL ON FUNCTION public.issue_ghostroute_receipt() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.issue_ghostroute_receipt() FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.issue_ghostroute_receipt() FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.issue_ghostroute_receipt() TO service_role';
  END IF;
END $$;

-- Sequence table: no public access; hide from the GraphQL surface (mirrors 005d/005e).
ALTER TABLE public.ghostroute_sequence ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.ghostroute_sequence IS '@graphql({"enabled": false})';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public.ghostroute_sequence FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON public.ghostroute_sequence FROM authenticated';
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- SEED — sovereign zone classification (14 zones).
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.ghostroute_sovereign_zones (zone_code, zone_name, member_countries, gdpr_adequate, eu_ai_act_applies) VALUES
('EU', 'European Union', ARRAY['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'], true, true),
('US', 'United States', ARRAY['US'], false, false),
('CN', 'China', ARRAY['CN','HK','MO'], false, false),
('RU', 'Russia', ARRAY['RU'], false, false),
('IN', 'India', ARRAY['IN'], false, false),
('AE', 'UAE', ARRAY['AE'], false, false),
('SA', 'Saudi Arabia', ARRAY['SA'], false, false),
('UK', 'United Kingdom', ARRAY['GB'], false, false),
('CH', 'Switzerland', ARRAY['CH'], true, false),
('CA', 'Canada', ARRAY['CA'], true, false),
('JP', 'Japan', ARRAY['JP'], true, false),
('AU', 'Australia', ARRAY['AU'], false, false),
('IL', 'Israel', ARRAY['IL'], true, false),
('FIVE_EYES', 'Five Eyes', ARRAY['US','GB','CA','AU','NZ'], false, false)
ON CONFLICT (zone_code) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- SEED — country → zone mapping. Covers the countries referenced by the zone and
-- AI-infra seeds plus all EU/Five-Eyes members, enough for sovereignty.js to
-- resolve every seeded path. Added beyond the original plan (which named the
-- table but provided no rows) because P60 loads it at startup.
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.ghostroute_country_zones (country_iso, country_name, primary_zone, additional_zones, gdpr_adequate, eu_member, nato_member) VALUES
('AT','Austria','EU',NULL,true,true,false),
('BE','Belgium','EU',ARRAY['NATO'],true,true,true),
('BG','Bulgaria','EU',ARRAY['NATO'],true,true,true),
('HR','Croatia','EU',ARRAY['NATO'],true,true,true),
('CY','Cyprus','EU',NULL,true,true,false),
('CZ','Czechia','EU',ARRAY['NATO'],true,true,true),
('DK','Denmark','EU',ARRAY['NATO'],true,true,true),
('EE','Estonia','EU',ARRAY['NATO'],true,true,true),
('FI','Finland','EU',ARRAY['NATO'],true,true,true),
('FR','France','EU',ARRAY['NATO'],true,true,true),
('DE','Germany','EU',ARRAY['NATO'],true,true,true),
('GR','Greece','EU',ARRAY['NATO'],true,true,true),
('HU','Hungary','EU',ARRAY['NATO'],true,true,true),
('IE','Ireland','EU',NULL,true,true,false),
('IT','Italy','EU',ARRAY['NATO'],true,true,true),
('LV','Latvia','EU',ARRAY['NATO'],true,true,true),
('LT','Lithuania','EU',ARRAY['NATO'],true,true,true),
('LU','Luxembourg','EU',ARRAY['NATO'],true,true,true),
('MT','Malta','EU',NULL,true,true,false),
('NL','Netherlands','EU',ARRAY['NATO'],true,true,true),
('PL','Poland','EU',ARRAY['NATO'],true,true,true),
('PT','Portugal','EU',ARRAY['NATO'],true,true,true),
('RO','Romania','EU',ARRAY['NATO'],true,true,true),
('SK','Slovakia','EU',ARRAY['NATO'],true,true,true),
('SI','Slovenia','EU',ARRAY['NATO'],true,true,true),
('ES','Spain','EU',ARRAY['NATO'],true,true,true),
('SE','Sweden','EU',ARRAY['NATO'],true,true,true),
('US','United States','US',ARRAY['FIVE_EYES','NATO'],false,false,true),
('GB','United Kingdom','UK',ARRAY['FIVE_EYES','NATO'],false,false,true),
('CA','Canada','CA',ARRAY['FIVE_EYES','NATO'],true,false,true),
('AU','Australia','AU',ARRAY['FIVE_EYES'],false,false,false),
('NZ','New Zealand','FIVE_EYES',ARRAY['FIVE_EYES'],true,false,false),
('CH','Switzerland','CH',NULL,true,false,false),
('JP','Japan','JP',NULL,true,false,false),
('IL','Israel','IL',NULL,true,false,false),
('CN','China','CN',NULL,false,false,false),
('HK','Hong Kong','CN',NULL,false,false,false),
('MO','Macau','CN',NULL,false,false,false),
('RU','Russia','RU',NULL,false,false,false),
('IN','India','IN',NULL,false,false,false),
('AE','United Arab Emirates','AE',NULL,false,false,false),
('SA','Saudi Arabia','SA',NULL,false,false,false)
ON CONFLICT (country_iso) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- SEED — known AI infrastructure (11 starter rows; UNVERIFIED, see table note).
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.ghostroute_ai_infrastructure (ai_company, ai_product, asn, domain_pattern, hq_country, infrastructure_type, claimed_sovereign_zone) VALUES
('OpenAI', 'ChatGPT/API', 'AS396982', 'api.openai.com', 'US', 'inference', 'US'),
('OpenAI', 'ChatGPT/API', 'AS15169', 'openai.com', 'US', 'cdn', 'US'),
('Anthropic', 'Claude', 'AS15169', 'api.anthropic.com', 'US', 'inference', 'US'),
('Anthropic', 'Claude', 'AS16509', '*.anthropic.com', 'US', 'inference', 'US'),
('Mistral AI', 'Mistral', 'AS16276', 'api.mistral.ai', 'FR', 'inference', 'EU'),
('Mistral AI', 'Mistral', 'AS12876', '*.mistral.ai', 'FR', 'inference', 'EU'),
('Alibaba', 'Qwen/Tongyi', 'AS45102', '*.aliyuncs.com', 'CN', 'inference', 'CN'),
('Baidu', 'ERNIE', 'AS38365', '*.baidubce.com', 'CN', 'inference', 'CN'),
('DeepSeek', 'DeepSeek', 'AS138915', 'api.deepseek.com', 'CN', 'inference', 'CN'),
('Cohere', 'Command', 'AS16509', 'api.cohere.com', 'CA', 'inference', 'US'),
('xAI', 'Grok', 'AS12008', 'api.x.ai', 'US', 'inference', 'US')
ON CONFLICT DO NOTHING;

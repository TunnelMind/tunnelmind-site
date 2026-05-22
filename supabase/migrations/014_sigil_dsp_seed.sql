-- 014_sigil_dsp_seed.sql
--
-- D1 — Sigil buy-side / DSP supply graph (PR #2). The DSP catalog seed.
--
-- The `dsp` table was created in 007_supply_chain_entities.sql but has been
-- 0-rowed since. There is no public free corpus that lists every DSP — the
-- set is small (well-known ~30-50 platforms). This is a curated seed of the
-- well-known buy-side platforms, sourced from IAB Transparency Center, the
-- AdExchanger DSP map, and platforms observed in the wild via the existing
-- verify/supply_path traffic.
--
-- Decisions:
--   - `entity_slug` is NULL for the initial seed. Joining to tracker_entities
--     is a separate enrichment task; the FK is nullable in 007. Leaving it
--     NULL is honest (the data-api Worker resolves to entities on read
--     anyway).
--   - `self_serve` is TRUE for platforms that publish documented self-serve
--     account creation. CTV-walled / agency-only DSPs (DV360, Amazon DSP)
--     get FALSE.
--   - `atap_compatible` is FALSE for ALL on first seed. Flip per row as ATAP
--     integrations come online (Sigil P32 — media buyer profile).
--   - `buying_patterns` left as the schema default '[]'::JSONB; populated by
--     D1 PR #4 (opportunistic buys_through writes) as the data-api observes
--     real schain traffic.
--
-- Idempotent on `dsp.domain` (UNIQUE in 007). Re-running this migration is a
-- no-op on already-seeded rows; new additions can be made by extending the
-- VALUES list and re-applying.

INSERT INTO dsp (entity_slug, name, domain, self_serve, atap_compatible) VALUES
  -- Tier 1 — the household-name platforms.
  (NULL, 'The Trade Desk',                 'thetradedesk.com',     TRUE,  FALSE),
  (NULL, 'Google Display & Video 360',     'displayvideo.google.com', FALSE, FALSE),
  (NULL, 'Microsoft Advertising / Xandr',  'xandr.com',            TRUE,  FALSE),
  (NULL, 'Criteo',                         'criteo.com',           TRUE,  FALSE),
  (NULL, 'Amazon DSP',                     'amazon.com',           FALSE, FALSE),
  (NULL, 'StackAdapt',                     'stackadapt.com',       TRUE,  FALSE),
  (NULL, 'Yahoo DSP',                      'yahooinc.com',         FALSE, FALSE),
  (NULL, 'Adobe Advertising Cloud',        'adobe.com',            FALSE, FALSE),
  (NULL, 'MediaMath',                      'mediamath.com',        TRUE,  FALSE),
  (NULL, 'Basis Technologies (Centro)',    'basis.com',            TRUE,  FALSE),
  -- Tier 2 — large but more vertical / regional.
  (NULL, 'Quantcast',                      'quantcast.com',        TRUE,  FALSE),
  (NULL, 'Viant',                          'viantinc.com',         TRUE,  FALSE),
  (NULL, 'Simpli.fi',                      'simpli.fi',            TRUE,  FALSE),
  (NULL, 'AdRoll',                         'adroll.com',           TRUE,  FALSE),
  (NULL, 'Rocket Fuel / Sizmek',           'sizmek.com',           FALSE, FALSE),
  (NULL, 'RTB House',                      'rtbhouse.com',         TRUE,  FALSE),
  (NULL, 'Smart AdServer DSP',             'smartadserver.com',    TRUE,  FALSE),
  (NULL, 'Verve Group',                    'verve.com',            TRUE,  FALSE),
  (NULL, 'Beeswax (Comcast)',              'beeswax.com',          FALSE, FALSE),
  (NULL, 'Roku OneView',                   'roku.com',             FALSE, FALSE),
  -- Tier 3 — CTV / mobile / DOOH specialists.
  (NULL, 'tvScientific',                   'tvscientific.com',     TRUE,  FALSE),
  (NULL, 'Vibe.co',                        'vibe.co',              TRUE,  FALSE),
  (NULL, 'Hawk (Azerion)',                 'azerion.com',          TRUE,  FALSE),
  (NULL, 'Smaato DSP',                     'smaato.com',           TRUE,  FALSE),
  (NULL, 'Liftoff',                        'liftoff.io',           TRUE,  FALSE),
  (NULL, 'AppLovin',                       'applovin.com',         FALSE, FALSE),
  (NULL, 'Vistar Media (DOOH)',            'vistarmedia.com',      TRUE,  FALSE),
  (NULL, 'Hivestack (DOOH)',               'hivestack.com',        TRUE,  FALSE),
  (NULL, 'Place Exchange (DOOH)',          'placeexchange.com',    TRUE,  FALSE),
  (NULL, 'Equativ DSP',                    'equativ.com',          TRUE,  FALSE),
  -- Tier 4 — regional / specialist additions.
  (NULL, 'Mintegral',                      'mintegral.com',        TRUE,  FALSE),
  (NULL, 'Bidstack',                       'bidstack.com',         TRUE,  FALSE),
  (NULL, 'Adsmovil',                       'adsmovil.com',         TRUE,  FALSE)
ON CONFLICT (domain) DO UPDATE
  SET name = EXCLUDED.name,
      self_serve = EXCLUDED.self_serve,
      atap_compatible = EXCLUDED.atap_compatible,
      updated_at = NOW();

-- Sanity check — fail loudly if the catalog landed empty.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM dsp) < 30 THEN
    RAISE EXCEPTION '014_sigil_dsp_seed: dsp catalog has fewer than 30 rows after seed';
  END IF;
END $$;

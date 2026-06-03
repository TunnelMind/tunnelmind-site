# ADR-2026-06-P46 — Attribution-cartel OAIs (the `surveillance_bigtech` adversary class)

Date: 2026-06-02
Status: Accepted + APPLIED 2026-06-02 (additive `oai_adversary_class` table; non-destructive)
Phase: P46 (Marti-integration adversary track P45–P49; see
`docs/decisions/P45-chat-prompt-refactor.md` and the Claude Memory note
`project_p45_p49_adversary_track`).

## 1. Context

The adversary track classifies any checked entity as one of
`{human_hacker, rogue_agent, surveillance_bigtech, clean}`. Two classes already
have anchors: `human_hacker` (Scry actor classes) and `rogue_agent` (attestation
failure — OAI/receipt/preflight). `surveillance_bigtech` had none: the Tracker
lens knows the attribution cartel as tracker domains/entities, but there was no
canonical **Observed Actor** the P49 classifier could name. So a "this is
big-tech surveillance" verdict would have been a free-text guess — a
hallucination surface. P46 closes that by registering the cartel as real OAIs.

## 2. Decision

Register four entities as canonical OAIs under a new category
`surveillance.bigtech.attribution`:

| alias           | name                      | representative surveillance domains |
|-----------------|---------------------------|-------------------------------------|
| `oai:google`    | Google LLC                | google-analytics.com, googletagmanager.com, doubleclick.net, googlesyndication.com, … |
| `oai:meta`      | Meta Platforms, Inc.      | facebook.net, connect.facebook.net, fbcdn.net, atdmt.com, … |
| `oai:amazon`    | Amazon.com, Inc.          | amazon-adsystem.com, media-amazon.com, serving-sys.com, … |
| `oai:microsoft` | Microsoft Corporation     | bat.bing.com, clarity.ms, adnxs.com (Xandr), msads.net, licdn.com |

Domains are canonical, publicly-known tracking endpoints — not invented (the
"do not invent entities" foot-gun in `generate-oai-seed.js`).

### 2.1 Why these four (Josh-locked 2026-06-02)
All four run ad/identity-**attribution** surveillance at scale **and** are on the
no-big-tech prohibited-vendor list (`feedback_no_big_tech`: Oracle, Meta, Google,
AWS/Amazon, Microsoft). Naming them as adversaries is therefore fully consistent
with that standing stance — we are not transacting with them, we are classifying
them. Oracle was excluded (it shut its advertising business in 2024). Apple was
considered and excluded: it is not on the prohibited list and brands itself
privacy-pro, making it a more contestable claim better backed by direct evidence
first. The Trade Desk / LiveRamp were considered for an "identity-resolution
cartel" framing and deferred — they are adtech, not big-tech.

## 3. Category

`surveillance.bigtech.attribution` — matches the OAI category pattern
`^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`. Distinct from the seed's
`tracker.pixel.*` categories: those describe *what a tracker does*; this describes
*an adversary class the classifier routes to*. The P49 classifier maps
`category` prefix `surveillance.` → adversary_class `surveillance_bigtech`.

## 4. Discovery that reshaped the migration (2026-06-02)

The original draft tried to *register* the four as new OAIs. Smoke-testing the
apply revealed they **already exist** as `reserved` entries from the `006` seed:

| alias           | existing OAI        | seed category            |
|-----------------|---------------------|--------------------------|
| `oai:google`    | `OAI-2026-0000006`  | `tracker.pixel.advertising` |
| `oai:amazon`    | `OAI-2026-0000011`  | `tracker.fingerprinter`     |
| `oai:microsoft` | `OAI-2026-0000017`  | `tracker.pixel.advertising` |
| `oai:meta`      | `OAI-2026-0000031`  | `tracker.pixel.advertising` |

The alias guard correctly **skipped** the inserts (0 new issuance rows) — so the
registry was never touched. Issuing a *second* OAI per alias would fork canonical
identity (forbidden); overwriting the seed `category` is destructive and the `v1`
record schema (`005b`) is frozen `additionalProperties:false`, so no new field
can be added either.

**Reframe:** adversary classification is a TunnelMind *editorial judgment layered
on top of* canonical OAI identity — not a mutation of it.

## 5. What actually shipped (`022_p46_cartel_oais.sql`, APPLIED 2026-06-02)

Additive table — no identity forked, no category overwritten, no signature
fabricated:

```sql
CREATE TABLE oai_adversary_class (
  oai_id          TEXT PRIMARY KEY REFERENCES oai_registry(oai_id),
  adversary_class TEXT CHECK (adversary_class IN
                     ('human_hacker','rogue_agent','surveillance_bigtech')),
  rationale       TEXT NOT NULL,
  classified_at   TIMESTAMPTZ DEFAULT now(),
  classified_by   TEXT DEFAULT 'tunnelmind-curation'
);
-- RLS: public SELECT (the classification IS the product); writes service-role only.
```

Seeded by joining the four existing seed OAIs by alias →
`adversary_class='surveillance_bigtech'`. The P49 cross-lens classifier joins
this table; it generalizes to all three classes.

### 5.1 "Publicly active", honestly — the attestation gate dissolved
Josh chose the classification be **publicly visible**. The blocker had been:
`oai_registry.status='active' ⇒ a real ed25519 SENSOR attestation` we cannot
produce in SQL (no in-repo JS signer; fleet attestations are signed sensor-side,
Familiar/Augur Rust, Vault key, over a canonical form
`project_familiar_canonicalization` warns is easy to get wrong). That requirement
is on the *registry status*, **not** on this classification table. So
`oai_adversary_class` is **public-read NOW** and asserts the cartel classification
immediately — zero fabricated signatures. The underlying `oai_registry` rows stay
`reserved`; promoting *them* to `active` (to surface in the `/id/{OAI}` resolver)
remains an optional, separate gated step (§5.2).

### 5.2 Optional follow-on — promote the registry rows to `active`
Only needed if we want the four to also resolve in the public OAI `/id/{OAI}`
resolver (not required for the classification to be public). Needs a
curated-authority signer:
- Recommended: mint `OAI-SENSOR-tm-001` (non-geo `tm` = TunnelMind curation
  authority) + Ed25519 keypair, pubkey in `oai_sensors`, private key in Vault —
  keeps the geographic network-sensor fleet semantically clean.
- Signing happens with a Vault key, sensor-side → **Josh-gated**. Deferred; not
  blocking P49.

## 6. Consequences

- + `surveillance_bigtech` is now a queryable, OAI-anchored classification (clean
  `oai_adversary_class` JOIN) — P49 cites `oai:google` etc. with real
  `OAI-YYYY-NNNNNNN`, no guessing.
- + Non-destructive: canonical seed identities/categories untouched; fully
  reversible (`DROP TABLE`).
- + Zero fabrication; publicly visible without a fake attestation.
- + The table is class-agnostic → it is also the home for `human_hacker` /
  `rogue_agent` classifications as P49 lands.
- − The four still don't resolve in the public `/id/{OAI}` resolver (they stay
  `reserved`); that's the optional §5.2 promotion, not required here.

## 7. Done / remaining

- [x] Apply `022_p46_cartel_oais.sql` (Supabase PAT DDL path) — `[]` success.
- [x] Smoke: `oai_adversary_class` has 4 `surveillance_bigtech` rows mapped to the
      existing `oai:{google,amazon,microsoft,meta}` OAIs, `classified_by='tunnelmind-curation'`.
- [x] Non-destructive confirmed: no new OAIs issued, seed categories unchanged.
- [ ] (Optional, Josh-gated) §5.2 promote registry rows to `active` for `/id/{OAI}` resolver visibility.
- [ ] P49: classifier JOINs `oai_adversary_class`; maps Scry→`human_hacker`, attestation-failure→`rogue_agent`.

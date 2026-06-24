# REDACTION-LIST.md — what the exhibit abstracts, and why

P-GLASSBOX §0.3 / §6: the blueprint-vs-keys boundary is a business decision, not a
technical one. This file enumerates everything abstracted on the public site and the
one-line reason. Rule of thumb: **show the mechanism and the shape; abstract the
identifier.** Schema is open; bulk rows are the product and stay gated.

> Status: DRAFT for operator confirmation before publish (§5 acceptance gate, §6 knob).

| # | Abstracted on site | Shown instead | Reason |
|---|---|---|---|
| 1 | Honeypot fleet node IPs / coordinates / fingerprints (Scry/Familiar) | The label `source: 'honeypot_fleet'` + the *shape* of a recorded observation | Live coords/fingerprints let an adversary locate and evade the sensors. |
| 2 | Augur crawler request patterns / evasion signatures | That an ingest crawler exists + the normalized output schema | Publishing request patterns lets targets fingerprint and block the crawler. |
| 3 | Bulk supply-graph rows (`exchange_seat` ~900K, `sells_through` ~1.7M) | Column names + types + live aggregate counts from `/v1/stats` | The bulk graph is the monetized product; schema is open, rows are gated (§0.4). |
| 4 | Bulk `tracker_entities` / `entity_domain` rows | Schema + counts + single-entity lookups via cross-lens | Same monetize boundary as #3. |
| 5 | Any signing keys / API tokens / `.env` values | The Ed25519 verify path and public-key resolution only | Secrets authenticate; never ship. (Demo-mode HMAC in `/.well-known/` is exempt — it authenticates nothing.) |
| 6 | Specific unredacted GhostRoute subject identifiers in the live feed | Verdict + attestation tier + AS/RPKI status *shape*, sampled | Show routing-integrity mechanism without doxxing specific live subjects. |

## Code excerpts policy
Specimen excerpts (§2.3) are pulled verbatim from the named files in
`GLASSBOX-MANIFEST.md`. Permitted to show in full: normalization/transform logic,
verification logic, schema definitions, route shapes, JCS canonicalization. Elide with
explicit `… elided …` markers — never paraphrase code into something that did not ship.

## Pre-publish check (§5)
- [ ] No honeypot/Augur identifier rendered (items 1–2).
- [ ] No bulk row dump in any payload the site fetches (items 3–4).
- [ ] No secret/key in any rendered snippet or network call (item 5).
- [ ] Operator signed off on this boundary.

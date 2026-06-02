# ADR — P40: sensor attestation-tier contract (additive over A3/A4)

| | |
|---|---|
| **Status**     | Accepted |
| **Date**       | 2026-06-01 |
| **Workstream** | P40 Phase 3 — sensor contract |
| **Authors**    | Josh Moore + Claude |

## Context

P40's Phase 3 was written to "build sensor register / observe / status
endpoints." **All three already exist and are frozen.** Discovery (P40 Phase 1,
`session-notes/P40-discovery.md`) plus a direct read of the live repos confirms:

| Plan-named endpoint | What actually exists | ADR |
|---|---|---|
| `POST /v1/sensor/register` | `POST /api/v1/admin/nodes` on scry-server — `enrollNode()` into `node_registry`, fleet-cap + rapid-enroll guard + OAI cross-check | A4 |
| `POST /v1/sensor/observe` | `POST /api/v1/ingest` on `ingest.tunnelmind.ai` — signed Ed25519 wire, **frozen v1.0.0** | A3 |
| `GET /v1/sensor/status/:id` | `GET /api/v1/registry/{node_pubkey}` on scry-server — public, cached | A4 |

Rebuilding these on `data.tunnelmind.ai` would **fork the registry** — explicitly
forbidden by A3 ("we either fork the registry, fork the verifier, or break
archived signatures. None of those is acceptable") — and duplicate the signed
ingest path that `feedback_eat_own_dogfood` exists to prevent. So Phase 3 does
**not** create new endpoints.

What P40 genuinely adds is a concept the frozen contract does not yet carry:
**attestation tier**. A3 anticipated exactly this — it reserved
`metadata.attestation` as the forward-compat slot for "a microkernel producer
[to] include `{attestation: {kind: "tpm2-quote", evidence: "..."}}`" without a
wire-version bump. P40 turns that reserved slot into an enforced contract: a
sensor's observations are trustable only up to the tier its device identity has
been *registered* at. This ADR pins that contract.

Phase 2 (migration `020`) already landed the storage side on the Supabase
device-identity registry: `oai_sensors` now carries `attestation_tier`,
`node_type`, `asn`, `last_seen_at`, and the 6 minted Familiar nodes were
bootstrapped to `software`/`familiar`.

## The contract

### Tier ladder

```
self_asserted  <  software  <  tee_tpm  <  silicon_root
```

| Tier | Meaning | Evidence | Who is here today |
|---|---|---|---|
| `self_asserted` | pubkey enrolled, no device evidence | none | future contribute-and-earn third parties (A3 H2 D7) default here |
| `software`      | software-attested sensor binary | binary identity / build provenance | **the current bootstrap Familiar fleet** (6 nodes) |
| `tee_tpm`       | TEE / TPM2 quote | `metadata.attestation = {kind:"tpm2-quote", evidence:…}` | none yet (H3 path) |
| `silicon_root`  | silicon root of trust / iSIM | hardware-rooted evidence | none yet (H3 microkernel) |

The ladder is **total and ordered**. It is stored, not derived, and it is a
property of the *device identity*, not of any single observation.

### Source of truth (mirrors A4 exactly)

A4 established: the OAI belongs to Supabase `oai_sensors`; scry-server
`node_registry` *caches* it (`oai_id` column) for the ingest hot path. P40 uses
the identical split for tier:

| Question | Authoritative store | Hot-path cache |
|---|---|---|
| What tier is this sensor? | Supabase `oai_sensors.attestation_tier` | scry-server `node_registry.attestation_tier` |
| What node class? | Supabase `oai_sensors.node_type` | scry-server `node_registry.node_type` |

The cache is populated at enroll time from the same Supabase cross-check that A4
already performs (`crossCheckOaiBinding`). No new round-trip on the ingest hot
path — the value is read locally by `lookupActiveNode(pubkey)`, exactly as
`oai_id` is today.

### Tier ceiling — the enforced rule

> A sensor MUST NOT have an observation trusted above the tier at which its
> device identity is registered.

Concretely, at ingest:

1. The wire format is **unchanged** (A3 v1.0.0 holds). Tier is never a required
   wire field. A producer claiming a tier does so via the reserved
   `metadata.attestation` object — optional, as A3 froze it.
2. The verifier checks the signature exactly as before.
3. The verifier reads the *registered* tier from `node_registry`
   (`self_asserted` for any node not yet upgraded).
4. If `metadata.attestation` claims a tier **above** the registered tier, the
   claim is **clamped to the registered tier** (not rejected — the observation
   is still valid evidence at the registered tier; only the inflated claim is
   dropped). The accepted tier is recorded on the observation.
5. A claim **at or below** the registered tier is honoured as-is.

This makes tier a *floor set by enrollment*, never something a sensor can
self-elevate on the wire. Elevating a real sensor's tier (e.g. a node gains a
TPM) is a registry operation — update `oai_sensors.attestation_tier`, re-sync
the `node_registry` cache — not a wire change. This is the same operational
(not protocol) posture A4 took for OAI rotation.

### `node_type`

`node_type` is an open `text` attribute, default `'familiar'`. There is exactly
one node class in existence today: `familiar`. The column carries **no CHECK
constraint** enumerating future classes — earlier draft comments naming
`lantern`/`veil`/`echo` were speculative and are not part of this contract.
New classes are added by writing new values, no migration.

### Public surfacing

- `GET /api/v1/registry/{node_pubkey}` gains `attestation_tier` and `node_type`
  in its response object (additive — old clients ignore unknown keys).
- The OAI resolver's `fetchSensor` select (`oai-resolver/src/supabase.js`) gains
  `attestation_tier` so `GET /id/OAI-SENSOR-{cc}-{seq}` can report device
  assurance. Additive to the select list.

## Versioning policy

Non-breaking by construction, same discipline as A3/A4:

- **No wire-format change.** Tier rides the already-reserved `metadata.attestation`
  slot; it is never required. Old Familiars that send no attestation are treated
  as `self_asserted`-claim / registered-tier-honoured — i.e. unchanged behaviour,
  since the bootstrap fleet is registered at `software`.
- **No new required field** anywhere — registry, resolver, or response.
- New endpoints: **none.** Phase 3 reuses A3/A4 surfaces.
- A future ADR mandating a *minimum* tier for a given consumer (e.g. preflight
  refusing `self_asserted` evidence) is its own gate — P40 does not pre-commit.

## Consequences

- **The bootstrap fleet keeps working with zero change.** All 6 nodes are
  registered `software`; they send no `metadata.attestation`; their observations
  are accepted at `software` exactly as before.
- **Tier can never be forged upward on the wire** — it is clamped to the
  enrolled floor. Forging downward is possible but pointless (a sensor
  understating its own assurance).
- **Storage is live** (migration 020, Phase 2); **the scry-server + resolver code
  is implemented and staged 2026-06-01** (Josh cleared scry-server): schema
  `007_p40_attestation_tier.sql`, `src/lib/attestation.js` (clamp, unit-tested
  9/9), the `crossCheckOaiBinding` tier-pull, the `processOne` clamp + `accepted_tier`
  column, and the registry/resolver response additions. **Deploy stays Josh's and
  is COUPLED** — schema 007 must apply to the VPS Postgres before/with the code
  deploy, else the new `SELECT attestation_tier,node_type` errors. Sequence in
  `session-notes/P40-discovery.md`.
- **No hardware opened.** `tee_tpm` and `silicon_root` are defined slots with no
  producer yet — identical posture to A4's "interface only, no hardware."
- **`sensor_observations` (Supabase, migration 020) is NOT the ingest target.**
  The signed corpus lives in scry-server `observations` (A3). `sensor_observations`
  is reserved as a public, RLS-readable *projection* surface for the
  witnessability pillar; populating it is a later-phase decision, not part of
  this contract.

## Cross-references

- ADR-2026-05-A3 — frozen wire contract; reserved `metadata.attestation`; parent
- ADR-2026-05-A4 — OAI device identity; the "Supabase authoritative,
  node_registry caches" pattern P40 reuses for tier
- `supabase/migrations/020_p40_temporal_dsp_sensors.sql` — Phase 2 storage (live)
- `scry-server/src/routes/admin.js` — `postEnroll` / `crossCheckOaiBinding`
- `scry-server/src/routes/registry.js` — public status lookup
- `scry-ingest/src/verify.js`, `src/observations.js` — where the clamp lands
- `oai-resolver/src/supabase.js` — `fetchSensor` select to extend
- `session-notes/P40-discovery.md` — Phase 1 drift record + gate decisions
- [tunnelmind_question](../../Obsidian%20Vault/Claude%20Memory/tunnelmind_question.md) — pillars 2 (provenance) + 3 (witnessability)

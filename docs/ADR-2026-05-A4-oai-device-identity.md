# ADR — A4: extend OAI to device identity (interface only, no hardware)

| | |
|---|---|
| **Status**     | Accepted |
| **Date**       | 2026-05-30 |
| **Workstream** | A4 — parallel H1 item of the 2026-05-22 thesis-sharpening pivot |
| **Authors**    | Josh Moore + Claude |

## Context

ADR-2026-05-A3 froze the signed-ingest wire contract at v1.0.0 and pinned `node_pubkey` (raw Ed25519, 32 bytes) as the **cryptographic** producer identity. Pubkeys are excellent invariants but unreadable: a verifier that successfully checks a signature still has to ask *"who is `2a7459746f6d…`?"* to answer the human-legible question.

OAI v1 (the Observed Actor Identifier standard, `tunnelmind.ai/oai/standard`) already mints a public-facing handle for sensor devices: `OAI-SENSOR-{cc}-{seq}` (e.g. `OAI-SENSOR-us-001`). The Supabase `oai_sensors` table records `sensor_id ↔ pubkey_ed25519` and the resolver at `tunnelmind.ai/id/OAI-SENSOR-us-001` already serves the OAI→pubkey direction.

The reverse direction — *given a pubkey I just verified, what is its public OAI?* — required an extra lookup against the resolver's backing store. scry-server itself didn't know.

A4 closes that gap *on the registry side only*. Wire format is unchanged (ADR-A3 explicitly promised this); no hardware is involved; the Supabase OAI registry remains the source of truth for the OAI itself.

## The contract

### Registry-side extension

The `node_registry` table (Postgres on scry-server) gains one nullable column:

```sql
ALTER TABLE node_registry
    ADD COLUMN IF NOT EXISTS oai_id TEXT;

ALTER TABLE node_registry
    ADD CONSTRAINT node_registry_oai_id_format
    CHECK (oai_id IS NULL OR oai_id ~ '^OAI-SENSOR-[a-z]{2}-[0-9]{3}$');

CREATE UNIQUE INDEX uq_node_registry_active_oai
    ON node_registry(oai_id)
    WHERE revoked_at IS NULL AND oai_id IS NOT NULL;
```

A node MAY be enrolled without an OAI (pre-A4 nodes, third-party submitters who don't claim an OAI, etc.). A node enrolled WITH an OAI carries it as a stable public handle for the lifetime of the enrollment. The partial unique index enforces *one active OAI binds to at most one active node* — succession is allowed only after the predecessor is revoked.

### Binding rule

When `POST /api/v1/admin/nodes` (admin-only) supplies an optional `oai_id`:

1. Format check: must match `OAI-SENSOR-{cc}-{seq}` (else `400`).
2. **Cross-check against Supabase** `oai_sensors`: the row's `pubkey_ed25519` MUST equal the enrollment's `node_pubkey` (case-insensitive). Else `409` with `oai_pubkey_mismatch`.
3. If Supabase is unreachable in dev (no `SUPABASE_URL`), the cross-check is skipped — the admin is trusted in that mode. Production always sets both env vars.

The cross-check exists because misbinding poisons the resolver's identity layer: a wrong binding would make the resolver report "pubkey X is OAI-SENSOR-us-001" while signed observations from pubkey X are actually from a different sensor. The single source of truth is `oai_sensors.pubkey_ed25519`; the registry merely *agrees* with it. (See [feedback_no_poisoning](../../Obsidian%20Vault/Claude%20Memory/feedback_no_poisoning.md).)

### Public lookup endpoint

```
GET /api/v1/registry/{node_pubkey}    → 200
GET /api/v1/registry/{node_pubkey}    → 404 (unknown or revoked)
GET /api/v1/registry/{not-hex64}      → 400
```

Returns:

```json
{
  "node_pubkey": "2a7459746f6dec358edbdae24dd176d2a8e8fec10ee4fbfb8c1c9b2fbf55ce99",
  "node_id":     "us-east-1-bootstrap",
  "oai_id":      "OAI-SENSOR-us-001",
  "enrolled_at": 1717000000000,
  "asn":         "AS24940",
  "country":     "US",
  "label":       null
}
```

`Cache-Control: public, max-age=60, stale-while-revalidate=300`. No authentication. **Registry is intentionally public per ADR-A3.**

Revoked nodes return `404` because they SHOULD NOT be trusted as producers — exposing them encourages stale trust. The R2 signed-record archive remains the audit trail for revoked-node history.

### Resolver / registry contract

Both surfaces MUST agree:

| Question | Authoritative answer | Cross-checked at |
|---|---|---|
| Given OAI, what pubkey? | Supabase `oai_sensors.pubkey_ed25519` | resolver `GET /id/{OAI}` |
| Given pubkey, what OAI? | scry-server `node_registry.oai_id` | `GET /api/v1/registry/{pubkey}` |
| Are these consistent? | enforced at enroll time | admin `POST /api/v1/admin/nodes` cross-check |

If `oai_sensors.pubkey_ed25519` is later rotated **without** re-enrolling the node, the registry becomes stale. Operationally this is treated as a registry incident: the old binding MUST be revoked and a new pubkey enrolled with the same OAI. The unique index allows re-binding after revocation; it does NOT allow live two-pubkey ambiguity.

### Wire format

Unchanged. `node_pubkey` remains the only producer identity transmitted on the wire. The OAI is NEVER required to verify a signature; A4 is purely a *resolution layer* atop A3.

## Versioning policy

A4 is non-breaking by construction:

- No new required field anywhere.
- Old clients that don't send `oai_id` continue to enroll exactly as before.
- Old verifiers that don't read `oai_id` from the registry continue to ingest exactly as before.
- The new endpoint is additive.

If a future ADR adds *required* OAI binding (e.g. mandate OAI for contribute-and-earn), that would be its own ADR with its own gate — A4 does not pre-commit to it.

## Consequences

- **`OAI-SENSOR-us-001` is backfilled at deploy time.** The one already-minted sensor OAI is bound to the matching pubkey via `scripts/backfill-oai-us-001.js`; idempotent, safe to re-run.
- **The resolver behaviour is unchanged.** OAI v1's `GET /id/OAI-SENSOR-us-001` already returned `pubkey_ed25519`; A4 just makes the reverse lookup local to scry-server.
- **Witnesses and receipts can carry `oai_id` cheaply.** Anything that already calls `lookupActiveNode(pubkey)` (ingest path, future witness emitter, MCP tools) gets the OAI for free without a Supabase round-trip — important for the H2 throughput targets.
- **OAI rotation is operational, not protocol.** The protocol enforces the snapshot invariant; rotation policy is documented in the ops runbook (re-enroll required).
- **No hardware path opened.** A4 is interface-only. Future ADRs covering iSIM / TPM evidence may bind to the same `oai_id` slot — see the `metadata.attestation` forward-compat slot in ADR-A3 — but A4 does not prescribe their shape.

## Cross-references

- ADR-2026-05-A3 — frozen wire contract; A4's parent ADR
- `scry-server/schema/006_oai_device_identity.sql` — the migration applied by A4
- `scry-server/src/routes/registry.js` — public lookup endpoint
- `scry-server/scripts/backfill-oai-us-001.js` — idempotent backfill
- `oai-resolver/src/supabase.js` — `fetchSensor` (OAI → pubkey)
- [project_a3_signed_ingest_contract](../../Obsidian%20Vault/Claude%20Memory/project_a3_signed_ingest_contract.md)
- [project_tunnelmind_roadmap](../../Obsidian%20Vault/Claude%20Memory/project_tunnelmind_roadmap.md) — H1 #9 (this)
- [tunnelmind_question](../../Obsidian%20Vault/Claude%20Memory/tunnelmind_question.md) — pillars 2 (provenance) and 3 (witnessability)

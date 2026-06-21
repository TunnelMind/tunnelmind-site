# TunnelMind Reconciliation Verdict v1.0

**Status:** v1 — Live · **Published:** 2026-06-16 · **License:** CC BY 4.0

A **reconciliation verdict** answers one question about a key-addressed actor on
the open internet:

> **Does what this key *claims* about itself match what the network has *seen it
> do*?**

TunnelMind is the **reconciliation layer above all roots of trust**. It owns no
silicon and operates no root of its own — it reads every root and reconciles two
independent sides of trust for any public key:

- **claim** — what the key can prove about itself: its **attestation tier**
  across roots of trust (a bare Ed25519 self-attestation, or a hardware/platform
  attestation presented as a RATS/EAT token), and
- **conduct** — what the graph has observed the key's subject do across
  TunnelMind's four lenses (Scry attacker intelligence × Sigil supply graph ×
  GhostRoute routing integrity × the Tracker corpus).

The output is a single verdict — and it is **portable and offline-verifiable**:
no one has to trust TunnelMind to use it.

---

## 1. The endpoint

```
GET https://data.tunnelmind.ai/v1/verdict/{key}
```

`{key}` is an Ed25519 public key as **hex** (64 chars), **base64url** (43
chars), or **did:key** (`did:key:z6Mk…`). All query parameters are optional:

| Param | Meaning |
|-------|---------|
| `subject` | An ip / domain / ASN / entity\_slug the key claims to act as. Drives the **conduct** side. Omit for a claim-only verdict. |
| `nonce`, `sig` | A bare-Ed25519 self-attestation: `sig` is a base64 Ed25519 signature over `nonce`, proving control of the key. |
| `eat` | A RATS/EAT compact JWS (EdDSA) attesting this key, signed by a trusted anchor. |
| `claims` | URL-encoded JSON array of raw claim objects (overrides the convenience params). |

The MCP tool `verdict_lookup` (at `mcp-data.tunnelmind.ai`) exposes the same
call to agents.

A bare, unattested key still returns a verdict — at the `self-asserted` tier.
**Attestation is never required to participate.**

---

## 2. The attestation tier ladder

Tier is always *measured / anchored*, **never** taken from a claimant's
say-so. A token may *claim* a higher tier than its signing anchor is trusted to
assert; the recorded tier is capped at the anchor's `max_tier`.

```
self-asserted  <  software  <  tee-tpm  <  silicon-root
```

- **self-asserted** — the key proved control of itself (signed the nonce). Floor.
- **software** — an OS/isolate-enforced software attestation.
- **tee-tpm** — a TEE or TPM-rooted attestation.
- **silicon-root** — a hardware silicon root of trust.

Each root normalizes to one shape — `{ root, tier, verified, props }` — so the
layer can compare a claim from any root against any other and against conduct.

---

## 3. The verdict

```jsonc
{
  "key": { "hex": "…", "b64url": "…", "did": "did:key:z6Mk…" },
  "claim": {
    "best_verified_tier": "tee-tpm",
    "key_control_proven": true,
    "binding_nonce": "…",
    "roots": [ { "root": "ed25519-self", "tier": "self-asserted", "verified": true, "props": {…} },
               { "root": "eat",          "tier": "tee-tpm",       "verified": true, "props": {…} } ]
  },
  "conduct": { "subject": {…}, "trust_score": 0.31, "confidence": 0.94, "observed": true },
  "reconciliation": {
    "contradictions": [
      { "type": "claim_exceeds_conduct", "claim_trust": 0.85, "conduct_trust": 0.31, "delta": 0.54 }
    ],
    "claim_vs_conduct_delta": 0.54,
    "verdict": { "tier": "tee-tpm", "reputation": 0.31, "flags": ["over_claim", "key_control_proven"], "confidence": 0.94 }
  },
  "receipt": { /* self-verifying — see §4 */ }
}
```

**Contradictions** are the reconciliation signal no single root can produce:

- `claim_exceeds_conduct` — the key attests a high tier but behaves as a
  low-trust node (the over-claim signal).
- `unverified_claim` — a claim was *presented* but failed to verify.
- `key_control_unproven` — a claim was presented but no root proved control of
  the key.

### The privacy line

Keys are linked into one identity **only** when the actor cryptographically
proves control of each — **never** inferred from behavioral correlation, shared
infrastructure, or timing. An attestation that names a *different* subject key is
rejected, not silently merged.

---

## 4. The verdict is self-verifying

Every verdict is published as a **TunnelMind Receipt v1.0** carrying a
self-verification triple. Given the receipt bytes **and the witness public keys
carried inline**, anyone re-derives the verdict and checks log inclusion
**offline** — with no call back to TunnelMind:

1. **Receipt signature** — Ed25519 over the canonical receipt (RFC 8785 / JCS).
2. **Payload integrity** — `payload_hash` over the canonical payload (SHA-256).
3. **Log inclusion** — an RFC 6962 Merkle inclusion proof of the receipt's leaf
   into a signed **checkpoint**.
4. **Witness cosignature(s)** — Ed25519 over the canonical checkpoint.
5. **Verdict re-derivation** — re-running the same reconciliation over the
   embedded claim + conduct must reproduce the published verdict exactly.

This builds on the [TunnelMind Receipt Format v1.0](/standards/receipt-format/v1)
envelope and is profiled as a RATS/EAT serialization
([EAT Profile v0.1](/eat/profile/v0.1)).

A reference standalone verifier ships with the API
(`scripts/verify-verdict.mjs`) and performs all five checks with zero network
access — the verifier *is* the specification.

---

## 5. Design invariants

1. **Trust binds to the key, never the transport.** The verification core is
   transport-blind; each transport's only job is to hand over the authenticated
   peer key.
2. **`attestation_tier` is measured, never self-asserted** — and cannot be
   retrofitted onto a claim after the fact.
3. **Receipts are self-verifying** — inclusion proof + witness cosignatures +
   checkpoint are mandatory fields.
4. **Actor-proven linking only** — the privacy line of §3.
5. **Open to verify, never a root.** TunnelMind is the neutral layer *above* the
   roots, not a competing root of trust.

---

*Reconciliation Verdict v1.0 is published under CC BY 4.0. It composes the
[Receipt Format](/standards/receipt-format/v1), [ATAP](/atap/standard), and
[EAT Profile](/eat/profile/v0.1) standards. Public comment via the
[standards hub](/standards).*

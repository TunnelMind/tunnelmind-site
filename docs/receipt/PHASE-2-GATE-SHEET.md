# P38 Receipt Format — Phase 2 gate sheet

**Purpose:** structured yes/no on every Phase 2 deliverable so you can pass the Phase 2 → Phase 3 gate in one read.

**Memory drift note (2026-05-31):** the governing-plan memo said Phase 2 was "committed `4f5fc62`, NOT pushed." Verified — that commit IS on `origin/main`. Deliverables live at `docs/receipt/{RECEIPT-FORMAT-v1.0.md, receipt-schema.json, receipt-example-{scry,sigil}.json, DECISION-LOG-v1.0.md}`. Both examples verify and are schema-valid (per the commit message + decision log).

---

## A. Phase 2 deliverables — confirm complete?

| # | Artifact | Loc | State | Approve? |
|---|---|---|---|---|
| 1 | `RECEIPT-FORMAT-v1.0.md` — 165-line spec, DRAFT status, JSON serialization, companion to EAT profile | `docs/receipt/RECEIPT-FORMAT-v1.0.md` | On disk + pushed | ☐ yes / ☐ rework |
| 2 | `receipt-schema.json` — JSON Schema draft 2020-12 | same dir, 128 lines | On disk + pushed | ☐ yes / ☐ rework |
| 3 | `receipt-example-scry.json` — generated with ephemeral key, verifies, schema-valid | same dir | On disk + pushed | ☐ yes / ☐ rework |
| 4 | `receipt-example-sigil.json` — generated with ephemeral key, verifies, schema-valid | same dir | On disk + pushed | ☐ yes / ☐ rework |
| 5 | `DECISION-LOG-v1.0.md` — 75-line decision log capturing the calls below | same dir | On disk + pushed | ☐ yes / ☐ rework |

If 1-5 all "yes" → proceed to Phase 3 scope below.

---

## B. Design calls already locked (per your "whatever is best" delegation 2026-05-27) — confirm or override

| # | Call | Locked decision | Confirm? |
|---|---|---|---|
| 6 | Signature algorithm | Ed25519 + explicit `algorithm` field (allows future migration) | ☐ keep / ☐ override |
| 7 | Timestamp proof | `timestamp_proof: "none"` for v1.0; RFC-3161 as fast-follow | ☐ keep / ☐ override |
| 8 | Hash chain | Per-node hash chain (each issuer signs its own chain) | ☐ keep / ☐ override |
| 9 | Payload | Full inclusion in the receipt (not just a hash reference) | ☐ keep / ☐ override |
| 10 | Format ↔ EAT | JSON now + EAT as executable mapping (one claim set, two serializations) | ☐ keep / ☐ override |
| 11 | Signing key | New dedicated `TUNNELMIND_RECEIPT_SIGNING_KEY` (NOT reuse `AUDIT_SIGNING_KEY`) | ☐ keep / ☐ override |
| 12 | `receipt-verify` repo home | New public `TunnelMind/receipt-verify` (TS, npm `@tunnelmind/receipt-verify`) | ☐ keep / ☐ override |
| 13 | `eat-js` repo home | `packages/eat-js` inside the `atap` monorepo | ☐ keep / ☐ override |
| 14 | STIX/TAXII host | Data-API path `/taxii2/…` (not a new subdomain) | ☐ keep / ☐ override |
| 15 | Legacy compat | Existing `/v1/receipt/generate` + `/verify` **wrapped, not replaced** | ☐ keep / ☐ override |
| 16 | Signed-input formula | `JCS(receipt − payload − signature.value)`; payload bound via `payload_hash = sha256(JCS(payload))` | ☐ keep / ☐ override |
| 17 | Added fields vs ATAP | `signature.key_id`, optional `subject` (EAT `sub`), signed `extensions`, chain in signed input | ☐ keep / ☐ override |

---

## C. Phase 3 scope unlocked once A + B confirmed

Phase 3 = **signing infrastructure**. Concrete tasks Claude executes immediately on approval:

1. Generate `TUNNELMIND_RECEIPT_SIGNING_KEY` (Ed25519 PKCS#8 base64); add to vault + VPS `.env` + Worker secret (your dashboard click for the Worker secret, everything else Claude-actionable).
2. Port the signer from `tunnelmind-data-api/api/utils/atap-witness.js` to scry-server Node (today scry-server can `verifySignature` but not sign — the only material crypto gap).
3. Publish `/.well-known/receipt-signing-key.json` on tunnelmind.ai (key bundle for offline verifiers).
4. Publish the long-missing `/.well-known/atap.json` (expected by `signing.js`; not currently served).
5. Wrap `/v1/receipt/generate` to emit the new format alongside the legacy format (per #15).
6. Update `RECEIPT-FORMAT-v1.0.md` status DRAFT → published; flip the example links to live curl one-liners against the deployed endpoints.

Estimated effort: ~1 session for #1-#5, plus key-rotation runbook for #1. Phase 4 (validator package) comes next; can run in parallel with Phase 3 #4-#6.

---

## D. Open questions that didn't get a "whatever is best" answer

| # | Open question | Default if you don't pick |
|---|---|---|
| 18 | **Public-comment window length** | 90 days (matches ATAP + OAI) |
| 19 | **Publish receipt spec at `/standards/receipt-format/v1`** or under `/atap/`? | `/standards/receipt-format/v1` — it's a peer of ATAP, not subordinate. |
| 20 | **Key rotation cadence for `TUNNELMIND_RECEIPT_SIGNING_KEY`** | 12 months default + immediate rotation on compromise; both keys advertised in the well-known during overlap window. |

---

## TL;DR

Phase 2 deliverables exist, are pushed, are internally consistent. The 12 design decisions in (B) are all your prior "whatever is best" delegated calls. **If you confirm A + B as-is, Phase 3 starts immediately and you get a signed-everywhere TunnelMind by ~1 working session of Claude time.**

Override the smallest possible thing rather than the whole set; the decision log captures the rationale for each lock so you can target a single line.

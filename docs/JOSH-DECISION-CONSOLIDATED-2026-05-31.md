# Josh decision document — consolidated 2026-05-31

Single document covering everything currently waiting on your judgement: Show HN (#48), P38 Receipt Phase 2 → Phase 3 gate, and EAT Profile v0.1. Fill in checkboxes, sign at the bottom, hand back. Claude executes on whatever you mark approved.

## How recommendations are marked

Each option carries up to one of these badges:

- 🟢 **Recommended (agent + human)** — best for both AI-agent consumers and human users; pick this unless you have a reason
- 🤖 **Recommended (agent)** — best for agent consumers when it diverges from the human-optimal choice
- 👥 **Recommended (human + agent)** — best balanced choice when pure agent-optimal would over-optimize at humans' expense

Most rows are 🟢 (the whole stack is agent-first, and the humans involved are the agent-builders themselves). I've flagged the genuine splits — they're rare. Override anything you disagree with; "rework" any whole row that's wrong.

---

# PART 1 — Show HN (#48 from outside-in audit)

Lowest-stakes, fastest to clear. Five decisions.

## 1.1 Title

| | Option | Recommendation |
|---|---|---|
| ☐ | **"Show HN: Pre-flight 'should I act?' API for AI agents on the open web"** | 🤖 **Recommended (agent)** — leads with the novel agent value prop; HN-AI subset is the biggest engaged audience right now |
| ☐ | **"Show HN: Open-source ads.txt + sellers.json parsers + a verification API"** | 👥 **Recommended (human + agent)** — concrete artifacts, broader audience (security + ad-tech + developers), lower risk of "yet another AI thing" backlash |
| ☐ | **"Show HN: A CVE-style identifier standard for entities that watch traffic"** | (Niche — leads with OAI; spec-curious audience only) |
| ☐ | **Other:** ________________________________________________ | |

**Split rationale.** Pure agent-best = Title 1 (direct hit on agent-builders). Human+agent-best = Title 2 (broader reach into people who'd evaluate-then-deploy agents). I lean Title 1 because Josh's whole stack positioning is agent-first per [[feedback_claude_first]] — but Title 2 is the safe play if you think HN-AI fatigue is real this week.

## 1.2 Post body

☐ **Use the recommended ~280-word draft as-is** 🟢 **Recommended (agent + human)** — leads with the agent angle (matches Title 1), names Sigil corpus + 3 OSS repos + OAI standard, honest "solo" close.

☐ **Use the draft but swap intro paragraph to lead with `@tunnelmindai/checks`** — better fit if you pick Title 2.

☐ **Rewrite. Notes:** ________________________________________

**Full draft body:** see `docs/launches/SHOW-HN-DRAFT-2026-05.md` §"Recommended post body".

## 1.3 Opening author-comment

☐ **Use the recommended comment as-is** 🟢 **Recommended (agent + human)** — preempts "why not GreyNoise/Spur," surfaces rate-limit specifics, includes the deliberate "known sharp edge" honesty signal.

☐ **Rewrite. Notes:** ________________________________________

**Full draft comment:** see `docs/launches/SHOW-HN-DRAFT-2026-05.md` §"Opening author-comment".

## 1.4 Timing window

☐ **Tuesday or Wednesday, 9-11am US Pacific** 🟢 **Recommended (agent + human)** — best engagement window for builder audiences

☐ **Other:** __________________ (date/time)

**Avoid:** Mondays, Fridays, weeks with major launches (Apple events, AWS re:Invent, etc.).

## 1.5 Pre-flight smoke

Before posting, run the 6-item checklist in `docs/launches/SHOW-HN-DRAFT-2026-05.md` §"Pre-flight checklist." If any fail, fix before submitting (cached 404s or down endpoints during launch are unrecoverable).

☐ **I will run the checklist before posting**

---

# PART 2 — P38 Receipt Format → Phase 3 signing gate

Largest decision block. 17 design rows + 3 open Qs. Most are confirms of prior "whatever is best" delegation; if those are still your view, just check the recommended boxes and move on.

## 2.1 Phase 2 deliverables — confirm complete?

All 5 exist on disk + pushed to `origin/main` at commit `4f5fc62`. Examples both verify and are schema-valid.

| | Artifact | Confirm |
|---|---|---|
| ☐ | `docs/receipt/RECEIPT-FORMAT-v1.0.md` (165-line spec, DRAFT) | 🟢 keep |
| ☐ | `docs/receipt/receipt-schema.json` (128 lines, draft 2020-12) | 🟢 keep |
| ☐ | `docs/receipt/receipt-example-scry.json` | 🟢 keep |
| ☐ | `docs/receipt/receipt-example-sigil.json` | 🟢 keep |
| ☐ | `docs/receipt/DECISION-LOG-v1.0.md` (75 lines) | 🟢 keep |

If any are "rework," note the artifact + the issue: ____________________________________

## 2.2 Design calls already locked — confirm or override

| | # | Call | Locked decision | Status |
|---|---|---|---|---|
| ☐ | 6 | Signature algorithm | **Ed25519 + explicit `algorithm` field** | 🟢 **Recommended (agent + human)** — Ed25519 is the de-facto standard; the `algorithm` field future-proofs without breaking v1.0 |
| ☐ | 7 | Timestamp proof | **`timestamp_proof: "none"` in v1.0, RFC-3161 fast-follow** | 🟢 **Recommended (agent + human)** — field exists in the wire shape now (null/none), so RFC-3161 lands non-breaking. Compliance buyers can deploy v1.0 today |
| ☐ | 8 | Hash chain | **Per-node hash chain** (each issuer signs its own) | 🟢 **Recommended (agent + human)** — parallel-verifiable, privacy-preserving, no fleet-wide state dependency |
| ☐ | 9 | Payload | **Full inclusion** in the receipt | 🟢 **Recommended (agent + human)** — offline-verifiable in one round-trip; hash-references add a dep on host availability |
| ☐ | 10 | Format ↔ EAT | **JSON now + EAT as executable mapping** (one claim set, two serializations) | 🟢 **Recommended (agent + human)** — JSON for the open web + humans + MCP; EAT for RATS/TEE-aligned consumers |
| ☐ | 11 | Signing key | **New dedicated `TUNNELMIND_RECEIPT_SIGNING_KEY`** (NOT reuse AUDIT_SIGNING_KEY) | 🟢 **Recommended (agent + human)** — key separation = rotation per concern; audit-key compromise doesn't compromise receipt key |
| ☐ | 12 | `receipt-verify` repo home | **New public `TunnelMind/receipt-verify`** (TS, npm `@tunnelmind/receipt-verify`) | 🟢 **Recommended (agent + human)** — standalone repo + standalone npm package = minimal install footprint for agent libs |
| ☐ | 13 | `eat-js` repo home | **`packages/eat-js` inside the atap monorepo** (but ships as its own npm package) | 🟢 **Recommended (agent + human)** — source colocation eases contribution; separate npm scope keeps consumer install small |
| ☐ | 14 | STIX/TAXII host | **Data-API path `/taxii2/…`** (not a new subdomain) | 🟢 **Recommended (agent + human)** — fewer DNS hops, fewer certs, easier auth reuse |
| ☐ | 15 | Legacy compat | Existing `/v1/receipt/generate` + `/verify` **wrapped, not replaced** | 🟢 **Recommended (agent + human)** — deployed clients keep working; new format opt-in via content negotiation |
| ☐ | 16 | Signed-input formula | `JCS(receipt − payload − signature.value)`; payload bound via `payload_hash = sha256(JCS(payload))` | 🟢 **Recommended (agent + human)** — JCS is RFC-8785, ubiquitous; payload-hash binding lets agents verify the inner payload without re-serializing |
| ☐ | 17 | Added fields vs ATAP | `signature.key_id` + optional `subject` (EAT `sub`) + signed `extensions` + chain in signed input | 🟢 **Recommended (agent + human)** — key_id supports rotation; signed extensions = forward-compatible without breaking old verifiers |

Override any individual cell: ____________________________________

## 2.3 Open questions not in the original delegation

| | # | Question | Options | Recommendation |
|---|---|---|---|---|
| ☐ | 18 | **Public-comment window length** | 30 / 60 / **90** / 180 days | 🟢 **Recommended (agent + human): 90 days** — matches ATAP + OAI; gives auditor / standards-watcher orgs time to engage |
| ☐ | 19 | **Publish URL** | `tunnelmind.ai/standards/receipt-format/v1` **vs** `tunnelmind.ai/atap/receipt-format/v1` | 🟢 **Recommended (agent + human): `/standards/receipt-format/v1`** — peer-of-ATAP framing; agents browsing `/standards` find all standards at one level |
| ☐ | 20 | **Key rotation cadence** | (a) 6 months default · **(b) 12 months default + immediate on compromise; overlap window publishes both keys** · (c) annual + no overlap | 🟢 **Recommended (agent + human): (b)** — 12mo balances operational burden vs. compromise window; overlap-window is critical for agents that cache key bundles |

## 2.4 What unblocks once §2.1 + §2.2 + §2.3 confirmed

Claude executes immediately on your approval:

1. Generate `TUNNELMIND_RECEIPT_SIGNING_KEY` (Ed25519 PKCS#8 base64); add to vault + VPS `.env` + Worker secret (your dashboard click for the Worker secret, everything else Claude-actionable).
2. Port the signer from `tunnelmind-data-api/api/utils/atap-witness.js` to scry-server Node.
3. Publish `/.well-known/receipt-signing-key.json` on tunnelmind.ai.
4. Publish the long-missing `/.well-known/atap.json`.
5. Wrap `/v1/receipt/generate` to emit the new format alongside the legacy.
6. Update spec status DRAFT → published; flip example links to live curl one-liners against the deployed endpoints.

Estimated effort: ~1 session for #1-#5, plus a key-rotation runbook for #1.

---

# PART 3 — EAT Profile v0.1

14 calls total (10 baked-in + 4 follow-on Qs). Most are 🟢; one genuine agent-vs-human split flagged at #3.10.

## 3.1 Calls baked into the draft — confirm

| | # | Call | Options | Recommendation |
|---|---|---|---|---|
| ☐ | 1 | **Form** | Serialization-over-ATAP **vs** ATAP replacement | 🟢 **Recommended (agent + human): serialization-over-ATAP** — already decided 2026-05-27; reversing means a rewrite. ATAP stays canonical; EAT is a parallel wire |
| ☐ | 2 | **Serializations** | CBOR/CWT only **·** JSON/JWT only **·** Both | 🟢 **Recommended (agent + human): Both** — verifier MUST emit both; relying parties MAY accept either. CWT for TEEs, JWT for web/MCP/debug |
| ☐ | 3 | **Signing algorithm** | Ed25519 **·** ES256 **·** RS256 | 🟢 **Recommended (agent + human): Ed25519** — matches existing ATAP keys; zero new key infra |
| ☐ | 4 | **TM-specific claims (6 total)** | Keep all 6 **·** drop graph-context **·** drop deviation-flags **·** drop both | 🟢 **Recommended (agent + human): keep all 6** — the 4 new-signal claims (consistency-score, observation-depth, deviation-flags, graph-context) ARE the cross-lens enrichment; cutting any weakens the agent value prop |
| ☐ | 5 | **Scoring policy** | Algorithm private + output auditable (replay-verifiable) **·** fully open algorithm **·** fully closed (no replay) | 🟢 **Recommended (agent + human): private + auditable** — exact embodiment of [[project_open_protocol_layer]] open/paid line |
| ☐ | 6 | **CBOR keys** | Use private-use range (defer IANA) **·** pre-register with IANA now | 🟢 **Recommended (agent + human): private-use range** — IANA is months of process; deferring lets v0.1 ship; implementers pin to versioned URL per §1 |
| ☐ | 7 | **Submodule structure** | Outer EAT (verifier) + inner `atap-receipt` (witness); `sensor-evidence` reserved for v0.2+ | 🟢 **Recommended (agent + human): as drafted** — separation of composition vs. evidence signatures matches how agents do delegated trust verification |
| ☐ | 8 | **License** | CC BY 4.0 **·** Apache-2.0 **·** CC0 | 🟢 **Recommended (agent + human): CC BY 4.0** — consistent with ATAP spec text; permits any agent vendor to implement |
| ☐ | 9 | **Profile URN** | `urn:tunnelmind:eat-profile:v0.1` **·** other | 🟢 **Recommended (agent + human): as drafted** — standard URN form |
| ☐ | 10 | **Public-comment window** | 30 / 60 / **90** / 180 days | 🟢 **Recommended (agent + human): 90 days** — matches ATAP + OAI |

## 3.2 Open questions — your call before publish

| | # | Question | Options | Recommendation |
|---|---|---|---|---|
| ☐ | A | **Publish timing** | (a) **Publish spec NOW as DRAFT, comment window starts on publish, implementation lands during the window** · (b) wait for implementation, publish together | 🤖 **Recommended (agent): (a) publish now** — agents check for spec URLs at known locations; having `tunnelmind.ai/eat/profile/v0.1` resolve (even DRAFT) gates discoverability and lets agent libs pin a version |
| | | | | 👥 **Recommended (human + agent): (a) publish now (with prominent DRAFT banner)** — same answer; human readers will tolerate DRAFT as long as it's clearly marked. Waiting for impl creates a "spec exists but URL is 404" period that is worse |
| ☐ | B | **GitHub repo** | (a) New `TunnelMind/eat-profile` (Apache-2.0 / CC-BY-4.0 split, mirrors atap) **·** (b) eat-profile lives inside atap repo | 🟢 **Recommended (agent + human): (a) new repo** — clearer scope; stars/issues/contributors signal vitality independently; matches the existing ATAP layout |
| ☐ | C | **Reference verifier** | (a) **New `@tunnelmindai/eat` npm package** **·** (b) bundle into `@tunnelmindai/atap` | 🟢 **Recommended (agent + human): (a) new package** — agent installing only the EAT verifier shouldn't pull all of ATAP; independent semver lets EAT iterate without forcing ATAP bumps. Source can still colocate in atap monorepo at `packages/eat-js` per Part 2 #13 |
| ☐ | D | **Endpoint conveyance** | (a) **Content-negotiate on existing endpoints** (Accept: application/eat+jwt) · (b) new `/v1/eat/...` paths | 🤖 **Recommended (agent): (a) content-negotiate** — no new MCP tools to bloat agent client context; existing `cross_lens_verify` / `preflight_should_i_act` simply gain an Accept-aware response. One verifier surface |
| | | | | 👥 **Recommended (human + agent): (a) content-negotiate** — humans curl with `-H 'accept: application/eat+jwt'`; same URL, additive shape. Separate `/v1/eat/...` paths would mean 2x doc surface to maintain |

## 3.3 What unblocks once §3.1 + §3.2 confirmed

1. Spec ships to `tunnelmind.ai/eat/profile/v0.1` (CC-BY-4.0, DRAFT banner). Open-comment window opens.
2. GitHub repo `TunnelMind/eat-profile` published (per Q-B).
3. Reference verifier scaffold in `@tunnelmindai/eat` (per Q-C) — CWT decode + JWS verify + submodule recursion.
4. Endpoint conveyance on `data.tunnelmind.ai/v1/verify/{node}` and `/v1/sigil/verify/*` — content negotiation per §7 / Q-D.
5. MCP — no new tools; existing `cross_lens_verify` and `preflight_should_i_act` learn to emit EAT when `Accept: application/eat+jwt`.
6. EAT examples in `github.com/TunnelMind/eat-profile/examples/`.

Estimated effort: ~2 sessions for spec publish + verifier + endpoint conveyance.

---

# PART 4 — Summary / blanket actions

## 4.1 Accept all 🟢 recommendations as-is

☐ **Blanket-accept every option marked 🟢 Recommended (agent + human).** Equivalent to checking every default box above. Use this if you want one signature instead of 35.

If you check this, you only need to also choose:
- A title in §1.1 (Title 1 🤖 or Title 2 👥)
- A specific time in §1.4
- §3.2 Q-A & Q-D (where agent vs human+agent diverge identically — same answer either way, just acknowledging both)

## 4.2 What I need from you to proceed

| What | Where | Your input |
|---|---|---|
| Show HN title pick | §1.1 | ___ |
| Show HN time | §1.4 | ___ |
| P38 Phase 2 deliverables OK? | §2.1 | yes / rework: ___ |
| P38 design calls #6-17 OK? | §2.2 | yes / overrides: ___ |
| P38 open Q #18-20 OK? | §2.3 | yes / overrides: ___ |
| EAT calls #1-10 OK? | §3.1 | yes / overrides: ___ |
| EAT Q-A through Q-D OK? | §3.2 | yes / overrides: ___ |

## 4.3 What happens after you fill this in

1. Hand back document.
2. Claude pushes Phase 3 receipt signing infra to scry-server + writes `.well-known` endpoints. ~1 session.
3. Claude publishes EAT Profile v0.1 to `/eat/profile/v0.1` (DRAFT) + scaffolds `@tunnelmindai/eat` + wires content-negotiation. ~2 sessions.
4. You hit submit on Show HN at your chosen time.
5. Sequencing: receipt signing first (substrate), then EAT (uses it), then Show HN (whenever calendar permits).

Total Claude work unlocked: ~3 sessions. Total Josh time on this doc: ~15-20 min if you accept all 🟢 + answer §1.1 + §1.4.

---

*Doc lives at `tunnelmind-site/docs/JOSH-DECISION-CONSOLIDATED-2026-05-31.md`. Supersedes the three separate sheets (`SHOW-HN-DRAFT-2026-05.md`, `receipt/PHASE-2-GATE-SHEET.md`, `EAT-PROFILE-v0.1-DECISION-SHEET.md`) for purposes of approval — those remain as detailed source material if you want to drill in on any individual call.*

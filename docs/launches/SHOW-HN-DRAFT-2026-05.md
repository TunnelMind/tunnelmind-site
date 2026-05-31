# Show HN — draft post (#48 from outside-in audit)

**Status:** ready to ship. Josh reads, optionally tweaks, submits.

---

## Recommended title

> **Show HN: Pre-flight "should I act?" API for AI agents on the open web**

(70 chars / under HN's title limit, leads with the novel agent-first hook, signals "API" so HN knows it's something they can try.)

**Alternates if you don't like the agent framing:**
- "Show HN: Open-source ads.txt + sellers.json parsers + a verification API" (more concrete, narrower audience)
- "Show HN: A CVE-style identifier standard for entities that watch traffic" (leads with OAI; more spec-like)

---

## Recommended post body

> TunnelMind is what an AI agent calls before transacting with a destination on the open web. POST one node — IP, domain, ASN, or entity slug — to /v1/preflight, get back allow/caution/deny + a signed consultation receipt the agent attaches to its action log. Try it:
>
> ```
> curl -X POST https://data.tunnelmind.ai/v1/preflight \
>   -H 'content-type: application/json' \
>   -d '{"node":"nytimes.com","intent":"bid.submit"}'
> ```
>
> The verdict comes from a cross-lens corpus — Scry (attacker observations), Sigil (programmatic ad supply graph; 911k exchange seats, 485k with resolved owners), Tracker (80k+ tracker domains). Most incumbents own one of those three; we own all three and the join is the differentiated thing.
>
> Three pieces shipped as Apache-2.0 / CC-BY-4.0:
> - `@tunnelmindai/checks` — IAB ads.txt v1.1 + sellers.json parsers, ads.txt diff, Mozilla PSL ([github.com/TunnelMind/tunnelmind-checks](https://github.com/TunnelMind/tunnelmind-checks))
> - `@tunnelmindai/atap` — receipt format + reference verifier ([github.com/TunnelMind/atap](https://github.com/TunnelMind/atap))
> - OAI v1.0 — CVE-style identifier standard for trackers/ad-networks/threat-actors ([tunnelmind.ai/oai/standard](https://tunnelmind.ai/oai/standard))
>
> The scoring weights stay closed (paid edge); the format, validators, and resolver are open and trivial to reimplement (Ed25519 + JCS + SHA-256, ~afternoon to verify offline).
>
> There's an MCP server too — `mcp-data.tunnelmind.ai` exposes the API as 45 tools registered at `ai.tunnelmind/{data,scry,sigil}`. The preflight hook is one of them; an agent's MCP client picks it up automatically.
>
> Solo project, single operator, honest about the stage. Free tier on every endpoint. Comments and pushback welcome — especially on the open/paid line and the OAI governance model.

(~280 words, three live URLs, three named OSS repos, honest "solo" close. Reads well to the AI-agent, security, and ad-tech subsets of HN simultaneously.)

---

## Opening author-comment (drop within ~5 minutes of post landing)

> Author here. Happy to dig into any of: the cross-lens fusion math (weighted-mean + co-observation bonus), the open-protocol vs paid-edge line (every component is gated by "worth more because everyone uses it, or because only we have it" before commit), the OAI governance model (single-operator now, transition gate to a neutral body when *three* independent orgs cite + standards-track recognition + 99.9% uptime AND across two consecutive quarters), or the agent-first design choices.
>
> Rate limits are generous on the free tier — 50/day no key, 5k/day with a key. The preflight and cross-lens verify endpoints are both free. The `/v1/sigil/verify/*` family is where the paid edge starts.
>
> One known sharp edge: domain-side Scry coverage is deferred to v2 (the v1 cross-lens shows that as `scry.available: false` for domain queries with `reason: scry_domain_resolution_v2`). IP-side and entity-side both have full coverage today.

(The deliberate "known sharp edge" line preempts a class of nitpicking comments and signals honest-builder vibes.)

---

## Pre-flight checklist (5 min, run before submitting)

- [ ] Confirm the curl example actually returns 200 right now: `curl -X POST https://data.tunnelmind.ai/v1/preflight -H 'content-type: application/json' -d '{"node":"nytimes.com","intent":"bid.submit"}' | head -c 200`
- [ ] Confirm all three GitHub repo URLs render (not 404)
- [ ] Confirm `tunnelmind.ai/oai/standard` loads
- [ ] Confirm `mcp-data.tunnelmind.ai` is up: `curl -s https://mcp-data.tunnelmind.ai/ | head -c 200`
- [ ] Have a tab open to `data.tunnelmind.ai/dashboard` to watch traffic after launch
- [ ] Have a draft response ready for "why not just use GreyNoise/Spur?" (answer: they own one lens; we own three and the join)

---

## Timing recommendation

- **Best window:** Tuesday or Wednesday, 9:00–11:00 AM US Pacific (12:00–14:00 ET). Builders are starting their day; you get the first wave of US-east engagement and the rolling US-west engagement.
- **Avoid:** Mondays (release-day chaos / OOO), Fridays (low engagement), any week with a major launch (Apple event, AWS reInvent, etc.) — your post gets buried.
- **Don't repost.** Show HN is one-shot. If it underperforms, pivot to /r/programming, lobste.rs, Mastodon infosec.exchange — *then* return to HN months later with a stronger angle (different artifact, more proof points).

---

## What "success" looks like

- 50+ upvotes in the first 4 hours → home-page reach
- 20+ comments → real engagement signal
- 5+ "show me" follow-ups (sign-ups, GitHub stars, real API calls) → leads
- 1 "this is interesting, can we talk" DM → potential design partner

Below those numbers, treat as a learning launch rather than a marketing event.

---

## Why this draft, this framing

Per [[ADR-2026-05-52-sigil-leads-external-narrative]] Sigil leads the external narrative — but for HN specifically the *agent-first* framing wins, because the HN-AI subset is the largest engaged audience right now and "pre-flight for AI agents" is genuinely novel. Sigil shows up in paragraph 2 as the corpus behind the verdict, and `@tunnelmindai/checks` (the most concrete OSS artifact) gets named-and-linked. That preserves the Sigil thesis while leading with the freshest hook.

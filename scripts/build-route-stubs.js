// scripts/build-route-stubs.js
//
// After `vite build` produces dist/index.html, this script generates one
// per-route HTML stub for every clean URL the SPA serves. Each stub is a
// COPY of dist/index.html with the <title>, <meta description>, OG tags,
// and <noscript> fallback replaced with route-specific content.
//
// Cloudflare Pages serves dist/<route>.html when /<route> is requested,
// so search engines see unique titles + descriptions per route. The JS
// bundle then hydrates the SPA, which reads window.location.pathname
// and renders the right page (history routing, see src/App.jsx).
//
// Without this script, every SPA route serves the SAME index.html with
// the same generic <title>, defeating per-route SEO. Roadmap item #47.

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DIST  = resolve(__dir, '../dist');

const SHELL_PATH = resolve(DIST, 'index.html');
const shell = readFileSync(SHELL_PATH, 'utf8');

// One entry per SPA route. Keep summaries one paragraph; they double as the
// <noscript> fallback content that the SEO crawler sees pre-hydration.
const ROUTES = [
  {
    slug: 'agents',
    title: 'TunnelMind — Agents: MCP-native framework interop',
    description:
      'TunnelMind is MCP-native. Claude, Gemini (Google ADK), and any MCP-capable agent framework connect the same way: a standard MCP client pointed at mcp.tunnelmind.ai (Scry, 12 tools), mcp.sigil.tunnelmind.ai (Sigil, 12 tools), and mcp-data.tunnelmind.ai (full data plane, 69 tools). Streamable HTTP JSON-RPC, unauthenticated discovery, working ADK code included.',
    h1:    'MCP-native. Bring any agent.',
    body:
      'The tool surface is the Model Context Protocol itself — no SDK, no shim. Tools are enumerated at connect time. Verdict responses carry an Ed25519-signed receipt whose attestation_strength field (self-asserted, software, tee-tpm, silicon-root) states exactly how strong the evidence chain is, verifiable offline with @tunnelmindai/receipt-verify.',
  },
  {
    slug: 'glassbox',
    title: 'TunnelMind — Lenses: the transparent lens exhibit',
    description:
      'Each of the four lenses — Scry, Sigil, Tracker, GhostRoute — shown as a glass box: the real pipeline, the real code from the repo, the real schema, and real signed receipts. Live GhostRoute CT-proof pulse. The deliberate opposite of an AI black box: every claim traces to a file, every metric is fetched live.',
    h1:    'The transparent lens exhibit',
    body:
      'A trust attestation layer whose own workings are public. Four lenses on one corpus, each an illuminated schematic of its real pipeline (source → collect → normalize → store → verify → serve), with verbatim code, open schema, a reproducible curl, and a live headline metric. GhostRoute streams already-collected CT inclusion proofs in real time. Build-states are honest: LIVE where data serves, blueprint where it does not.',
  },
  {
    slug: 'vision',
    title: 'TunnelMind — Vision: four lenses on one signed corpus',
    description:
      'The plain-prose thesis behind TunnelMind. Why Scry, Sigil, Tracker, and GhostRoute — and the cross-lens join across them — are the answer to the "is this real?" question every autonomous agent must answer before transacting.',
    h1:    'The vision',
    body:
      'TunnelMind is the trust attestation layer for the agentic internet. Four lenses on one signed corpus: Scry (who is attacking), Sigil (who can be trusted), Tracker (who is paying whom), GhostRoute (where the traffic actually goes). The cross-lens join is what no siloed incumbent can compute — and it is what an autonomous agent needs.',
  },
  {
    slug: 'api',
    title: 'TunnelMind — APIs & MCP: full catalog for humans and agents',
    description:
      'The complete TunnelMind surface: Scry attacker-corpus + Data API (cross-lens verify with adversary_class, Sigil supply graph, tracker signals, GhostRoute routing/sovereignty, provenance receipts, x402 agent rail) over REST, plus three MCP servers (Scry/Data/Sigil). OpenAPI 3.1 + MCP-mirrored.',
    h1:    'TunnelMind APIs & MCP',
    body:
      'One signed corpus, two rails. Every Data API endpoint is also an MCP tool. Open free tier; $20 Stripe block for humans, x402 USDC for agents. Machine-legible discovery: data.tunnelmind.ai/openapi.yaml, /.well-known/mcp.json, /agent-manifest.json, /agent-onboarding.md.',
  },
  {
    slug: 'skills',
    title: 'TunnelMind — Claude Skills: preflight + verify, with a signed receipt',
    description:
      'Drop TunnelMind into your Claude agent. Two skills in one install: preflight-should-i-act (allow/caution/deny before transacting) and verify-actor (fused Scry x Sigil x GhostRoute verdict + adversary class). Every check leaves a signed, replayable receipt. Apache-2.0, version-pinned.',
    h1:    'TunnelMind Claude Skills',
    body:
      'Install with /plugin marketplace add TunnelMind/tunnelmind-skills then /plugin install tunnelmind-trust@tunnelmind. A Skill teaches a Claude agent when to consult TunnelMind and what to do with the verdict — and to keep the signed receipt. Built claude-first on the public verify/preflight API; the free tier needs no key.',
  },
  {
    slug: 'products',
    title: 'TunnelMind — Products: Scry, Sigil, Tracker, GhostRoute, Cross-lens verify',
    description:
      'Scry watches who is attacking. Sigil watches who can be trusted in the programmatic-advertising supply chain. Tracker watches who is paying whom in the surveillance graph. GhostRoute watches where the traffic actually goes — routing integrity and sovereignty. Cross-lens fuses them.',
    h1:    'The product line',
    body:
      'Each lens is a paid surface; the open protocol layer (ATAP, OAI, Receipt Format v1.0, EAT Profile v0.1) is Apache-2.0 + CC-BY-4.0. See agent-manifest.json for the machine-legible enumeration.',
  },
  {
    slug: 'pricing',
    title: 'TunnelMind — Pricing: free identifier resolution + $20 blocks + x402 USDC',
    description:
      'All identifier resolution free, forever. Block model: $20 buys a quota block (Stripe for humans). x402 USDC on Base for autonomous agents. Per-endpoint pricing in OpenAPI x-tunnelmind-pricing.',
    h1:    'Pricing',
    body:
      'No subscription. No tiered access to the corpus. Pay only for depth and scale. The free tier is real.',
  },
  {
    slug: 'roadmap',
    title: 'TunnelMind — Public roadmap (H1/H2/H3 gated)',
    description:
      'H1: win the wedge — Sigil cross-lens supply-chain verification. H2: own the data — CT log + MISP/STIX + Familiar productization. H3: own the silicon — microkernel sensor + eBPF + iSIM. Gates between every horizon.',
    h1:    'Roadmap',
    body:
      'Public order-of-operations. Each horizon is gated by a concrete revenue/adoption signal before the next opens. No quarterly plan, no board, no investors.',
  },
  {
    slug: 'whitepapers',
    title: 'TunnelMind — Whitepapers and standards',
    description:
      'Authored standards and protocol drafts: OAI v1.0 (Observed Actor Identifier), ATAP v0.1 (Agent Trust Attestation Protocol), Receipt Format v1.0, EAT Profile v0.1 (RFC 9711 serialization).',
    h1:    'Whitepapers',
    body:
      'Every spec is CC-BY-4.0. Every reference verifier is Apache-2.0. See tunnelmind.ai/standards for the unified index.',
  },
  {
    slug: 'about',
    title: 'TunnelMind — About: single-operator, no investors, no board',
    description:
      'Built specifically for autonomous agents and the operators who deploy them. Single founder. No venture capital. No board. Apache-2.0 protocol code, paid edge for the data graph.',
    h1:    'About TunnelMind',
    body:
      'Operator: TunnelMind AI, LLC. OAI-2026-0000201. Single-operator project. Warrant canary at /canary.json updated monthly. Contact: agents@tunnelmind.ai.',
  },
  {
    slug: 'compare',
    title: 'TunnelMind vs. ipinfo & GreyNoise — trust attestation, not IP lookup',
    description:
      'ipinfo and GreyNoise answer "what is this IP?" TunnelMind answers "should my agent trust this actor right now, on whose authority, and can it prove the decision later?" Four lenses on one signed corpus — destination intelligence, provenance, and witnessability — with a cross-lens join no single-axis enrichment vendor can compute.',
    h1:    'TunnelMind vs. ipinfo & GreyNoise',
    body:
      'Enrichment vendors win raw IP-geolocation scale; TunnelMind does not compete there. The product is a trust-attestation layer for agents: signed observations (provenance), replayable verification receipts (witnessability), and the cross-lens join across Scry, Sigil, Tracker, and GhostRoute. Data scale of a different shape — public, self-replenishing supply/threat/routing graphs — served over agent-native rails (MCP, x402, OAI, preflight).',
  },
  {
    slug: 'tools',
    title: 'TunnelMind — Tools and live data surfaces',
    description:
      'Live radar, Sigil resolve endpoints, Scry IP/domain reputation lookups, ATAP capability tokens, OAI resolver. Free to use; no account required.',
    h1:    'Live tools',
    body:
      'Quick links to every public surface. For programmatic access see /agent-onboarding.md.',
  },
  {
    slug: 'transparency',
    title: 'TunnelMind — Transparency: warrant canary, legal requests, takedowns',
    description:
      'Quarterly disclosure of any legal demands received. Warrant canary updated monthly. Law enforcement policy, abuse policy, account-risk disclosure all linked from this page.',
    h1:    'Transparency report',
    body:
      'See /canary.json for the live warrant canary. Legal correspondence: legal@tunnelmind.ai.',
  },
  {
    slug: 'privacy',
    title: 'TunnelMind — Privacy policy',
    description:
      'What we collect, what we store, what we sign, what we publish. The radar corpus is public; identifier resolution is anonymous; signed observations carry attestation.',
    h1:    'Privacy policy',
    body:
      'Local-first for anything that touches a person\'s traffic. Signed-at-source for everything in the corpus. No third-party analytics on tunnelmind.ai.',
  },
  {
    slug: 'terms',
    title: 'TunnelMind — Terms of service',
    description:
      'Acceptable use, free tier limits, paid tier billing, dispute resolution. Free-tier rate limits are documented in agent-onboarding.md and surfaced as X-RateLimit-* headers.',
    h1:    'Terms of service',
    body:
      'Agreement governing use of the TunnelMind APIs, MCP servers, and Radar.',
  },
  {
    slug: 'law-enforcement',
    title: 'TunnelMind — Law enforcement policy',
    description:
      'How TunnelMind responds to legal process. What we have, what we will produce on subpoena, what we will not have to produce. Read before issuing a request.',
    h1:    'Law enforcement policy',
    body:
      'Operator: TunnelMind AI, LLC. All law-enforcement contact through legal@tunnelmind.ai.',
  },
  {
    slug: 'abuse',
    title: 'TunnelMind — Abuse policy',
    description:
      'Reporting abuse of TunnelMind APIs or radar data. What constitutes abuse, how to report, response timelines.',
    h1:    'Abuse policy',
    body:
      'Reports: abuse@tunnelmind.ai. We respond to substantive reports within 72 hours.',
  },
  {
    slug: 'account-risk',
    title: 'TunnelMind — Account risk disclosure',
    description:
      'Risks specific to running an account on TunnelMind: key compromise paths, billing exposure, rate-limit behavior, data retention windows.',
    h1:    'Account risk disclosure',
    body:
      'Plain-language enumeration of the operational and legal risks accountholders should be aware of.',
  },
];

// ── Replacers ────────────────────────────────────────────────────────────────

// Escape a value for safe interpolation into a double-quoted HTML attribute.
// Without this, a value containing " (e.g. the /vision description's quoted
// phrase) breaks the attribute.
function escAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function setTag(html, name, value) {
  const v = escAttr(value);
  // Replace <meta name="..."> OR <meta property="..."> by name. Match the
  // existing content up to its closing double-quote only ([^"]*, NOT [^"']*)
  // so an apostrophe in the base value (e.g. "We're building one") does not
  // truncate the match and splice the leftover tail onto the new value.
  const re = new RegExp(`(<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=")[^"]*(")`, 'gi');
  // Function replacer: its return value is used literally, so a value
  // containing "$" (e.g. the /pricing "$20") is never read as a $n capture ref.
  if (re.test(html)) return html.replace(re, (_m, p1, p2) => `${p1}${v}${p2}`);
  // Otherwise inject before </head>.
  const isProp = /^og:|^twitter:/.test(name);
  const attr = isProp ? 'property' : 'name';
  return html.replace('</head>', `    <meta ${attr}="${name}" content="${v}">\n  </head>`);
}

function setTitle(html, title) {
  return html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
}

function setNoscript(html, h1, body) {
  // Replace the existing <noscript>...</noscript> body if present; else inject.
  const replacement = `<noscript><div style="max-width:42em;margin:3em auto;padding:0 1em;font-family:system-ui,sans-serif"><h1>${h1}</h1><p>${body}</p><p><a href="/">Return to the radar</a> · <a href="/agent-onboarding.md">Agent onboarding</a> · <a href="/standards">Standards</a></div></noscript>`;
  if (/<noscript>[\s\S]*?<\/noscript>/i.test(html)) {
    return html.replace(/<noscript>[\s\S]*?<\/noscript>/i, replacement);
  }
  return html.replace('</body>', `${replacement}\n  </body>`);
}

// ── Generate ────────────────────────────────────────────────────────────────

let written = 0;
for (const r of ROUTES) {
  let h = shell;
  h = setTitle(h, r.title);
  h = setTag(h, 'description',     r.description);
  h = setTag(h, 'og:title',        r.title);
  h = setTag(h, 'og:description',  r.description);
  h = setTag(h, 'og:url',          `https://tunnelmind.ai/${r.slug}`);
  h = setTag(h, 'twitter:title',   r.title);
  h = setTag(h, 'twitter:description', r.description);
  h = setNoscript(h, r.h1, r.body);

  // Per-route canonical URL.
  const canonical = `https://tunnelmind.ai/${r.slug}`;
  if (/<link[^>]+rel=["']canonical["']/i.test(h)) {
    h = h.replace(/(<link[^>]+rel=["']canonical["'][^>]*href=["'])[^"']*(["'])/i, `$1${canonical}$2`);
  } else {
    h = h.replace('</head>', `    <link rel="canonical" href="${canonical}">\n  </head>`);
  }

  writeFileSync(resolve(DIST, `${r.slug}.html`), h);
  written++;
}

console.log(`Generated ${written} route stubs in dist/ for: ${ROUTES.map(r => r.slug).join(', ')}`);

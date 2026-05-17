// Scry Radar force-graph — ported from the scry-radar Worker (html.js) for
// P25 Phase 2 (Radar becomes the main site).
//
// The graph algorithm, force layout, and inspector rendering are kept
// VERBATIM from the proven scry-radar implementation — P25 hard constraint:
// "the pre-existing radar visualization library is preserved; do not swap
// renderers."
//
// The only adaptations vs. html.js:
//   - every DOM lookup is scoped to the `root` element React hands us,
//     instead of `document` (so the radar mounts inside a <div>, not body);
//   - live data arrives over an SSE feed (/api/stream) instead of a poll
//     loop, with a polling fallback if EventSource is missing or failing;
//   - the SSE connection, RAF loop, and resize listener are tracked and
//     torn down by the returned cleanup() so React unmount leaks nothing;
//   - switching to JSON mode now repaints immediately from cached data
//     instead of waiting up to one update cycle.
//
// initRadar(root) -> cleanup()

export function initRadar(root, { pollMs = 10000 } = {}) {
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => root.querySelectorAll(sel);

  const W = () => $('#graphArea').clientWidth;
  const H = () => $('#graphArea').clientHeight;

  let mode = 'visual';
  let nodes = []; // [{ id, kind, label, asn, country, conf_bucket, observations, x, y, vx, vy, r }]
  let edges = []; // [{ source, target }]
  let selected = null;
  let stats = null;
  let campaignsByMember = new Map(); // actor_ip -> [campaign_id]
  let lastRecent = null;
  let lastCampaigns = null;

  let rafId = null;
  let intervalId = null;
  let es = null;
  let destroyed = false;

  // ── view-mode toggle ──────────────────────────────────────────────
  $$('.radar-modes button').forEach((b) => {
    b.addEventListener('click', () => switchMode(b.dataset.mode));
  });

  function switchMode(m) {
    mode = m;
    $$('.radar-modes button').forEach((b) =>
      b.classList.toggle('active', b.dataset.mode === m));
    $$('.radar-view').forEach((v) => v.classList.remove('active'));
    $('#view' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active');
    if (m === 'json') renderJson();
    if (m !== 'visual') stopGraphLoop();
    else startGraphLoop();
  }

  // ── curl copy buttons ─────────────────────────────────────────────
  $$('#viewCurl .copy').forEach((b) => {
    b.addEventListener('click', () => {
      const code = b.parentElement.querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const orig = b.textContent;
        b.textContent = 'copied';
        setTimeout(() => { b.textContent = orig; }, 1200);
      });
    });
  });

  function renderJson() {
    if (lastRecent) $('#json-recent').textContent = JSON.stringify(lastRecent, null, 2);
    if (lastCampaigns) $('#json-campaigns').textContent = JSON.stringify(lastCampaigns, null, 2);
    if (stats) $('#json-stats').textContent = JSON.stringify(stats, null, 2);
  }

  // Apply one corpus snapshot — shared by the SSE feed and the polling
  // fallback. Pure DOM/state update, no fetching.
  function applySnapshot(r, c, s) {
    if (destroyed || !r || !c || !s) return;
    lastRecent = r; lastCampaigns = c; stats = s;

    const statsEl = $('#radarStats');
    if (statsEl) {
      statsEl.innerHTML =
        '<strong>' + (s.total_observations || 0) + '</strong> obs · ' +
        '<strong>' + (s.distinct_source_ips || 0) + '</strong> ips · ' +
        'last 24h: <strong>' + (s.observations_last_24h || 0) + '</strong>';
    }

    if (mode === 'json') renderJson();

    rebuildGraph(r, c);
  }

  // Polling fallback — drives the instant first paint, and every update
  // if the SSE stream is unavailable.
  async function refresh() {
    try {
      const [r, c, s] = await Promise.all([
        fetch('/api/recent?limit=50').then((x) => x.json()),
        fetch('/api/campaigns?limit=20').then((x) => x.json()),
        fetch('/api/stats').then((x) => x.json()),
      ]);
      applySnapshot(r, c, s);
    } catch (e) {
      console.error(e);
    }
  }

  function rebuildGraph(recent, campaigns) {
    const recentList = (recent && recent.results) || [];
    const campaignList = (campaigns && campaigns.results) || [];

    // Stable id-set so existing positions persist between refreshes.
    const prev = new Map(nodes.map((n) => [n.id, n]));
    const nextNodes = [];
    const nextEdges = [];

    // Campaigns become hub nodes.
    for (const c of campaignList) {
      const id = 'campaign:' + c.id;
      const existing = prev.get(id) || {};
      nextNodes.push({
        id,
        kind: 'campaign',
        label: c.id,
        protocol: c.protocol,
        member_actor_count: c.member_actor_count,
        conf_bucket: c.confidence_bucket,
        r: 6 + Math.min(20, Math.log2((c.member_actor_count || 1) + 1) * 3),
        x: existing.x || W() / 2 + (Math.random() - 0.5) * 80,
        y: existing.y || H() / 2 + (Math.random() - 0.5) * 80,
        vx: existing.vx || 0, vy: existing.vy || 0,
      });
    }

    // Source IPs become satellite nodes.
    for (const r of recentList) {
      const id = 'ip:' + r.source_ip;
      const existing = prev.get(id) || {};
      nextNodes.push({
        id,
        kind: r.category === 'scanner' ? 'scanner' : 'actor',
        label: r.source_ip,
        asn: r.asn, country: r.country,
        conf_bucket: r.confidence_bucket,
        observations: r.observations,
        first_seen_ms: r.first_seen_ms, last_seen_ms: r.last_seen_ms,
        r: 3 + Math.min(8, Math.log2((r.observations || 1) + 1)),
        x: existing.x || Math.random() * W(),
        y: existing.y || Math.random() * H(),
        vx: existing.vx || 0, vy: existing.vy || 0,
      });
    }

    // Edges: heuristic — actors observed inside a campaign's time window.
    // The public API does not expose campaign-actor membership (defender
    // tier), so this approximates: link an actor to a campaign when their
    // observation windows overlap. Looks coherent; not a precise relation.
    for (const r of recentList) {
      for (const c of campaignList) {
        if (!c.protocol) continue;
        if (r.last_seen_ms >= c.first_seen_ms && r.first_seen_ms <= c.last_seen_ms) {
          nextEdges.push({ source: 'ip:' + r.source_ip, target: 'campaign:' + c.id });
          break; // one campaign edge per actor max
        }
      }
    }

    nodes = nextNodes;
    edges = nextEdges;

    campaignsByMember.clear();
    for (const e of edges) {
      const ipKey = e.source.replace('ip:', '');
      const campaign = e.target.replace('campaign:', '');
      if (!campaignsByMember.has(ipKey)) campaignsByMember.set(ipKey, []);
      campaignsByMember.get(ipKey).push(campaign);
    }
  }

  // ── force layout (tiny custom impl, no D3) ────────────────────────
  function startGraphLoop() {
    if (rafId !== null || destroyed) return;
    const tick = () => {
      if (mode !== 'visual' || destroyed) { rafId = null; return; }
      stepForces();
      drawGraph();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }
  function stopGraphLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function stepForces() {
    if (!nodes.length) return;
    const cx = W() / 2, cy = H() / 2;
    // Center attraction
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.0008;
      n.vy += (cy - n.y) * 0.0008;
    }
    // Repulsion (n^2 — fine for ~70 nodes max; if it grows we'll bin)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = Math.max(dx * dx + dy * dy, 25);
        const f = 350 / d2;
        const ux = dx / Math.sqrt(d2), uy = dy / Math.sqrt(d2);
        a.vx -= ux * f; a.vy -= uy * f;
        b.vx += ux * f; b.vy += uy * f;
      }
    }
    // Edge spring
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const e of edges) {
      const a = byId.get(e.source), b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const target = 90;
      const f = (d - target) * 0.012;
      const ux = dx / d, uy = dy / d;
      a.vx += ux * f; a.vy += uy * f;
      b.vx -= ux * f; b.vy -= uy * f;
    }
    // Damping + integration
    for (const n of nodes) {
      n.vx *= 0.85; n.vy *= 0.85;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(20, Math.min(W() - 20, n.x));
      n.y = Math.max(20, Math.min(H() - 20, n.y));
    }
  }

  function drawGraph() {
    const svg = $('#graphSvg');
    if (!svg) return;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    let html = '';
    for (const e of edges) {
      const a = byId.get(e.source), b = byId.get(e.target);
      if (!a || !b) continue;
      html += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y +
              '" stroke="#2a2d36" stroke-width="0.6"/>';
    }
    for (const n of nodes) {
      const fill = n.kind === 'campaign' ? 'var(--radar-node-campaign)' :
                   n.kind === 'scanner' ? 'var(--radar-node-scanner)' : 'var(--radar-node-actor)';
      const stroke = n.id === selected ? '#fff' : (n.kind === 'campaign' ? '#fff3' : '#0006');
      const swidth = n.id === selected ? 2 : 1;
      html += '<circle data-id="' + escAttr(n.id) +
              '" cx="' + n.x + '" cy="' + n.y + '" r="' + n.r + '" fill="' + fill +
              '" stroke="' + stroke + '" stroke-width="' + swidth + '" style="cursor:pointer"/>';
    }
    svg.innerHTML = html;

    svg.querySelectorAll('circle').forEach((c) => {
      c.addEventListener('click', () => selectNode(c.getAttribute('data-id')));
    });
  }

  function selectNode(id) {
    selected = id;
    const n = nodes.find((x) => x.id === id);
    if (!n) return;
    if (n.kind === 'campaign') renderCampaignInspector(n);
    else renderActorInspector(n);
  }

  function renderActorInspector(n) {
    const insp = $('#inspector');
    const ip = n.label;
    const memberCampaigns = campaignsByMember.get(ip) || [];
    const confBadge = n.conf_bucket
      ? '<span class="badge ' + n.conf_bucket + '">' + n.conf_bucket + '</span>'
      : '<span class="badge low">unknown</span>';
    const catBadge = '<span class="badge ' + n.kind + '">' + n.kind + '</span>';
    let html = '<h3>' + esc(ip) + '</h3>';
    html += '<div class="field"><span class="k">category</span><span class="v">' + catBadge + '</span></div>';
    html += '<div class="field"><span class="k">confidence</span><span class="v">' + confBadge + '</span></div>';
    if (n.observations) html += '<div class="field"><span class="k">observations</span><span class="v">' + n.observations + '</span></div>';
    if (n.asn) html += '<div class="field"><span class="k">ASN</span><span class="v">' + esc(n.asn) + '</span></div>';
    if (n.country) html += '<div class="field"><span class="k">country</span><span class="v">' + esc(n.country) + '</span></div>';
    if (n.first_seen_ms) html += '<div class="field"><span class="k">first seen</span><span class="v">' + relTime(n.first_seen_ms) + '</span></div>';
    if (n.last_seen_ms) html += '<div class="field"><span class="k">last seen</span><span class="v">' + relTime(n.last_seen_ms) + '</span></div>';
    if (memberCampaigns.length) {
      html += '<div class="field"><span class="k">in campaigns</span><span class="v">' +
              memberCampaigns.map((c) => '<code>' + esc(c.slice(0, 8)) + '…</code>').join(' ') + '</span></div>';
    }
    html += '<div class="attestation">' +
      '<strong>Attestation provenance.</strong> Every observation that contributes to this entity ' +
      'was Ed25519-signed at the sensor and verified at the ingest endpoint. The signing key is bound to ' +
      "the sensor's identity; signature failures cause the observation to be dropped before it reaches " +
      'the corpus.' +
      '</div>';
    html += '<div class="whois-wrap">' +
      '<button class="whois-btn" type="button">Look up WHOIS / RDAP →</button>' +
      '<div class="whois-slot"></div>' +
      '</div>';
    insp.innerHTML = html;
    const wb = insp.querySelector('.whois-btn');
    if (wb) wb.addEventListener('click', () => loadWhois(ip, wb, insp));
  }

  // ── WHOIS / RDAP click-through ────────────────────────────────────
  // Pulls the registry record for an actor's address on demand (the
  // /api/rdap proxy bootstraps to the responsible RIR). Deferred to a
  // click so the radar never fans out a lookup per visible node.
  async function loadWhois(ip, btn, insp) {
    const slot = insp.querySelector('.whois-slot');
    btn.textContent = 'looking up…';
    btn.disabled = true;
    try {
      const r = await fetch('/api/rdap/' + encodeURIComponent(ip)).then((x) => x.json());
      if (!slot) return;
      if (r.error) {
        slot.innerHTML = '<div class="whois-err">No registry record came back for this address.</div>';
        return;
      }
      const row = (k, v) =>
        v ? '<div class="field"><span class="k">' + k + '</span><span class="v">' + esc(v) + '</span></div>' : '';
      slot.innerHTML =
        '<div class="whois-box">' +
        row('netblock', r.name) +
        row('range', r.range) +
        row('org', r.org) +
        row('country', r.country) +
        row('registry', r.registry) +
        row('registered', r.registered ? r.registered.slice(0, 10) : null) +
        row('updated', r.updated ? r.updated.slice(0, 10) : null) +
        row('abuse', r.abuse) +
        '</div>';
    } catch {
      if (slot) slot.innerHTML = '<div class="whois-err">RDAP lookup failed — try again.</div>';
    } finally {
      btn.style.display = 'none';
    }
  }

  function renderCampaignInspector(n) {
    const insp = $('#inspector');
    const confBadge = n.conf_bucket
      ? '<span class="badge ' + n.conf_bucket + '">' + n.conf_bucket + '</span>'
      : '<span class="badge low">unknown</span>';
    let html = '<h3>Campaign · <code>' + esc(n.label) + '</code></h3>';
    if (n.protocol) html += '<div class="field"><span class="k">protocol</span><span class="v">' + esc(n.protocol) + '</span></div>';
    if (n.member_actor_count != null) html += '<div class="field"><span class="k">members</span><span class="v">' + n.member_actor_count + ' actors</span></div>';
    html += '<div class="field"><span class="k">confidence</span><span class="v">' + confBadge + '</span></div>';
    html += '<div class="attestation">' +
      '<strong>Coordinated activity.</strong> Materialized when ≥5 actors share a tool, span ≥3 ASNs, ' +
      'hit ≤5 dest ports, and persist for ≥1h. The full member list, payload signatures, and tool ' +
      'fingerprints are exposed via the defender tier (coming).' +
      '</div>';
    html += '<div class="attestation">' +
      'For a deeper look try ' +
      '<a href="https://chat.tunnelmind.ai" target="_blank" rel="noopener">the chat surface</a> or ' +
      '<code>curl https://api.tunnelmind.ai/v1/campaign/' + esc(n.label) + '</code>.' +
      '</div>';
    insp.innerHTML = html;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }
  function escAttr(s) { return esc(s); }
  function relTime(ms) {
    const d = Date.now() - ms;
    if (d < 60_000) return Math.floor(d / 1000) + 's ago';
    if (d < 3_600_000) return Math.floor(d / 60000) + 'm ago';
    if (d < 86_400_000) return Math.floor(d / 3600000) + 'h ago';
    return Math.floor(d / 86400000) + 'd ago';
  }

  // ── live updates: SSE feed, with a polling fallback ───────────────
  function startLiveUpdates() {
    if (typeof EventSource === 'undefined') {
      intervalId = setInterval(refresh, pollMs);
      return;
    }
    let errCount = 0;
    es = new EventSource('/api/stream');
    es.addEventListener('snapshot', (ev) => {
      errCount = 0;
      try {
        const d = JSON.parse(ev.data);
        applySnapshot(d.recent, d.campaigns, d.stats);
      } catch (e) {
        console.error(e);
      }
    });
    es.addEventListener('error', () => {
      // EventSource reconnects on its own after a transient drop; only
      // after several consecutive failures do we give up and poll.
      if (++errCount >= 3 && !intervalId) {
        if (es) { es.close(); es = null; }
        intervalId = setInterval(refresh, pollMs);
      }
    });
  }

  // ── bootstrap ─────────────────────────────────────────────────────
  refresh();            // instant first paint
  startLiveUpdates();   // live updates over SSE (falls back to polling)
  startGraphLoop();

  const onResize = () => drawGraph();
  window.addEventListener('resize', onResize);

  return function cleanup() {
    destroyed = true;
    stopGraphLoop();
    if (es) es.close();
    if (intervalId) clearInterval(intervalId);
    window.removeEventListener('resize', onResize);
  };
}

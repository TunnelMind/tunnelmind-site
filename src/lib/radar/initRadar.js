// Scry Radar force-graph — the live attacker-corpus visualization that is
// the TunnelMind landing page (P25 Phase 2).
//
// The force layout and SVG renderer are kept close to the proven
// scry-radar Worker implementation (P25 hard constraint: do not swap
// renderers). What this build adds on top:
//
//   - geo / network enrichment in the node inspector (country + flag,
//     ASN, org) plus a plain-language read for non-experts;
//   - an "overview" intel panel that fills the inspector when nothing is
//     selected — 24h pulse sparkline, protocol mix, top origin countries,
//     a data-derived headline — so the panel is never dead space;
//   - a live activity ticker: IPs that appear between snapshots slide in
//     along the bottom of the graph, and brand-new nodes pulse briefly;
//   - live data over the SSE feed (/api/stream), polling fallback intact.
//
// initRadar(root) -> cleanup()

export function initRadar(root, { pollMs = 10000 } = {}) {
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => root.querySelectorAll(sel);

  const W = () => $('#graphArea').clientWidth;
  const H = () => $('#graphArea').clientHeight;

  let mode = 'visual';
  let nodes = []; // [{ id, kind, label, ..., x, y, vx, vy, r, bornAt }]
  let edges = []; // [{ source, target }]
  let selected = null;
  let stats = null;
  let timeseries = null;
  let campaignsByMember = new Map(); // actor_ip -> [campaign_id]
  let lastRecent = null;
  let lastCampaigns = null;
  let knownIps = null;          // Set of source_ips seen so far (ticker diff)
  let tickerEvents = [];        // newest-first queue of {ip, country, kind, ts}

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

  // ── snapshot application ──────────────────────────────────────────
  // Shared by the SSE feed and the polling fallback. Pure DOM/state
  // update, no fetching.
  function applySnapshot(r, c, s, t) {
    if (destroyed || !r || !c || !s) return;
    lastRecent = r; lastCampaigns = c; stats = s;
    if (t && Array.isArray(t.buckets)) timeseries = t;

    const statsEl = $('#radarStats');
    if (statsEl) {
      statsEl.innerHTML =
        '<strong>' + fmt(s.total_observations) + '</strong> obs · ' +
        '<strong>' + fmt(s.distinct_source_ips) + '</strong> ips · ' +
        'last 24h <strong>' + fmt(s.observations_last_24h) + '</strong>';
    }

    detectNewArrivals(r);
    if (mode === 'json') renderJson();
    rebuildGraph(r, c);
    if (!selected) renderOverview();
  }

  // Diff the recent set against what we've already seen; anything new
  // becomes a ticker event. The first snapshot only seeds the set (no
  // ticker dump of 50 IPs at once).
  function detectNewArrivals(recent) {
    const list = (recent && recent.results) || [];
    if (knownIps === null) {
      knownIps = new Set(list.map((r) => r.source_ip));
      return;
    }
    const fresh = [];
    for (const r of list) {
      if (!knownIps.has(r.source_ip)) {
        knownIps.add(r.source_ip);
        fresh.push({
          ip: r.source_ip,
          country: r.country || null,
          kind: r.category === 'scanner' ? 'scanner' : 'actor',
          ts: Date.now(),
        });
      }
    }
    if (fresh.length) {
      tickerEvents = fresh.concat(tickerEvents).slice(0, 40);
      renderTicker();
    }
    // Bound the known set so it can't grow without limit.
    if (knownIps.size > 4000) knownIps = new Set(list.map((r) => r.source_ip));
  }

  function renderTicker() {
    const el = $('#radarTicker');
    if (!el) return;
    if (!tickerEvents.length) {
      el.innerHTML = '<span class="tk-idle">● live — watching for new activity</span>';
      return;
    }
    const e = tickerEvents[0];
    const fl = flagOf(e.country);
    el.innerHTML =
      '<span class="tk-dot"></span>' +
      '<span class="tk-time">' + clock(e.ts) + '</span>' +
      '<span class="tk-kind tk-' + e.kind + '">new ' + e.kind + '</span>' +
      '<span class="tk-ip">' + esc(e.ip) + '</span>' +
      (fl ? '<span class="tk-geo">' + fl + ' ' + esc(e.country) + '</span>' : '') +
      '<span class="tk-tail">entered the corpus</span>';
    // Restart the slide-in animation.
    el.classList.remove('tk-in');
    void el.offsetWidth;
    el.classList.add('tk-in');
  }

  // Polling fallback — drives the instant first paint, and every update
  // if the SSE stream is unavailable.
  async function refresh() {
    try {
      const [r, c, s, t] = await Promise.all([
        fetch('/api/recent?limit=50').then((x) => x.json()),
        fetch('/api/campaigns?limit=20').then((x) => x.json()),
        fetch('/api/stats').then((x) => x.json()),
        fetch('/api/timeseries').then((x) => x.json()).catch(() => null),
      ]);
      applySnapshot(r, c, s, t);
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
    const now = Date.now();

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
        first_seen_ms: c.first_seen_ms, last_seen_ms: c.last_seen_ms,
        payload_sha256_prefix: c.payload_sha256_prefix,
        r: 7 + Math.min(22, Math.log2((c.member_actor_count || 1) + 1) * 3),
        x: existing.x || W() / 2 + (Math.random() - 0.5) * 80,
        y: existing.y || H() / 2 + (Math.random() - 0.5) * 80,
        vx: existing.vx || 0, vy: existing.vy || 0,
        bornAt: existing.bornAt || now,
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
        asn: r.asn, country: r.country, org: r.org,
        conf_bucket: r.confidence_bucket,
        observations: r.observations,
        first_seen_ms: r.first_seen_ms, last_seen_ms: r.last_seen_ms,
        r: 3.5 + Math.min(9, Math.log2((r.observations || 1) + 1)),
        x: existing.x || Math.random() * W(),
        y: existing.y || Math.random() * H(),
        vx: existing.vx || 0, vy: existing.vy || 0,
        bornAt: existing.bornAt || now,
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
    const now = Date.now();
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
      const isSel = n.id === selected;
      const stroke = isSel ? '#fff' : (n.kind === 'campaign' ? '#fff3' : '#0006');
      const swidth = isSel ? 2 : 1;
      // Brand-new nodes (< 6s old) get a fading pulse ring.
      const age = now - (n.bornAt || now);
      if (age < 6000) {
        const p = age / 6000;
        html += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' +
                (n.r + 3 + p * 14) + '" fill="none" stroke="' + fill +
                '" stroke-width="1" opacity="' + (0.5 * (1 - p)).toFixed(3) + '"/>';
      }
      html += '<circle data-id="' + escAttr(n.id) +
              '" cx="' + n.x + '" cy="' + n.y + '" r="' + n.r + '" fill="' + fill +
              '" stroke="' + stroke + '" stroke-width="' + swidth + '" style="cursor:pointer"/>';
    }
    svg.innerHTML = html;

    // Click is delegated to the persistent <svg>, wired exactly once.
    // The force loop rebuilds svg.innerHTML every frame, so per-circle
    // listeners never survive between a user's mousedown and mouseup —
    // the circle they pressed is a different DOM node by mouseup, so the
    // `click` event never fires. The <svg> itself persists, so one
    // delegated listener on it is stable across every redraw.
    if (!svg.dataset.clickWired) {
      svg.dataset.clickWired = '1';
      svg.addEventListener('click', (ev) => {
        const circle = ev.target.closest('circle[data-id]');
        if (circle) selectNode(circle.getAttribute('data-id'));
      });
    }
  }

  function selectNode(id) {
    selected = id;
    const n = nodes.find((x) => x.id === id);
    if (!n) return;
    if (n.kind === 'campaign') renderCampaignInspector(n);
    else renderActorInspector(n);
  }

  function clearSelection() {
    selected = null;
    renderOverview();
  }

  // ── overview panel (inspector default state) ──────────────────────
  // When nothing is selected the inspector becomes a live intel summary,
  // so the panel always carries data — for the executive skimming and
  // the casual visitor as much as the analyst.
  function renderOverview() {
    const insp = $('#inspector');
    if (!insp) return;
    if (!stats) { insp.innerHTML = '<div class="placeholder">Loading the corpus…</div>'; return; }

    const recentList = (lastRecent && lastRecent.results) || [];
    const campaignList = (lastCampaigns && lastCampaigns.results) || [];

    let html = '<div class="ov-head">' +
      '<h3>Corpus — live</h3>' +
      '<span class="ov-sub">last hour, hostile traffic only</span></div>';

    html += '<div class="ov-headline">' + headline() + '</div>';

    // 24h pulse sparkline.
    if (timeseries && timeseries.buckets && timeseries.buckets.length > 1) {
      const b = timeseries.buckets;
      const peak = Math.max(...b.map((x) => x.observations || 0));
      html += '<div class="ov-section">' +
        '<div class="ov-label">24-hour pulse <span class="ov-peak">peak ' +
        fmt(peak) + '/h</span></div>' +
        sparkline(b) + '</div>';
    }

    // Protocol mix.
    if (stats.by_protocol) {
      const entries = Object.entries(stats.by_protocol)
        .sort((a, b) => b[1] - a[1]).slice(0, 6);
      const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
      html += '<div class="ov-section"><div class="ov-label">What they\'re hitting</div>';
      for (const [proto, n] of entries) {
        const pct = Math.round((n / total) * 100);
        html += '<div class="ov-bar-row">' +
          '<span class="ov-bar-name">' + esc(proto) + '</span>' +
          '<span class="ov-bar-track"><span class="ov-bar-fill" style="width:' +
          Math.max(2, pct) + '%"></span></span>' +
          '<span class="ov-bar-pct">' + pct + '%</span></div>';
      }
      html += '</div>';
    }

    // Top origin countries — derived from the visible sample. Renders
    // only once geo enrichment is live (otherwise country is null).
    const byCountry = new Map();
    for (const r of recentList) {
      if (!r.country) continue;
      byCountry.set(r.country, (byCountry.get(r.country) || 0) + 1);
    }
    if (byCountry.size) {
      const top = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      html += '<div class="ov-section"><div class="ov-label">Where this sample comes from</div>' +
        '<div class="ov-countries">';
      for (const [cc, n] of top) {
        html += '<span class="ov-country">' + flagOf(cc) + ' ' + esc(cc) +
          '<span class="ov-country-n">' + n + '</span></span>';
      }
      html += '</div></div>';
    }

    // Sample composition.
    const scanners = recentList.filter((r) => r.category === 'scanner').length;
    const actors = recentList.length - scanners;
    html += '<div class="ov-section"><div class="ov-label">In view right now</div>' +
      '<div class="ov-mini-grid">' +
      ovMini(actors, 'actors') +
      ovMini(scanners, 'scanners') +
      ovMini(campaignList.length, 'campaigns') +
      '</div></div>';

    html += '<div class="ov-hint">Click any node for the full record. ' +
      'Switch to <strong>JSON</strong> or <strong>curl</strong> above — ' +
      'the same data, the way an API client or an AI agent would take it.</div>';

    insp.innerHTML = html;
  }

  function ovMini(value, label) {
    return '<div class="ov-mini"><span class="ov-mini-v">' + fmt(value) +
      '</span><span class="ov-mini-l">' + label + '</span></div>';
  }

  // A plain-language read of the corpus state, derived from stats. Serves
  // the visitor who is not going to parse a protocol histogram.
  function headline() {
    if (!stats || !stats.by_protocol) return 'Watching the hostile internet in real time.';
    const entries = Object.entries(stats.by_protocol).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return 'Watching the hostile internet in real time.';
    const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
    const [proto, n] = entries[0];
    const pct = Math.round((n / total) * 100);
    const gloss = {
      telnet: 'the unmistakable signature of IoT-botnet sweeps',
      ssh: 'credential-stuffing against login services',
      http: 'web-app probing and exploit scanning',
      https: 'web-app probing over TLS',
      mysql: 'database servers being hunted for the taking',
      mongodb: 'unsecured databases being hunted',
      redis: 'exposed caches being hunted',
      smtp: 'mail infrastructure being probed for relay abuse',
      ftp: 'legacy file servers under attack',
      elasticsearch: 'open search clusters being raided',
    }[proto] || 'automated attack traffic';
    return '<strong>' + esc(proto) + '</strong> leads the corpus at <strong>' +
      pct + '%</strong> of observed traffic — ' + gloss + '.';
  }

  // Tiny inline-SVG sparkline of hourly observation volume.
  function sparkline(buckets) {
    const w = 268, h = 46, pad = 2;
    const vals = buckets.map((b) => b.observations || 0);
    const max = Math.max(...vals, 1);
    const n = vals.length;
    const x = (i) => pad + (i / (n - 1)) * (w - 2 * pad);
    const y = (v) => h - pad - (v / max) * (h - 2 * pad);
    let line = '', area = '';
    vals.forEach((v, i) => {
      line += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' ';
    });
    area = 'M' + x(0).toFixed(1) + ' ' + (h - pad) + ' ' +
      line.replace(/^M/, 'L') + 'L' + x(n - 1).toFixed(1) + ' ' + (h - pad) + ' Z';
    const lastX = x(n - 1).toFixed(1), lastY = y(vals[n - 1]).toFixed(1);
    return '<svg class="ov-spark" viewBox="0 0 ' + w + ' ' + h + '" ' +
      'preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="' + area + '" fill="var(--radar-accent)" opacity="0.12"/>' +
      '<path d="' + line + '" fill="none" stroke="var(--radar-accent)" ' +
      'stroke-width="1.5" vector-effect="non-scaling-stroke"/>' +
      '<circle cx="' + lastX + '" cy="' + lastY + '" r="2.4" fill="var(--radar-accent)"/>' +
      '</svg>';
  }

  // ── node inspectors ───────────────────────────────────────────────
  function inspectorBackBar() {
    return '<button class="insp-back" type="button">← corpus overview</button>';
  }

  function renderActorInspector(n) {
    const insp = $('#inspector');
    const ip = n.label;
    const memberCampaigns = campaignsByMember.get(ip) || [];
    const confBadge = n.conf_bucket
      ? '<span class="badge ' + n.conf_bucket + '">' + n.conf_bucket + '</span>'
      : '<span class="badge low">unknown</span>';
    const catBadge = '<span class="badge ' + n.kind + '">' + n.kind + '</span>';

    let html = inspectorBackBar();
    html += '<h3 class="insp-ip">' + esc(ip) + '</h3>';

    // Plain-language read — the casual / executive view.
    html += '<div class="insp-read">' + actorRead(n, memberCampaigns) + '</div>';

    html += '<div class="insp-fields">';
    html += field('category', catBadge);
    html += field('confidence', confBadge);
    if (n.observations) html += field('observations', '<span class="v-num">' + fmt(n.observations) + '</span>');
    if (n.country) {
      html += field('origin', flagOf(n.country) + ' ' + esc(countryName(n.country)) +
        ' <span class="v-dim">' + esc(n.country) + '</span>');
    }
    if (n.asn) {
      html += field('network', 'AS' + esc(n.asn) +
        (n.org ? ' <span class="v-dim">' + esc(n.org) + '</span>' : ''));
    }
    if (n.first_seen_ms) html += field('first seen', relTime(n.first_seen_ms));
    if (n.last_seen_ms) html += field('last seen', relTime(n.last_seen_ms));
    if (memberCampaigns.length) {
      html += field('in campaigns',
        memberCampaigns.map((c) => '<code>' + esc(c.slice(0, 8)) + '…</code>').join(' '));
    }
    html += '</div>';

    html += '<div class="attestation">' +
      '<strong>Attestation provenance.</strong> Every observation behind this ' +
      'record was Ed25519-signed at the sensor and verified at ingest. The ' +
      'signing key is bound to the sensor identity; a bad signature is dropped ' +
      'before it reaches the corpus.' +
      '</div>';

    html += '<div class="whois-wrap">' +
      '<button class="whois-btn" type="button">Registry record (RDAP) →</button>' +
      '<div class="whois-slot"></div>' +
      '</div>';

    insp.innerHTML = html;
    wireBack(insp);
    const wb = insp.querySelector('.whois-btn');
    if (wb) wb.addEventListener('click', () => loadWhois(ip, wb, insp));
  }

  // One-sentence interpretation of an actor node.
  function actorRead(n, memberCampaigns) {
    const where = n.country
      ? 'A host in ' + esc(countryName(n.country))
      : 'A host';
    const net = n.org ? ', on ' + esc(n.org) + ',' : '';
    const span = (n.first_seen_ms && n.last_seen_ms)
      ? ' across ' + spanText(n.last_seen_ms - n.first_seen_ms)
      : '';
    if (n.kind === 'scanner') {
      return flagOf(n.country) + ' ' + where + net +
        ' sweeping the internet indiscriminately — ' + fmt(n.observations || 0) +
        ' probes' + span + '. Broad reconnaissance, not a targeted operator.';
    }
    const camp = memberCampaigns.length
      ? ' It moves with a known campaign — the same tool seen across multiple networks.'
      : '';
    const conf = n.conf_bucket === 'high'
      ? ' High-confidence hostile.'
      : n.conf_bucket === 'medium' ? ' Medium-confidence hostile.' : '';
    return flagOf(n.country) + ' ' + where + net + ' running a focused attack — ' +
      fmt(n.observations || 0) + ' hostile observations' + span + '.' + conf + camp;
  }

  // ── WHOIS / RDAP click-through ────────────────────────────────────
  // Secondary detail: the registry record for an actor's address. Geo
  // and network already show inline (from the corpus); RDAP adds the
  // registrant / abuse-contact layer. Deferred to a click so the radar
  // never fans out a lookup per visible node, and best-effort — the
  // public RDAP relay is occasionally slow.
  async function loadWhois(ip, btn, insp) {
    const slot = insp.querySelector('.whois-slot');
    btn.textContent = 'looking up…';
    btn.disabled = true;
    try {
      const r = await fetch('/api/rdap/' + encodeURIComponent(ip)).then((x) => x.json());
      if (!slot) return;
      if (r.error) {
        slot.innerHTML = '<div class="whois-err">No registry record came back — ' +
          'the public RDAP relay may be rate-limiting. Try again shortly.</div>';
        btn.textContent = 'Retry RDAP →';
        btn.disabled = false;
        return;
      }
      const row = (k, v) =>
        v ? '<div class="field"><span class="k">' + k + '</span><span class="v">' +
          esc(v) + '</span></div>' : '';
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
      btn.style.display = 'none';
    } catch {
      if (slot) slot.innerHTML = '<div class="whois-err">RDAP lookup failed — try again.</div>';
      btn.textContent = 'Retry RDAP →';
      btn.disabled = false;
    }
  }

  function renderCampaignInspector(n) {
    const insp = $('#inspector');
    const confBadge = n.conf_bucket
      ? '<span class="badge ' + n.conf_bucket + '">' + n.conf_bucket + '</span>'
      : '<span class="badge low">unknown</span>';

    let html = inspectorBackBar();
    html += '<h3>Campaign <code class="insp-cid">' + esc(n.label) + '</code></h3>';

    const members = n.member_actor_count != null ? fmt(n.member_actor_count) : 'multiple';
    html += '<div class="insp-read">' +
      'A coordinated cluster of <strong>' + members + ' actors</strong> running the ' +
      'same ' + (n.protocol ? '<strong>' + esc(n.protocol) + '</strong> ' : '') +
      'tool across separate networks — one operation, many machines.' +
      '</div>';

    html += '<div class="insp-fields">';
    if (n.protocol) html += field('protocol', esc(n.protocol));
    if (n.member_actor_count != null) html += field('members', fmt(n.member_actor_count) + ' actors');
    html += field('confidence', confBadge);
    if (n.payload_sha256_prefix) html += field('payload', '<code>' + esc(n.payload_sha256_prefix) + '…</code>');
    if (n.first_seen_ms) html += field('first seen', relTime(n.first_seen_ms));
    if (n.last_seen_ms) html += field('last seen', relTime(n.last_seen_ms));
    html += '</div>';

    html += '<div class="attestation">' +
      '<strong>How a campaign is drawn.</strong> Materialized when ≥5 actors share a ' +
      'tool, span ≥3 ASNs, hit ≤5 destination ports, and persist ≥1h. The full ' +
      'member list, payload signatures, and tool fingerprints are the defender tier.' +
      '</div>';
    html += '<div class="attestation">' +
      'Go deeper in <a href="https://chat.tunnelmind.ai" target="_blank" rel="noopener">the chat</a> ' +
      'or <code>curl https://api.tunnelmind.ai/v1/campaign/' + esc(n.label) + '</code>.' +
      '</div>';

    insp.innerHTML = html;
    wireBack(insp);
  }

  function wireBack(insp) {
    const b = insp.querySelector('.insp-back');
    if (b) b.addEventListener('click', clearSelection);
  }

  function field(k, v) {
    return '<div class="field"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>';
  }

  // ── small helpers ─────────────────────────────────────────────────
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }
  function escAttr(s) { return esc(s); }

  function fmt(n) {
    const v = Number(n) || 0;
    return v.toLocaleString('en-US');
  }

  function flagOf(cc) {
    if (!cc || typeof cc !== 'string' || cc.length !== 2 || !/^[A-Za-z]{2}$/.test(cc)) return '';
    const base = 0x1F1E6;
    const up = cc.toUpperCase();
    return String.fromCodePoint(
      base + up.charCodeAt(0) - 65, base + up.charCodeAt(1) - 65);
  }

  let regionNames = null;
  function countryName(cc) {
    if (!cc) return '';
    try {
      if (!regionNames) regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      return regionNames.of(cc.toUpperCase()) || cc;
    } catch { return cc; }
  }

  function relTime(ms) {
    const d = Date.now() - ms;
    if (d < 60_000) return Math.floor(d / 1000) + 's ago';
    if (d < 3_600_000) return Math.floor(d / 60000) + 'm ago';
    if (d < 86_400_000) return Math.floor(d / 3600000) + 'h ago';
    return Math.floor(d / 86400000) + 'd ago';
  }
  function spanText(ms) {
    if (ms < 3_600_000) return Math.max(1, Math.round(ms / 60000)) + ' minutes';
    if (ms < 86_400_000) return Math.max(1, Math.round(ms / 3600000)) + ' hours';
    return Math.max(1, Math.round(ms / 86400000)) + ' days';
  }
  function clock(ts) {
    const d = new Date(ts);
    const p = (x) => String(x).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
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
        applySnapshot(d.recent, d.campaigns, d.stats, d.timeseries);
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
  renderOverview();     // panel shows "loading" until the first snapshot
  renderTicker();       // ticker shows its idle state
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

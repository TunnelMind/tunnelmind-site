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

// initRadar(root, opts) -> cleanup()
//   pollMs        — polling interval if SSE is unavailable
//   initialLookup — domain or IP to auto-inspect on bootstrap (deep link
//                   target for /#/?inspect=<host>, used when retiring
//                   netprobe.tunnelmind.ai by 301)
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';

export function initRadar(root, { pollMs = 10000, initialLookup = null } = {}) {
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

  // Inspector state. `inspectorMode` decides who owns the panel body so
  // a live snapshot does not blow away a lookup-in-progress or a node
  // detail the user is reading.
  //   'overview' — default; the live corpus summary, re-renders per snapshot
  //   'node'     — a radar node is selected; written by selectNode()
  //   'lookup'   — a host was typed into the lookup form; tabbed intel
  let inspectorMode = 'overview';
  let lookupHost = null;
  let lookupTab = null;          // the tab the user is currently looking at, so a
                                 // slow earlier tab's late response can't clobber it
  const tabCache = new Map();    // `${host}:${tab}` -> trimmed payload (lazy; success-only)
  const tabInflight = new Map(); // `${host}:${tab}` -> Promise; dedupes simultaneous clicks

  let rafId = null;
  let intervalId = null;
  let es = null;
  let destroyed = false;
  let graph3d = null;

  // Node fill by kind — hardcoded hex (three.js can't read CSS vars).
  // Mirrors --radar-node-* in index.css.
  const NODE_COLOR = {
    campaign: '#c9a84c', // geometry gold
    scanner:  '#6b7280',
    claude:   '#cc785c', // Anthropic clay (verified ClaudeBot)
    vendor:   '#9b6fd4', // Tracker violet
    actor:    '#00d4ff', // Scry cyan
  };
  const nodeColorFn = (n) =>
    n.id === selected ? '#ffffff' : (NODE_COLOR[n.kind] || NODE_COLOR.actor);
  function refreshNodeColors() { if (graph3d) graph3d.nodeColor(nodeColorFn); }

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
    syncGraph3d();
    updateLegend();
    if (inspectorMode === 'overview') renderOverview();
  }

  // The legend is honest about the visible sample — it advertises only
  // the kinds present in the current snapshot. The corpus right now
  // emits exclusively `actor` observations from scry-server / Augur, so
  // the `scanner` row would otherwise sit there forever pointing at a
  // grey dot that never appears.
  function updateLegend() {
    const kinds = new Set(nodes.map((n) => n.kind));
    for (const k of ['actor', 'scanner', 'campaign', 'vendor', 'claude']) {
      const el = root.querySelector('.rl-item-' + k);
      if (el) el.style.display = kinds.has(k) ? '' : 'none';
    }
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
      // Vendor-aware kind override: a non-hostile classification (Palo
      // Alto / Shodan / Censys / ClaudeBot etc.) gets its own color and
      // narrative so a viewer can instantly tell benign infrastructure
      // apart from a hostile actor. `elevate` is the verified-Anthropic
      // tier (ClaudeBot); `neutral` is every other vendor class.
      const isClassified = r.actor_class &&
        r.actor_class !== 'unknown' && !r.actor_class.startsWith('hostile_');
      const kind = r.actor_class_treatment === 'elevate' ? 'claude'
                 : isClassified ? 'vendor'
                 : r.category === 'scanner' ? 'scanner' : 'actor';
      nextNodes.push({
        id,
        kind,
        label: r.source_ip,
        asn: r.asn, country: r.country, org: r.org,
        conf_bucket: r.confidence_bucket,
        observations: r.observations,
        first_seen_ms: r.first_seen_ms, last_seen_ms: r.last_seen_ms,
        // Actor-class overlay fields — see /v1/recent shaper in
        // scry-server/src/routes/recent.js and the classifier in
        // scry-server/src/lib/actor_class.js.
        actor_class: r.actor_class || null,
        actor_class_label: r.actor_class_label || null,
        actor_class_trust: r.actor_class_trust || null,
        actor_class_treatment: r.actor_class_treatment || null,
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

  // ── 3D force graph (WebGL via three.js / 3d-force-graph) ──────────
  // Swaps the old hand-rolled 2D SVG force layout for a real 3D graph.
  // The data model (nodes/edges) and the inspector (selectNode) are
  // unchanged — only the renderer. OrbitControls give rotate/zoom/pan.
  function ensureGraph3d() {
    if (graph3d || destroyed) return;
    const el = $('#graphArea');
    if (!el) return;
    const svg = $('#graphSvg');
    if (svg) svg.style.display = 'none'; // legacy SVG layer no longer renders
    graph3d = ForceGraph3D()(el)
      .backgroundColor('rgba(0,0,0,0)')
      .width(W()).height(H())
      .showNavInfo(false)
      .nodeId('id')
      .nodeVal((n) => n.r)
      .nodeRelSize(2.4)
      .nodeColor(nodeColorFn)
      .nodeOpacity(0.92)
      .nodeResolution(14)
      .nodeLabel(hoverLabel)
      // Campaign hubs carry an always-on text label so the cloud reads at a
      // glance instead of requiring a hover on every dot.
      .nodeThreeObjectExtend(true)
      .nodeThreeObject(nodeLabelObject)
      .linkColor(() => '#3a3f4b')
      .linkWidth(0.4)
      .linkOpacity(0.5)
      // Floaty, smooth motion. Lower velocity decay lets nodes keep momentum
      // and glide rather than snapping to rest; lower alpha decay makes the
      // settle long and gentle; a cooldown longer than the 10s snapshot poll
      // means the layout never hard-freezes — each refresh reheats before the
      // previous one fully stills, so there's a continuous gentle drift. Fewer
      // warmup ticks lets nodes ease into place on first paint instead of
      // appearing pre-settled.
      .d3VelocityDecay(0.25)
      .d3AlphaDecay(0.0125)
      .warmupTicks(12)
      .cooldownTime(16000)
      // Pointer affordance — without it the dots don't read as clickable.
      .onNodeHover((n) => { el.style.cursor = n ? 'pointer' : 'grab'; })
      .onNodeClick((n) => { selectNode(n.id); focusNode(n); });
    el.style.cursor = 'grab';
    // Trackball camera: more inertia so a flick drifts to a smooth stop
    // instead of halting abruptly — the camera feels as floaty as the nodes.
    const ctrl = graph3d.controls();
    if (ctrl) {
      ctrl.staticMoving = false;
      ctrl.dynamicDampingFactor = 0.08;
      ctrl.rotateSpeed = 0.8;
      ctrl.zoomSpeed = 0.9;
    }
    syncGraph3d();
  }

  // Richer hover tooltip than a bare IP: kind + label + (for actors) origin
  // and network so the graph is legible before you even click.
  function hoverLabel(n) {
    if (n.kind === 'campaign') {
      return 'Campaign · ' + esc(n.protocol ? n.protocol.toUpperCase() : '?') +
        (n.member_actor_count != null ? ' · ' + fmt(n.member_actor_count) + ' actors' : '');
    }
    const bits = [esc(n.label)];
    if (n.country) bits.push(flagOf(n.country) + ' ' + esc(n.country));
    if (n.asn) bits.push('AS' + esc(n.asn));
    return bits.join('  ·  ');
  }

  // Always-on sprite label for the prominent nodes (campaign hubs). Returns
  // undefined for ordinary actor/scanner dots so they stay clean — with
  // nodeThreeObjectExtend(true) a returned sprite is *added to* the default
  // sphere rather than replacing it.
  function nodeLabelObject(n) {
    if (n.kind !== 'campaign') return undefined;
    const text = (n.protocol ? n.protocol.toUpperCase() : 'campaign') +
      (n.member_actor_count != null ? ' · ' + n.member_actor_count : '');
    return makeLabelSprite(text, '#c9a84c', (n.r || 8));
  }

  // Text → pill sprite via a 2D canvas texture. Uses the same `three`
  // instance 3d-force-graph renders with (single hoisted copy), so the
  // sprite composites correctly into the scene.
  function makeLabelSprite(text, color, nodeR) {
    const dpr = 2;
    const fontPx = 26;
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = '600 ' + fontPx + 'px ui-sans-serif, system-ui, sans-serif';
    const padX = 16, padY = 9;
    const tw = Math.ceil(measure.measureText(text).width);
    const w = tw + padX * 2, h = fontPx + padY * 2;
    const canvas = document.createElement('canvas');
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.font = '600 ' + fontPx + 'px ui-sans-serif, system-ui, sans-serif';
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.arcTo(w, 0, w, h, radius);
    ctx.arcTo(w, h, 0, h, radius);
    ctx.arcTo(0, h, 0, 0, radius);
    ctx.arcTo(0, 0, w, 0, radius);
    ctx.closePath();
    ctx.fillStyle = 'rgba(15,23,42,0.82)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(201,168,76,0.55)';
    ctx.stroke();
    ctx.fillStyle = color || '#e2e8f0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h / 2 + 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }),
    );
    const s = 0.42; // world-units per CSS px
    sprite.scale.set(w * s, h * s, 1);
    // Float the label just above the node sphere.
    sprite.position.set(0, (nodeR || 8) + h * s * 0.7, 0);
    return sprite;
  }

  // Fly the camera to frame a clicked node so it doesn't get lost in the
  // cloud — the single biggest navigability win for a 3D force graph.
  function focusNode(n) {
    if (!graph3d || !n || n.x == null) return;
    const dist = 90;
    const r = Math.hypot(n.x, n.y, n.z || 0) || 1;
    const k = 1 + dist / r;
    graph3d.cameraPosition(
      { x: n.x * k, y: n.y * k, z: (n.z || 0) * k },
      { x: n.x, y: n.y, z: n.z || 0 },
      1300,
    );
  }

  // Push current nodes/edges into the 3D graph, carrying computed x/y/z
  // from the previous frame by id so positions persist across snapshots
  // (brand-new nodes are auto-placed by the layout).
  function syncGraph3d() {
    if (!graph3d) return;
    const live = new Map((graph3d.graphData().nodes || []).map((n) => [n.id, n]));
    for (const n of nodes) {
      const p = live.get(n.id);
      if (p) { n.x = p.x; n.y = p.y; n.z = p.z; n.vx = p.vx; n.vy = p.vy; n.vz = p.vz; }
      else { delete n.x; delete n.y; delete n.z; }
    }
    graph3d.graphData({ nodes, links: edges });
  }

  function startGraphLoop() {
    if (destroyed) return;
    if (!graph3d) { ensureGraph3d(); return; }
    graph3d.resumeAnimation();
  }
  function stopGraphLoop() {
    if (graph3d) graph3d.pauseAnimation();
  }

  function selectNode(id) {
    selected = id;
    const n = nodes.find((x) => x.id === id);
    if (!n) return;
    inspectorMode = 'node';
    if (n.kind === 'campaign') renderCampaignInspector(n);
    else renderActorInspector(n);
    refreshNodeColors();
  }

  function clearSelection() {
    selected = null;
    lookupHost = null;
    inspectorMode = 'overview';
    renderOverview();
    refreshNodeColors();
  }

  // ── inspector shell ───────────────────────────────────────────────
  // The right-hand panel has a persistent header (the Corpus lookup
  // form) plus a body that the render* functions own. The gate checks
  // for the BODY ELEMENT, not a dataset flag — if React reconciles and
  // wipes our children but leaves the dataset, a flag-based gate would
  // skip the rewrite and every subsequent click would silently no-op
  // (since render* fns bail when inspectorBody() returns null). Checking
  // the element directly makes this self-healing.
  //
  // The lookup-form input value is preserved across rewrites so a
  // visitor mid-type doesn't lose their input on a snapshot tick.
  function ensureInspectorShell() {
    const insp = $('#inspector');
    if (!insp) return;
    if (insp.querySelector('#inspectorBody') && insp.querySelector('#inspectorLookup')) return;
    // Capture any in-progress lookup input so we can restore it after.
    const prevInput = insp.querySelector('#inspectorLookup input[name="host"]');
    const prevValue = prevInput ? prevInput.value : '';
    insp.innerHTML =
      '<form id="inspectorLookup" class="insp-lookup" autocomplete="off">' +
        '<div class="insp-lookup-label">Look up the corpus</div>' +
        '<div class="insp-lookup-row">' +
          '<input type="text" name="host" placeholder="domain or IP" ' +
            'spellcheck="false" autocapitalize="off" autocorrect="off" ' +
            'inputmode="url" />' +
          '<button type="submit" aria-label="Look up">→</button>' +
        '</div>' +
        '<div class="insp-lookup-hint">Powers humans and agents — same data, ' +
          'available over <a href="https://api.tunnelmind.ai">REST</a> and ' +
          '<a href="https://mcp.tunnelmind.ai">MCP</a>.</div>' +
      '</form>' +
      '<div id="inspectorBody"><div class="placeholder">Loading the corpus…</div></div>';
    const form = insp.querySelector('#inspectorLookup');
    const input = form.querySelector('input[name="host"]');
    if (prevValue) input.value = prevValue;
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      enterLookup(v);
    });
  }

  function inspectorBody() {
    const insp = $('#inspector');
    return insp ? insp.querySelector('#inspectorBody') : null;
  }

  function setLookupInput(value) {
    const f = $('#inspectorLookup');
    if (!f) return;
    const i = f.querySelector('input[name="host"]');
    if (i) i.value = value;
  }

  // ── overview panel (inspector default state) ──────────────────────
  // When nothing is selected the inspector becomes a live intel summary,
  // so the panel always carries data — for the executive skimming and
  // the casual visitor as much as the analyst.
  function renderOverview() {
    ensureInspectorShell();
    const body = inspectorBody();
    if (!body) return;
    if (!stats) { body.innerHTML = '<div class="placeholder">Loading the corpus…</div>'; return; }

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

    html += '<div class="ov-hint">Click any node for the full record, or ' +
      'type a domain or IP above to inspect the corpus. ' +
      'Switch to <strong>JSON</strong> or <strong>curl</strong> above the radar — ' +
      'the same data, the way an API client or an AI agent would take it.</div>';

    body.innerHTML = html;
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
    ensureInspectorShell();
    const body = inspectorBody();
    if (!body) return;
    const ip = n.label;
    const memberCampaigns = campaignsByMember.get(ip) || [];
    const confBadge = n.conf_bucket
      ? '<span class="badge ' + n.conf_bucket + '">' + n.conf_bucket + '</span>'
      : '<span class="badge low">unknown</span>';
    const catBadge = '<span class="badge ' + n.kind + '">' + n.kind + '</span>';

    let html = inspectorBackBar();
    html += '<h3 class="insp-ip">' + esc(ip) + '</h3>';

    // Vendor / verified-Anthropic banner — surfaces the most important
    // fact about a classified IP above everything else, so a viewer
    // can't miss that they're looking at e.g. Palo Alto's security
    // infra rather than a hostile actor.
    if (n.actor_class_label &&
        n.actor_class_treatment !== 'default' &&
        n.actor_class !== 'unknown') {
      const trustNote = n.actor_class_trust === 'verified_anthropic'
        ? ' <span class="vendor-trust">verified Anthropic</span>'
        : '';
      const banner = n.actor_class_treatment === 'elevate'
        ? 'vendor-banner vendor-banner-elevate'
        : 'vendor-banner';
      html += '<div class="' + banner + '">' +
        '<span class="vendor-label">' + esc(n.actor_class_label) + '</span>' +
        trustNote +
        '</div>';
    }

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
      '<button class="whois-btn bgp-btn" type="button">Live routing &amp; BGP →</button>' +
      '<div class="bgp-slot"></div>' +
      '</div>';

    // Pivot from a clicked actor into the full Corpus inspector for the
    // same IP — reputation, cert appearances, reverse-DNS via the tabs.
    html += '<div class="insp-pivot">' +
      '<button class="insp-pivot-btn" type="button" data-host="' + escAttr(ip) + '">' +
        'Inspect ' + esc(ip) + ' in Corpus →' +
      '</button></div>';

    body.innerHTML = html;
    wireBack(body);
    const wb = body.querySelector('.whois-btn:not(.bgp-btn)');
    if (wb) wb.addEventListener('click', () => loadWhois(ip, wb, body));
    const gb = body.querySelector('.bgp-btn');
    if (gb) gb.addEventListener('click', () => loadRouting(ip, gb, body));
    const pb = body.querySelector('.insp-pivot-btn');
    if (pb) pb.addEventListener('click', () => enterLookup(pb.dataset.host));
  }

  // Live BGP / routing for the clicked IP — ASN, the announced prefix, and
  // whether the prefix is globally routed right now. The static ASN is
  // already shown inline; this adds the genuinely-BGP facts (prefix +
  // announced state from RIPEstat) one click from the radar, so a visitor
  // sees routing without drilling into the Corpus BGP tab. Deferred to a
  // click — like RDAP — so the radar never fans a lookup per visible node.
  async function loadRouting(ip, btn, scope) {
    const slot = scope.querySelector('.bgp-slot');
    btn.textContent = 'querying RIPEstat…';
    btn.disabled = true;
    try {
      const r = await fetch('/api/corpus/asn/' + encodeURIComponent(ip)).then((x) => x.json());
      if (!slot) return;
      const addr = (r && Array.isArray(r.addresses))
        ? (r.addresses.find((a) => a.asn || a.prefix) || r.addresses[0])
        : null;
      if (!r || r.error || !addr) {
        slot.innerHTML = '<div class="whois-err">No routing data came back — the ' +
          'RIPEstat relay may be rate-limiting. Try again shortly.</div>';
        btn.textContent = 'Retry routing →';
        btn.disabled = false;
        return;
      }
      const row = (k, v) =>
        v ? '<div class="field"><span class="k">' + k + '</span><span class="v">' +
          v + '</span></div>' : '';
      const announced = addr.announced === true ? 'yes — globally routed'
        : addr.announced === false ? 'no — not in the global table' : null;
      slot.innerHTML =
        '<div class="whois-box">' +
        row('ASN', addr.asn ? 'AS' + esc(addr.asn) : null) +
        row('holder', addr.org ? esc(addr.org) : null) +
        row('prefix', addr.prefix ? '<code>' + esc(addr.prefix) + '</code>' : null) +
        row('announced', announced ? esc(announced) : null) +
        '</div>' +
        '<div class="insp-pivot"><button class="insp-pivot-btn bgp-full-btn" ' +
          'type="button">Full BGP tab →</button></div>';
      btn.style.display = 'none';
      const fb = slot.querySelector('.bgp-full-btn');
      if (fb) fb.addEventListener('click', () => enterLookup(ip, 'asn'));
    } catch {
      if (slot) slot.innerHTML = '<div class="whois-err">Routing lookup failed — try again.</div>';
      btn.textContent = 'Retry routing →';
      btn.disabled = false;
    }
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

    // Class-aware override: a benign-classified actor (Palo Alto / Shodan
    // / Censys / verified ClaudeBot) gets its own honest read instead of
    // the hostile-actor narrative. The honeypot may have logged the
    // connection but we know who it is and we know they're not malicious.
    if (n.actor_class && n.actor_class !== 'unknown' &&
        !n.actor_class.startsWith('hostile_') && n.kind !== 'scanner') {
      const friendly = classFriendlyName(n.actor_class);
      const trustNote = n.actor_class_trust === 'verified_anthropic'
        ? ' Verified Anthropic crawler.'
        : '';
      return flagOf(n.country) + ' ' + esc(n.actor_class_label || friendly) +
        ' — observed in our honeypots ' + fmt(n.observations || 0) +
        ' times' + span + ', cataloged as a known ' + friendly + '.' +
        ' Not a threat.' + trustNote;
    }

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

  // Human-readable expansion of an actor_class id, used in the narrative
  // when no explicit actor_class_label is set. Keep in sync with the
  // catalog entries in scry-server/src/lib/actor_class.js.
  function classFriendlyName(c) {
    return ({
      crawler_ai_agent_anthropic: 'Anthropic AI agent crawler',
      crawler_ai_agent:           'AI agent crawler',
      crawler_search:             'search engine crawler',
      scanner_security_vendor:    'security vendor scanner',
      scanner_research:           'internet research scanner',
      cdn_egress:                 'CDN egress IP',
      tor_exit:                   'Tor exit node',
      vpn_consumer:               'consumer VPN egress',
      sinkhole:                   'security sinkhole',
    })[c] || 'cataloged entity';
  }

  // ── WHOIS / RDAP click-through ────────────────────────────────────
  // Secondary detail: the registry record for an actor's address. Geo
  // and network already show inline (from the corpus); RDAP adds the
  // registrant / abuse-contact layer. Deferred to a click so the radar
  // never fans out a lookup per visible node, and best-effort — the
  // public RDAP relay is occasionally slow.
  async function loadWhois(ip, btn, scope) {
    const slot = scope.querySelector('.whois-slot');
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
    ensureInspectorShell();
    const body = inspectorBody();
    if (!body) return;
    const confBadge = n.conf_bucket
      ? '<span class="badge ' + n.conf_bucket + '">' + n.conf_bucket + '</span>'
      : '<span class="badge low">unknown</span>';

    let html = inspectorBackBar();
    html += '<h3>Campaign <code class="insp-cid">' + esc(n.label) + '</code></h3>';

    const totalMembers = n.member_actor_count != null ? fmt(n.member_actor_count) : 'multiple';
    html += '<div class="insp-read">' +
      'A coordinated cluster of <strong>' + totalMembers + ' actors</strong> running the ' +
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

    // ── Visible members ──────────────────────────────────────────
    // The public /v1/campaigns surface doesn't expose membership (that's
    // defender tier), but `rebuildGraph` already linked actors → campaigns
    // by time-window overlap and stored that in campaignsByMember. So
    // every IP whose membership list contains THIS campaign id is visible
    // on the radar right now and is, by our heuristic, in the cluster.
    // Listing them turns the inspector from a bare aggregate into a real
    // hand-off into the Corpus (each row is a one-click pivot).
    const visibleMembers = collectVisibleMembers(n.label);
    if (visibleMembers.length) {
      const countries = new Set();
      const asns = new Set();
      for (const m of visibleMembers) {
        if (m.country) countries.add(m.country);
        if (m.asn) asns.add(m.asn);
      }
      const slice = visibleMembers.slice(0, 12);
      const totalKnown = n.member_actor_count;
      const sliceLabel = (totalKnown && totalKnown > visibleMembers.length)
        ? fmt(visibleMembers.length) + ' of ' + fmt(totalKnown) + ' visible in the sample'
        : fmt(visibleMembers.length) + ' visible in the sample';
      html += '<div class="insp-sub-label">Visible members · ' + sliceLabel + '</div>';
      if (countries.size || asns.size) {
        html += '<div class="insp-camp-agg">' +
          (countries.size ? fmt(countries.size) + ' ' + (countries.size === 1 ? 'country' : 'countries') : '') +
          (countries.size && asns.size ? ' · ' : '') +
          (asns.size ? fmt(asns.size) + ' ' + (asns.size === 1 ? 'ASN' : 'ASNs') : '') +
          '</div>';
      }
      html += '<ul class="insp-list insp-camp-members">';
      for (const m of slice) {
        const flag = flagOf(m.country) || '';
        const meta = [];
        if (m.country) meta.push(esc(m.country));
        if (m.asn) meta.push('AS' + esc(m.asn));
        if (m.observations) meta.push(fmt(m.observations) + ' obs');
        html += '<li><button class="insp-camp-member" type="button" data-ip="' +
          escAttr(m.label) + '">' +
            '<span class="cm-flag">' + flag + '</span>' +
            '<span class="cm-ip">' + esc(m.label) + '</span>' +
            '<span class="cm-meta">' + meta.join(' · ') + '</span>' +
          '</button></li>';
      }
      if (visibleMembers.length > slice.length) {
        html += '<li class="insp-camp-more">+ ' +
          fmt(visibleMembers.length - slice.length) + ' more visible on the radar</li>';
      }
      html += '</ul>';
      // One-click pivot into the full Corpus lookup for a representative
      // member — proves the corpus surface to a visitor who would
      // otherwise just see badge fields.
      const pivotTarget = slice[0].label;
      html += '<div class="insp-pivot">' +
        '<button class="insp-pivot-btn" type="button" data-host="' + escAttr(pivotTarget) + '">' +
          'Inspect ' + esc(pivotTarget) + ' in Corpus →' +
        '</button></div>';
    }

    html += '<div class="attestation">' +
      '<strong>How a campaign is drawn.</strong> Materialized when ≥5 actors share a ' +
      'tool, span ≥3 ASNs, hit ≤5 destination ports, and persist ≥1h. The full ' +
      'member list, payload signatures, and tool fingerprints are the defender tier.' +
      '</div>';
    html += '<div class="attestation">' +
      'Go deeper in <a href="https://chat.tunnelmind.ai" target="_blank" rel="noopener">the chat</a> ' +
      'or <code>curl https://api.tunnelmind.ai/v1/campaign/' + esc(n.label) + '</code>.' +
      '</div>';

    body.innerHTML = html;
    wireBack(body);
    body.querySelectorAll('.insp-camp-member').forEach((b) => {
      b.addEventListener('click', () => {
        const ip = b.dataset.ip;
        const target = nodes.find((x) => x.id === 'ip:' + ip);
        if (target) selectNode(target.id);
        else enterLookup(ip);
      });
    });
    const pb = body.querySelector('.insp-pivot-btn');
    if (pb) pb.addEventListener('click', () => enterLookup(pb.dataset.host));
  }

  // Walk campaignsByMember in reverse — IP → [campaign id, …] — to find
  // every visible actor node that the heuristic linked to this campaign.
  // Cheap: ~50 entries on a typical radar tick. Returned actors are
  // ordered by observation volume so the "head of the cluster" surfaces
  // first in the inspector list.
  function collectVisibleMembers(campaignId) {
    const out = [];
    for (const [ip, ids] of campaignsByMember.entries()) {
      if (!ids.includes(campaignId)) continue;
      const node = nodes.find((x) => x.id === 'ip:' + ip);
      if (node) out.push(node);
    }
    out.sort((a, b) => (b.observations || 0) - (a.observations || 0));
    return out;
  }

  function wireBack(scope) {
    const b = scope.querySelector('.insp-back');
    if (b) b.addEventListener('click', clearSelection);
  }

  // ── Corpus lookup (tabbed intel for an arbitrary host) ────────────
  // Entry point from (a) the persistent lookup form at the top of the
  // panel, and (b) the "Inspect X in Corpus" button on a clicked actor.
  // The body becomes a tab bar + a single tab panel; tabs load lazily
  // through the /api/corpus/* proxies and are cached in tabCache so
  // switching tabs is free after first hit.
  //
  // Each tab is a distinct upstream — RDAP is the registry, DNS is DoH,
  // CT is crt.sh, Tracker is the tunnelmind-data-api surface, Reputation
  // is URLhaus today. A failed tab shows its own error without poisoning
  // the others.
  function enterLookup(rawHost, targetTab = null) {
    const host = normalizeHostLocal(rawHost);
    if (!host) {
      renderLookupError(rawHost, 'That does not look like a domain or IP — try ' +
        'something like <code>example.com</code> or <code>1.2.3.4</code>.');
      return;
    }
    inspectorMode = 'lookup';
    selected = null;
    lookupHost = host;
    setLookupInput(host);
    renderLookup(host, targetTab || defaultTabFor(host));
  }

  function defaultTabFor(host) {
    // For domains the tracker score is the most "instantly useful" tab;
    // for IPs there's no domain-side data, so default to RDAP.
    return isIpLocal(host) ? 'rdap' : 'tracker';
  }

  function renderLookupError(host, msg) {
    ensureInspectorShell();
    const body = inspectorBody();
    if (!body) return;
    body.innerHTML =
      '<button class="insp-back" type="button">← corpus overview</button>' +
      '<div class="insp-lookup-err">' + msg + '</div>';
    wireBack(body);
  }

  function renderLookup(host, activeTab) {
    ensureInspectorShell();
    const body = inspectorBody();
    if (!body) return;
    const ip = isIpLocal(host);
    // Tab availability: domain-only tabs hide when the host is an IP,
    // and vice versa.
    // Order: identity → resolution → network → content → privacy → threat.
    // Most domain-only tabs are clustered after the resolution group, so
    // a casual visitor's left-to-right reading order matches the natural
    // narrative ("who is it, where does it live, what does it serve,
    // how does it treat you, can you trust it").
    const tabs = [
      { id: 'rdap',       label: ip ? 'WHOIS · IP' : 'WHOIS', enabled: true },
      { id: 'dns',        label: 'DNS',                       enabled: !ip },
      { id: 'mail',       label: 'Mail',                      enabled: !ip },
      { id: 'cert',       label: 'Certs',                     enabled: !ip },
      { id: 'subdomains', label: 'Subdomains',                enabled: !ip },
      { id: 'asn',        label: 'BGP',                       enabled: true },
      { id: 'http',       label: 'HTTP',                      enabled: !ip },
      { id: 'stack',      label: 'Stack',                     enabled: !ip },
      { id: 'tracker',    label: 'Tracker',                   enabled: !ip },
      { id: 'crawlers',   label: 'Crawlers',                  enabled: !ip },
      { id: 'agent',      label: 'Agent',                     enabled: !ip },
      { id: 'inject',     label: 'Injection',                 enabled: !ip },
      { id: 'optout',     label: 'Opt-Out',                   enabled: !ip },
      { id: 'reputation', label: 'Reputation',                enabled: true },
    ].filter((t) => t.enabled);

    // Snap to a valid tab if the requested one isn't applicable.
    if (!tabs.some((t) => t.id === activeTab)) activeTab = tabs[0].id;

    let html = '<button class="insp-back" type="button">← corpus overview</button>';
    html += '<h3 class="insp-host">' + esc(host) + '</h3>';
    html += '<div class="insp-host-sub">' +
      (ip ? 'IP address — registry &amp; reputation' :
            'Domain — registry, DNS, certs, trackers, reputation') +
      '</div>';
    html += '<div class="insp-tabs" role="tablist">';
    for (const t of tabs) {
      html += '<button class="insp-tab' + (t.id === activeTab ? ' active' : '') +
        '" type="button" data-tab="' + t.id + '" role="tab">' +
        esc(t.label) + '</button>';
    }
    html += '</div>';
    html += '<div class="insp-tab-panel" id="inspTabPanel">' +
      '<div class="placeholder">Loading…</div></div>';

    body.innerHTML = html;
    wireBack(body);
    body.querySelectorAll('.insp-tab').forEach((b) => {
      b.addEventListener('click', () => {
        if (lookupHost !== host) return;
        body.querySelectorAll('.insp-tab').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        loadTab(host, b.dataset.tab);
      });
    });
    loadTab(host, activeTab);
  }

  // Each tab is a single upstream proxy under /api/corpus/*. The RDAP
  // tab is the one exception — for an IP it reads the existing
  // /api/rdap/[ip] surface (different trim than rdap-domain), and the
  // render path dispatches on `rdap-ip` instead of `rdap`.
  //
  // Reliability shape:
  //   - in-flight dedupe via tabInflight, so back-to-back clicks on the
  //     same tab share one network request;
  //   - one auto-retry with a short backoff for transient upstream
  //     failures (CF Pages cold start, rdap.org / crt.sh blip, upstream
  //     timeout) — eliminates the "Lookup failed → click again → works"
  //     UX from the user;
  //   - success-only caching: an error envelope is never written into
  //     tabCache, so any later tab click naturally re-tries the upstream;
  //   - a Retry button on the failure panel for the case where two
  //     attempts still weren't enough.
  async function loadTab(host, tab) {
    const panel = $('#inspTabPanel');
    if (!panel) return;
    lookupTab = tab; // mark the tab the user is now looking at
    const isIp = isIpLocal(host);
    const renderKey = (tab === 'rdap' && isIp) ? 'rdap-ip' : tab;
    const cacheKey = host + ':' + renderKey;

    // Cache hit — only success payloads ever land here.
    if (tabCache.has(cacheKey)) {
      panel.innerHTML = renderTabHtml(renderKey, tabCache.get(cacheKey), host);
      return;
    }

    panel.innerHTML = '<div class="placeholder">' + esc(tabLoadingLabel(tab)) + '</div>';

    // Dedupe: if this exact (host, tab) is already in-flight, await the
    // existing promise instead of firing a second request.
    let work = tabInflight.get(cacheKey);
    if (!work) {
      const url = (tab === 'rdap' && isIp)
        ? '/api/rdap/' + encodeURIComponent(host)
        : '/api/corpus/' + endpointForTab(tab) + '/' + encodeURIComponent(host);
      work = fetchTabWithRetry(url);
      tabInflight.set(cacheKey, work);
      work.finally(() => tabInflight.delete(cacheKey));
    }

    const data = await work;

    // Bail if the user navigated away mid-fetch (different host, or left
    // lookup mode entirely).
    if (lookupHost !== host || inspectorMode !== 'lookup') return;

    const transient = data && (data.__failed || isTransientUpstreamError(data));

    // A clean payload or a deterministic upstream error (NXDOMAIN, invalid
    // input) is stable — cache it regardless of which tab is active now, so
    // switching back is instant. Transient failures are never cached.
    if (!transient) tabCache.set(cacheKey, data);

    // Only paint if THIS tab is still the one being viewed. Without this a
    // slow earlier tab (e.g. the default RDAP/Tracker auto-load) lands after
    // the user has clicked BGP and clobbers the BGP panel — which reads as
    // "I clicked BGP but there's no BGP data".
    if (lookupTab !== tab) return;

    if (transient) {
      // Render a retry-able failure panel.
      panel.innerHTML = renderTabFailureHtml(tab, data);
      const rb = panel.querySelector('.insp-retry-btn');
      if (rb) rb.addEventListener('click', () => loadTab(host, tab));
      return;
    }
    panel.innerHTML = renderTabHtml(renderKey, data, host);
  }

  // Two attempts total with a short backoff between them. Handles:
  // (a) network-layer throw, (b) non-JSON body (CF edge 502 HTML),
  // (c) JSON envelope whose .error/.status looks transient. A
  // deterministic upstream error (bad input, NXDOMAIN, etc.) is
  // returned on the first attempt so the caller can cache it.
  async function fetchTabWithRetry(url) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(url);
        let data;
        try { data = await r.json(); } catch { data = null; }
        if (!data) {
          // CF edge / proxy returned non-JSON (most often a 502 HTML
          // page). Retry once; on the second miss, surface as transient.
          if (attempt === 0) { await sleep(700); continue; }
          return { __failed: true, error: 'bad_response', status: r.status };
        }
        if (isTransientUpstreamError(data) && attempt === 0) {
          await sleep(700);
          continue;
        }
        return data;
      } catch {
        if (attempt === 0) { await sleep(700); continue; }
        return { __failed: true, error: 'network', status: 0 };
      }
    }
    return { __failed: true, error: 'unknown', status: 0 };
  }

  function isTransientUpstreamError(data) {
    if (!data || !data.error) return false;
    const e = String(data.error).toLowerCase();
    if (e.includes('timeout') || e.includes('upstream') ||
        e.includes('redirect') || e.includes('aborted')) return true;
    const s = data.status;
    return s === 502 || s === 503 || s === 504;
  }

  function renderTabFailureHtml(tab, data) {
    const why = (data && data.error)
      ? prettyErr(data.error)
      : 'Lookup did not come back';
    return '<div class="insp-err">' +
      esc(why) +
      (data && data.status ? ' <span class="v-dim">(' + data.status + ')</span>' : '') +
      '<div class="insp-retry"><button class="insp-retry-btn" type="button">Retry ' +
        esc(tab) + ' →</button></div>' +
      '</div>';
  }

  function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

  // Friendly loading copy per tab — the raw tab id ("asn") read as broken
  // ("Loading asn…"); these say what's actually happening, and the slower
  // upstreams (BGP/RIPEstat, CT logs) name the source so a multi-second
  // wait reads as work-in-progress rather than a hang.
  function tabLoadingLabel(tab) {
    return ({
      asn:        'Querying live routing (RIPEstat)…',
      cert:       'Fetching certificates (CT logs)…',
      subdomains: 'Enumerating subdomains…',
      reputation: 'Computing cross-lens verdict…',
      rdap:       'Looking up the registry…',
      tracker:    'Loading tracker intelligence…',
    })[tab] || 'Loading…';
  }

  function endpointForTab(tab) {
    // Maps tab id → /api/corpus/<this>/<host>. The intel/* family lives
    // behind a single multiplexer Function (functions/api/corpus/intel/
    // [type]/[domain].js) so all six tabs share one proxy.
    return {
      rdap:       'rdap-domain',  // domain RDAP; IP RDAP is /api/rdap above
      dns:        'dns',
      mail:       'mail',
      cert:       'cert',
      subdomains: 'subdomains',
      asn:        'asn',
      http:       'intel/http',
      stack:      'intel/stack',
      tracker:    'tracker',
      crawlers:   'intel/robots',
      agent:      'intel/agent',
      inject:     'intel/inject',
      optout:     'intel/optout',
      // A2 — the Reputation tab is the cross-lens (Scry × Sigil) verdict by
      // default. The new proxy composes /v1/verify/{node} with the rich
      // Scry trim so the panel still shows full Scry detail for domains
      // until the data-api A2.v2 closes its v1 coverage gap.
      reputation: 'cross-lens',
    }[tab];
  }

  function renderTabHtml(tab, data, host) {
    if (data && data.error) {
      return '<div class="insp-err">' + esc(prettyErr(data.error)) +
        (data.status ? ' <span class="v-dim">(' + data.status + ')</span>' : '') +
        '</div>';
    }
    switch (tab) {
      case 'rdap':       return renderRdapDomain(data, host);
      case 'rdap-ip':    return renderRdapIp(data, host);
      case 'dns':        return renderDns(data);
      case 'mail':       return renderMail(data);
      case 'cert':       return renderCert(data);
      case 'subdomains': return renderSubdomains(data);
      case 'asn':        return renderAsn(data, host);
      case 'http':       return renderHttp(data);
      case 'stack':      return renderStack(data);
      case 'tracker':    return renderTracker(data);
      case 'crawlers':   return renderCrawlers(data);
      case 'agent':      return renderAgent(data);
      case 'inject':     return renderInject(data);
      case 'optout':     return renderOptout(data);
      case 'reputation': return renderReputation(data);
      default:           return '<div class="insp-err">Unknown tab.</div>';
    }
  }

  function renderRdapDomain(r, host) {
    if (!r) return emptyTab('No registry record came back.');
    const rows = [
      ['registrar', r.registrar + (r.registrar_iana ? ' <span class="v-dim">IANA ' +
        esc(r.registrar_iana) + '</span>' : '')],
      ['registrant', r.registrant_org],
      ['status', (r.status || []).slice(0, 4).map(esc).join(', ')],
      ['registered', r.registered ? r.registered.slice(0, 10) : null],
      ['updated', r.updated ? r.updated.slice(0, 10) : null],
      ['expires', r.expires ? r.expires.slice(0, 10) : null],
      ['DNSSEC', r.secure_dns ? 'signed' : 'not signed'],
      ['abuse', r.abuse],
    ];
    let html = '<div class="insp-fields">';
    for (const [k, v] of rows) {
      if (v && String(v).length) html += field(k, v);
    }
    html += '</div>';
    if (r.nameservers && r.nameservers.length) {
      html += '<div class="insp-sub-label">Nameservers</div>' +
        '<ul class="insp-list">' +
        r.nameservers.map((ns) => '<li><code>' + esc(ns) + '</code></li>').join('') +
        '</ul>';
    }
    html += sourceLink('rdap.org', `https://rdap.org/domain/${encodeURIComponent(host)}`);
    return html;
  }

  function renderRdapIp(r, host) {
    if (!r) return emptyTab('No registry record came back.');
    const rows = [
      ['netblock', r.name],
      ['range', r.range],
      ['org', r.org],
      ['country', r.country],
      ['registry', r.registry],
      ['registered', r.registered ? r.registered.slice(0, 10) : null],
      ['updated', r.updated ? r.updated.slice(0, 10) : null],
      ['abuse', r.abuse],
    ];
    let html = '<div class="insp-fields">';
    for (const [k, v] of rows) {
      if (v) html += field(k, v);
    }
    html += '</div>';
    html += sourceLink('rdap.org', `https://rdap.org/ip/${encodeURIComponent(host)}`);
    return html;
  }

  function renderDns(d) {
    if (!d || !d.records) return emptyTab('DNS lookup returned no data.');
    let html = '';
    for (const type of ['A', 'AAAA', 'MX', 'NS', 'TXT']) {
      const rec = d.records[type];
      if (!rec) continue;
      if (rec.error) {
        html += '<div class="insp-sub-label">' + type + '</div>' +
          '<div class="insp-err-soft">no records (' + esc(rec.error) + ')</div>';
        continue;
      }
      if (!rec.values || rec.values.length === 0) {
        html += '<div class="insp-sub-label">' + type + '</div>' +
          '<div class="insp-empty">none</div>';
        continue;
      }
      html += '<div class="insp-sub-label">' + type +
        ' <span class="v-dim">' + rec.values.length + '</span></div>' +
        '<ul class="insp-list">' +
        rec.values.slice(0, 8).map((v) =>
          '<li><code>' + esc(v.value) + '</code>' +
          (v.ttl ? ' <span class="v-dim">TTL ' + v.ttl + '</span>' : '') +
          '</li>',
        ).join('') +
        '</ul>';
    }
    html += sourceLink('cloudflare-dns.com', null);
    return html || emptyTab('No DNS records returned.');
  }

  function renderCert(c) {
    if (!c || !Array.isArray(c.certs)) return emptyTab('No certificate transparency entries.');
    if (c.certs.length === 0) {
      return emptyTab('crt.sh has no entries for this domain.');
    }
    let html = '<div class="insp-fields">' +
      field('total seen', '<span class="v-num">' + fmt(c.total) + '</span>') +
      field('showing', '<span class="v-num">' + fmt(c.shown) + '</span> most recent') +
      '</div>';
    html += '<div class="insp-sub-label">Recent issuances</div>';
    html += '<ul class="insp-cert-list">';
    for (const cert of c.certs.slice(0, 10)) {
      const dates = (cert.not_before ? cert.not_before.slice(0, 10) : '?') +
        ' → ' + (cert.not_after ? cert.not_after.slice(0, 10) : '?');
      html += '<li class="insp-cert">' +
        '<div class="insp-cert-cn"><code>' + esc(cert.common_name || '—') + '</code></div>' +
        '<div class="insp-cert-meta"><span>' + esc(cert.issuer || '—') + '</span>' +
        ' <span class="v-dim">' + esc(dates) + '</span></div>' +
        (cert.sans && cert.sans.length
          ? '<div class="insp-cert-sans">SANs: ' +
            cert.sans.map((s) => '<code>' + esc(s) + '</code>').join(' ') + '</div>'
          : '') +
        '</li>';
    }
    html += '</ul>';
    html += sourceLink('crt.sh', `https://crt.sh/?q=${encodeURIComponent(c.domain)}`);
    return html;
  }

  function renderTracker(t) {
    if (!t) return emptyTab('No tracker data returned.');
    if (t.known === false) {
      return '<div class="insp-empty">This domain is not in the tracker corpus. ' +
        'That does not mean it is safe — only that we have not classified it.</div>' +
        sourceLink('data.tunnelmind.ai', null);
    }
    const rows = [
      ['score', t.score == null ? null :
        '<span class="v-num">' + t.score.toFixed(2) + '</span>' +
        ' <span class="v-dim">(lower is less invasive)</span>'],
      ['entity', t.entity],
      ['categories', (t.categories || []).join(', ')],
      ['prevalence', t.prevalence == null ? null :
        '<span class="v-num">' + (t.prevalence * 100).toFixed(1) + '%</span> of pages'],
      ['cookies set', t.cookies == null ? null : fmt(t.cookies)],
      ['fingerprints', t.fingerprinting == null ? null : (t.fingerprinting ? 'yes' : 'no')],
      ['first seen', t.first_seen ? t.first_seen.slice(0, 10) : null],
      ['last seen', t.last_seen ? t.last_seen.slice(0, 10) : null],
    ];
    let html = '<div class="insp-fields">';
    for (const [k, v] of rows) {
      if (v) html += field(k, v);
    }
    html += '</div>';
    if (t.entity_slug) {
      html += '<a class="insp-deep" href="https://data.tunnelmind.ai/v1/entities/' +
        encodeURIComponent(t.entity_slug) + '" target="_blank" rel="noopener">' +
        'Walk the corporate ownership →</a>';
    }
    html += sourceLink('data.tunnelmind.ai', null);
    return html;
  }

  // A2 — Reputation tab renders the cross-lens (Scry × Sigil) verdict by
  // default. The proxy at /api/corpus/cross-lens/<node> composes the
  // /v1/verify/{node} response with the rich Scry trim that the old
  // /api/corpus/reputation/ proxy returned, so no Scry-side detail is lost
  // while the data-api A2.v2 work closes its v1 cross-lens coverage gap.
  //
  // Render order (top to bottom):
  //   1. Fused verdict pill — verdict + trust_score + confidence
  //   2. Signals chip row (per-lens evidence)
  //   3. Recommendations list
  //   4. "Sigil lens" detail (in_supply_graph, role, entity)
  //   5. "Scry lens" detail (rich trim — actor class, enrichment, URL-hosted)
  //   6. Single source-link (data.tunnelmind.ai is the cross-lens origin)
  function renderReputation(rep) {
    if (!rep || typeof rep !== 'object') return emptyTab('Cross-lens lookup returned no data.');

    let html = '';
    html += renderCrossLensVerdict(rep.cross_lens);
    html += renderSigilLens(rep.sigil);
    html += renderScryLens(rep.scry_rich, rep.scry);
    html += sourceLink('data.tunnelmind.ai', null);
    return html;
  }

  function renderCrossLensVerdict(cl) {
    if (!cl) {
      return '<div class="insp-sub-label">Cross-lens verdict <span class="v-dim">Scry × Sigil</span></div>' +
        '<div class="insp-err-soft">verdict unavailable</div>';
    }
    const verdict = cl.verdict || 'unknown';
    const cls = verdict === 'pass' ? 'sec-pass'
              : verdict === 'fail' ? 'sec-fail'
              : 'sec-warn';
    let html = '<div class="insp-sub-label">Cross-lens verdict <span class="v-dim">Scry × Sigil</span></div>';
    html += '<div class="insp-tag-row">' +
      '<span class="sec-tag ' + cls + '">' + esc(verdict.toUpperCase()) + '</span>' +
      '</div>';
    html += '<div class="insp-fields">' +
      (cl.trust_score != null
        ? field('trust score', '<span class="v-num">' + esc(cl.trust_score.toFixed(2)) + '</span>')
        : '') +
      (typeof cl.confidence === 'number'
        ? field('confidence',  '<span class="v-num">' + esc(cl.confidence.toFixed(2)) + '</span>' +
            (cl.confidence < 0.6 ? ' <span class="v-dim">(single-lens — degraded)</span>' : ''))
        : '') +
      '</div>';
    if (Array.isArray(cl.signals) && cl.signals.length) {
      html += '<div class="insp-sub-label">Signals</div>' +
        '<div class="insp-tag-row">' +
        cl.signals.map((s) => '<span class="insp-tag">' + esc(s) + '</span>').join('') +
        '</div>';
    }
    if (Array.isArray(cl.recommendations) && cl.recommendations.length) {
      html += '<div class="insp-sub-label">Recommendations</div>' +
        '<ul class="insp-list insp-list-tight">' +
        cl.recommendations.map((r) => '<li>' + esc(r) + '</li>').join('') +
        '</ul>';
    }
    // OAI Phase 4 — surface the verdict issuer's permanent identifier so a
    // viewer (or an agent reading the rendered JSON) can resolve who issued
    // this cross-lens verdict via tunnelmind.ai/id/{OAI} without an out-of-
    // band lookup. The standard becomes visible at the highest-trafficked
    // point in the UI.
    if (typeof cl.issued_by === 'string' && /^OAI-/.test(cl.issued_by)) {
      html += '<div class="insp-sub-label">Issued by</div>' +
        '<div class="insp-tag-row">' + renderOaiBadge(cl.issued_by) + '</div>';
    }
    return html;
  }

  // Small clickable chip rendering an OAI identifier. The resolver at
  // tunnelmind.ai/id/{OAI} accepts both canonical (OAI-YYYY-NNNNNNN) and
  // sensor (OAI-SENSOR-{cc}-{seq}) forms — caller pre-validates format.
  function renderOaiBadge(oai) {
    const href = 'https://tunnelmind.ai/id/' + encodeURIComponent(oai);
    return '<a class="insp-tag insp-tag-link" href="' + href +
      '" target="_blank" rel="noopener" title="Resolve ' + esc(oai) +
      ' via the OAI registry">' + esc(oai) + '</a>';
  }

  function renderSigilLens(sig) {
    let html = '<div class="insp-sub-label">Sigil lens <span class="v-dim">supply graph</span></div>';
    if (!sig || sig.available === false) {
      html += '<div class="insp-empty">' +
        esc(sig?.reason || 'Sigil lens unavailable.') +
        '</div>';
      return html;
    }
    if (!sig.in_supply_graph) {
      html += '<div class="insp-empty">' +
        esc(sig.reason || 'Not present in the Sigil supply graph.') +
        '</div>';
      return html;
    }
    const roles = sig.roles || {};
    const roleChips = Object.entries(roles)
      .filter(([, v]) => v)
      .map(([k]) => '<span class="insp-tag">' + esc(k) + '</span>');
    if (roleChips.length) {
      html += '<div class="insp-tag-row">' + roleChips.join('') + '</div>';
    }
    if (sig.entity) {
      html += '<div class="insp-fields">' +
        field('entity', esc(sig.entity.name || sig.entity.slug || '—')) +
        (sig.entity.slug ? field('slug', '<code>' + esc(sig.entity.slug) + '</code>') : '') +
        '</div>';
      if (Array.isArray(sig.entity.sources) && sig.entity.sources.length) {
        html += '<div class="insp-tag-row">' +
          sig.entity.sources.map((s) => '<span class="insp-tag">' + esc(s) + '</span>').join('') +
          '</div>';
      }
    }
    if (sig.sell_side_presence) {
      const p = sig.sell_side_presence;
      html += '<div class="insp-fields">' +
        field('SSPs observed',       '<span class="v-num">' + fmt(p.ssps_observed) + '</span>') +
        field('publishers observed', '<span class="v-num">' + fmt(p.publishers_observed) + '</span>') +
        (p.owns_any_seat != null ? field('owns any seat', p.owns_any_seat ? 'yes' : 'no') : '') +
        '</div>';
    }
    if (sig.buy_side_presence?.dsps_observed_via_buys_through != null) {
      html += '<div class="insp-fields">' +
        field('observed buying', sig.buy_side_presence.dsps_observed_via_buys_through ? 'yes' : 'no') +
        '</div>';
    }
    return html;
  }

  function renderScryLens(rich, lite) {
    let html = '<div class="insp-sub-label">Scry lens <span class="v-dim">attacker intelligence</span></div>';
    const s = rich && !rich.error ? rich : null;

    if (!s) {
      if (lite && lite.available === false) {
        html += '<div class="insp-empty">' + esc(lite.reason || 'Scry lens unavailable.') + '</div>';
      } else {
        html += '<div class="insp-err-soft">lookup failed</div>';
      }
      return html;
    }
    if (!s.listed) {
      let note;
      if (s.kind === 'domain' && s.subdomain_hits > 0) {
        note = 'Apex not flagged, but ' + fmt(s.subdomain_hits) + ' subdomain hit' +
          (s.subdomain_hits === 1 ? '' : 's') + '.';
      } else if (s.kind === 'domain' && s.url_hosted_count > 0) {
        note = 'Domain itself is not flagged, but it hosts ' +
          fmt(s.url_hosted_count) + ' URL' +
          (s.url_hosted_count === 1 ? '' : 's') +
          ' that are. Typical for user-generated-content sites — treat the host as safe to read; treat arbitrary paths with caution.';
      } else {
        note = 'Not listed in any redistributable feed.';
      }
      html += '<div class="insp-empty">' + esc(note) + '</div>';
    } else {
      html += '<div class="insp-fields">' +
        field('sources flagging', '<span class="v-num">' + fmt(s.enrichment_count) + '</span>') +
        (s.enrichment_promoted
          ? field('≥2-source agreement', '<span class="v-num">' + fmt(s.enrichment_promoted) + '</span>')
          : '') +
        (s.kind === 'domain' && s.subdomain_hits
          ? field('subdomain hits', '<span class="v-num">' + fmt(s.subdomain_hits) + '</span>')
          : '') +
        (s.first_seen_ms ? field('first seen', new Date(s.first_seen_ms).toISOString().slice(0, 10)) : '') +
        (s.last_seen_ms  ? field('last seen',  new Date(s.last_seen_ms).toISOString().slice(0, 10))  : '') +
        '</div>';
      if (s.sources && s.sources.length) {
        html += '<div class="insp-tag-row">' +
          s.sources.map((src) => '<span class="insp-tag">' + esc(src) + '</span>').join('') +
          '</div>';
      }
    }

    if (s.kind === 'domain') {
      if (s.listed && s.url_hosted_count > 0) {
        html += '<div class="insp-sub-label">URL-hosted hits <span class="v-dim">not direct indicators</span></div>' +
          '<div class="insp-fields">' +
          field('URLs flagged on this host', '<span class="v-num">' + fmt(s.url_hosted_count) + '</span>') +
          '</div>';
      }
      if (s.threat_types && s.threat_types.length) {
        html += '<div class="insp-sub-label">Threat types</div>' +
          '<div class="insp-tag-row">' +
          s.threat_types.map((t) => '<span class="insp-tag">' + esc(t) + '</span>').join('') +
          '</div>';
      }
      if (s.tags && s.tags.length) {
        html += '<div class="insp-sub-label">Tags</div>' +
          '<div class="insp-tag-row">' +
          s.tags.map((t) => '<span class="insp-tag">' + esc(t) + '</span>').join('') +
          '</div>';
      }
    }

    if (s.kind === 'ip' && s.actor_class_label) {
      html += '<div class="insp-sub-label">Actor class</div>' +
        '<div class="insp-fields">' +
        field('class', esc(s.actor_class_label)) +
        (s.actor_class_trust ? field('trust', esc(s.actor_class_trust)) : '') +
        '</div>';
    }
    return html;
  }

  // ── second-wave tabs (ported from netprobe.html 2026-05-19) ──────
  // Mail / Subdomains / ASN / HTTP / Stack / Crawlers / Agent /
  // Injection / Opt-Out. Each render fn is small and renders only what
  // the upstream actually returned — missing fields just don't print.

  function renderMail(m) {
    if (!m) return emptyTab('Mail lookup returned no data.');
    let html = '<div class="insp-sub-label">Posture</div>';
    html += '<div class="insp-tag-row">' +
      mailBadge('SPF', m.spf && m.spf.present, m.spf && m.spf.policy) +
      mailBadge('DMARC', m.dmarc && m.dmarc.present, m.dmarc && m.dmarc.policy) +
      mailBadge('DKIM', m.dkim && m.dkim.present,
        m.dkim && m.dkim.selectors_found && m.dkim.selectors_found[0]) +
      '</div>';
    if (m.mx && m.mx.length) {
      html += '<div class="insp-sub-label">MX</div><ul class="insp-list">' +
        m.mx.map((r) => '<li><code>' + esc(r.preference + ' ' + r.host) + '</code></li>').join('') +
        '</ul>';
    } else {
      html += '<div class="insp-sub-label">MX</div><div class="insp-empty">No MX records.</div>';
    }
    if (m.spf && m.spf.record) {
      html += '<div class="insp-sub-label">SPF record</div>' +
        '<div class="insp-mono-wrap"><code>' + esc(m.spf.record) + '</code></div>';
    }
    if (m.dmarc && m.dmarc.record) {
      html += '<div class="insp-sub-label">DMARC record</div>' +
        '<div class="insp-mono-wrap"><code>' + esc(m.dmarc.record) + '</code></div>';
    }
    if (m.dkim && m.dkim.selectors_found && m.dkim.selectors_found.length) {
      html += '<div class="insp-sub-label">DKIM selectors found</div>' +
        '<div class="insp-tag-row">' +
        m.dkim.selectors_found.map((s) => '<span class="insp-tag">' + esc(s) + '</span>').join('') +
        '</div>';
    }
    html += sourceLink('cloudflare-dns.com', null);
    return html;
  }

  function mailBadge(label, ok, detail) {
    const cls = ok ? 'sec-pass' : 'sec-fail';
    const txt = label + ' · ' + (ok ? (detail || 'present') : 'missing');
    return '<span class="sec-tag ' + cls + '">' + esc(txt) + '</span>';
  }

  function renderSubdomains(s) {
    if (!s || !Array.isArray(s.subdomains)) return emptyTab('Subdomain lookup returned no data.');
    if (s.subdomains.length === 0) {
      return emptyTab('crt.sh has no subdomain entries for this apex.') +
        sourceLink('crt.sh', null);
    }
    let html = '<div class="insp-fields">' +
      field('total seen', '<span class="v-num">' + fmt(s.total) + '</span>') +
      field('showing', '<span class="v-num">' + fmt(s.shown) + '</span>') +
      '</div>';
    html += '<div class="insp-sub-label">Names</div>';
    html += '<ul class="insp-list insp-list-tight">' +
      s.subdomains.map((n) => '<li><code>' + esc(n) + '</code></li>').join('') +
      '</ul>';
    html += sourceLink('crt.sh', `https://crt.sh/?q=${encodeURIComponent('%.' + s.domain)}`);
    return html;
  }

  // BGP tab — ASN, the announced prefix, RIR, and abuse contact for each
  // address. `announced` answers "is this prefix live in the global
  // routing table right now" — the one fact that's genuinely BGP rather
  // than registry. Order leads with the routing facts, then contacts.
  function renderAsn(a, host) {
    if (!a || !Array.isArray(a.addresses)) return emptyTab('BGP lookup returned no data.');
    if (a.addresses.length === 0) {
      return emptyTab(a.note || 'No addresses resolved.') +
        sourceLink('RIPEstat', `https://stat.ripe.net/${encodeURIComponent(host)}`);
    }
    let html = '';
    for (const addr of a.addresses) {
      html += '<div class="insp-sub-label"><code>' + esc(addr.ip) + '</code></div>';
      if (addr.error) {
        html += '<div class="insp-err-soft">lookup failed</div>';
        continue;
      }
      const announced = addr.announced === true
        ? '<span class="v-ok">yes — globally routed</span>'
        : addr.announced === false
          ? '<span class="v-bad">no — not in the routing table</span>'
          : null;
      const rows = [
        ['ASN', addr.asn != null ? 'AS' + esc(addr.asn) : null],
        ['holder', addr.org ? esc(addr.org) : null],
        ['prefix', addr.prefix ? '<code>' + esc(addr.prefix) + '</code>' : null],
        ['announced', announced],
        ['country', addr.country ? esc(addr.country) : null],
        ['RIR', addr.rir ? esc(addr.rir) : null],
        ['abuse', (addr.abuse || []).map(esc).join(', ') || null],
      ];
      html += '<div class="insp-fields">';
      for (const [k, v] of rows) {
        if (v) html += field(k, v);
      }
      html += '</div>';
    }
    html += sourceLink('RIPEstat', `https://stat.ripe.net/${encodeURIComponent(host)}`);
    return html;
  }

  function renderHttp(h) {
    if (!h) return emptyTab('HTTP probe returned no data.');
    if (h.error) return emptyTab('HTTP fetch failed: ' + esc(h.error));
    let html = '<div class="insp-fields">' +
      field('URL', '<code>' + esc(h.url) + '</code>') +
      field('status', '<span class="v-num">' + esc(String(h.status)) + '</span>') +
      '</div>';
    // Security-header badges — each present is good, each missing is bad.
    if (h.security) {
      const SEC = [
        ['HSTS', 'hsts'], ['CSP', 'csp'], ['XFO', 'xfo'],
        ['XCTO', 'xcto'], ['Ref-Policy', 'rp'],
      ];
      html += '<div class="insp-sub-label">Security headers</div>' +
        '<div class="insp-tag-row">' +
        SEC.map(([label, key]) => mailBadge(label, !!h.security[key], h.security[key] ? 'set' : 'missing'))
          .join('') + '</div>';
    }
    if (h.redirect_chain && h.redirect_chain.length > 1) {
      html += '<div class="insp-sub-label">Redirect chain</div><ol class="insp-list">' +
        h.redirect_chain.map((r) =>
          '<li><code>' + esc(r.url) + '</code>' +
          ' <span class="v-dim">' + esc(String(r.status)) + '</span></li>').join('') +
        '</ol>';
    }
    if (h.headers && Object.keys(h.headers).length) {
      html += '<div class="insp-sub-label">Headers</div><ul class="insp-list">' +
        Object.entries(h.headers).slice(0, 12).map(([k, v]) =>
          '<li><span class="v-dim">' + esc(k) + ':</span> <code>' + esc(String(v)) + '</code></li>')
          .join('') + '</ul>';
    }
    html += sourceLink('data.tunnelmind.ai', null);
    return html;
  }

  function renderStack(s) {
    if (!s) return emptyTab('Stack probe returned no data.');
    if (s.error) return emptyTab('Stack fetch failed: ' + esc(s.error));
    if (!s.stack || s.stack.length === 0) {
      return emptyTab('No stack signals identified — nothing distinctive in headers or markup.') +
        sourceLink('data.tunnelmind.ai', null);
    }
    let html = '';
    const grouped = s.grouped && Object.keys(s.grouped).length
      ? s.grouped
      : { 'Detected': s.stack.map((t) => t.name) };
    for (const [cat, items] of Object.entries(grouped)) {
      html += '<div class="insp-sub-label">' + esc(cat) + '</div>' +
        '<div class="insp-tag-row">' +
        items.map((n) => '<span class="insp-tag">' + esc(n) + '</span>').join('') +
        '</div>';
    }
    html += sourceLink('data.tunnelmind.ai', null);
    return html;
  }

  function renderCrawlers(c) {
    if (!c) return emptyTab('robots.txt probe returned no data.');
    if (c.status === 404 || c.status === 0) {
      return emptyTab('No robots.txt found at this domain.') +
        sourceLink('data.tunnelmind.ai', null);
    }
    let html = '<div class="insp-fields">' +
      field('status', '<span class="v-num">' + esc(String(c.status)) + '</span>') +
      field('size', '<span class="v-num">' + fmt(c.size_bytes) + '</span> bytes') +
      '</div>';
    if (c.ai_summary) {
      html += '<div class="insp-sub-label">AI policy</div>' +
        '<div class="insp-prose">' + esc(c.ai_summary) + '</div>';
    }
    if (Array.isArray(c.agents) && c.agents.length) {
      html += '<div class="insp-sub-label">Per-agent rules</div>' +
        '<ul class="insp-list">' +
        c.agents.slice(0, 20).map((a) =>
          '<li><code>' + esc(a.agent) + '</code> ' +
          '<span class="v-dim">' + esc(a.access || '') + '</span>' +
          (a.paths && a.paths.length ? ' <span class="v-dim">' + a.paths.length + ' rule(s)</span>' : '') +
          '</li>').join('') +
        '</ul>';
    }
    html += sourceLink('data.tunnelmind.ai', null);
    return html;
  }

  function renderAgent(a) {
    if (!a) return emptyTab('Agent-surface probe returned no data.');
    const signals = a.signals && typeof a.signals === 'object' ? a.signals : {};
    const entries = Object.entries(signals);
    if (entries.length === 0) {
      return emptyTab('No agent-facing surface signals returned.') +
        sourceLink('data.tunnelmind.ai', null);
    }
    let html = '<div class="insp-prose">Standards a site exposes for ' +
      'AI agents — well-known files like <code>llms.txt</code>, ' +
      '<code>ai.txt</code>, MCP manifests, OpenAPI specs. Found means ' +
      'the file resolved with a 200.</div>';
    html += '<div class="insp-tag-row">' +
      entries.map(([k, v]) => {
        const ok = v && v.found;
        return '<span class="sec-tag ' + (ok ? 'sec-pass' : 'sec-fail') + '">' +
          esc(k) + ' · ' + (ok ? 'found' : 'missing') + '</span>';
      }).join('') + '</div>';
    html += sourceLink('data.tunnelmind.ai', null);
    return html;
  }

  function renderInject(j) {
    if (!j) return emptyTab('Injection probe returned no data.');
    if (j.fetch_error) return emptyTab('Probe could not load the page: ' + esc(j.fetch_error));
    const score = typeof j.risk_score === 'number' ? j.risk_score : 0;
    const scoreClass = score >= 7 ? 'sec-fail' : score >= 3 ? 'sec-warn' : 'sec-pass';
    let html = '<div class="insp-fields">' +
      field('risk score', '<span class="sec-tag ' + scoreClass + '">' + score + '</span>') +
      field('page size', fmt(j.page_size) + ' bytes') +
      '</div>';
    if (j.summary) {
      html += '<div class="insp-sub-label">Summary</div>' +
        '<div class="insp-prose">' + esc(j.summary) + '</div>';
    }
    if (Array.isArray(j.findings) && j.findings.length) {
      html += '<div class="insp-sub-label">Findings</div><ul class="insp-list">' +
        j.findings.slice(0, 20).map((f) =>
          '<li>' + (typeof f === 'string' ? esc(f) :
            esc(f.type || 'finding') + (f.detail ? ' — <span class="v-dim">' + esc(f.detail) + '</span>' : '')) +
          '</li>').join('') +
        '</ul>';
    }
    html += sourceLink('data.tunnelmind.ai', null);
    return html;
  }

  function renderOptout(o) {
    if (!o) return emptyTab('Opt-out probe returned no data.');
    const fields = [
      ['TDM-Reservation header', o.tdm_reservation_header],
      ['TDM policy URL',         !!o.tdm_policy_url],
      ['X-Robots-Tag: noai',     o.x_robots_noai],
      ['<meta noai>',            o.meta_noai],
      ['<meta TDM-Reservation>', o.meta_tdm_reservation],
      ['data-ai="no"',           o.data_ai_attr],
      ['License: ai-restrictive', o.license_ai_restrictive],
      ['robots.txt noai',        o.robots_noai],
    ];
    let html = '<div class="insp-prose">' + esc(o.assessment || '') + '</div>';
    html += '<div class="insp-sub-label">Signals checked</div>';
    html += '<div class="insp-tag-row">' +
      fields.map(([label, ok]) =>
        '<span class="sec-tag ' + (ok ? 'sec-pass' : 'sec-fail') + '">' +
        esc(label) + ' · ' + (ok ? 'yes' : 'no') + '</span>').join('') +
      '</div>';
    if (o.tdm_policy_url) {
      html += '<div class="insp-sub-label">TDM policy</div>' +
        '<a class="insp-deep" href="' + escAttr(o.tdm_policy_url) + '" target="_blank" rel="noopener">' +
        esc(o.tdm_policy_url) + ' ↗</a>';
    }
    if (o.license_url) {
      html += '<div class="insp-sub-label">License</div>' +
        '<a class="insp-deep" href="' + escAttr(o.license_url) + '" target="_blank" rel="noopener">' +
        esc(o.license_url) + ' ↗</a>';
    }
    html += sourceLink('data.tunnelmind.ai', null);
    return html;
  }

  function emptyTab(msg) { return '<div class="insp-empty">' + esc(msg) + '</div>'; }

  function sourceLink(name, href) {
    const inner = href
      ? '<a href="' + escAttr(href) + '" target="_blank" rel="noopener">' + esc(name) + '</a>'
      : esc(name);
    return '<div class="insp-source">source: ' + inner + '</div>';
  }

  function prettyErr(code) {
    return ({
      invalid_domain: 'That domain looks malformed.',
      invalid_name: 'That name looks malformed.',
      invalid_host: 'That host looks malformed.',
      invalid_ip: 'That IP address looks malformed.',
      invalid_intel_type: 'Unknown intel category.',
      rdap_unavailable: 'The RDAP relay is unavailable right now.',
      rdap_error: 'RDAP lookup failed.',
      crtsh_unavailable: 'crt.sh is unavailable right now.',
      crtsh_bad_payload: 'crt.sh returned an unexpected payload.',
      crtsh_error: 'crt.sh lookup failed.',
      subdomains_error: 'Subdomain lookup failed.',
      tracker_unavailable: 'The tracker corpus is unavailable right now.',
      tracker_error: 'Tracker lookup failed.',
      intel_unavailable: 'The intel surface is unavailable right now.',
      intel_error: 'Intel lookup failed.',
      mail_error: 'Mail-record lookup failed.',
      asn_error: 'ASN lookup failed.',
      upstream_timeout: 'Upstream took too long to respond.',
      too_many_redirects: 'Upstream redirected too many times.',
    })[code] || 'Lookup failed.';
  }

  // Local validators mirror functions/api/corpus/_lib.js so the client
  // can reject obvious garbage without a round-trip. Intentionally
  // duplicated rather than imported — initRadar.js is loaded into the
  // browser, _lib.js runs at the edge.
  const _DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
  const _IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
  const _IPV6_RE = /^[0-9a-f:]+$/;
  function isIpLocal(s) {
    if (typeof s !== 'string') return false;
    const v = s.trim().toLowerCase();
    if (_IPV4_RE.test(v)) return true;
    return v.includes(':') && _IPV6_RE.test(v) && v.length <= 39;
  }
  function normalizeHostLocal(raw) {
    if (typeof raw !== 'string') return null;
    const s = raw.trim().toLowerCase().replace(/\.$/, '').replace(/^https?:\/\//, '').split('/')[0];
    if (isIpLocal(s)) return s;
    return _DOMAIN_RE.test(s) ? s : null;
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
  ensureInspectorShell(); // lookup form + body div, wired once
  renderOverview();     // panel shows "loading" until the first snapshot
  renderTicker();       // ticker shows its idle state
  refresh();            // instant first paint
  startLiveUpdates();   // live updates over SSE (falls back to polling)
  startGraphLoop();

  // Deep-link: /#/?inspect=<host> lands directly in the Corpus tab view.
  // Runs after renderOverview so a bad host falls back cleanly to it.
  if (initialLookup) enterLookup(initialLookup);

  const onResize = () => { if (graph3d) graph3d.width(W()).height(H()); };
  window.addEventListener('resize', onResize);

  return function cleanup() {
    destroyed = true;
    stopGraphLoop();
    if (graph3d) { graph3d._destructor(); graph3d = null; }
    if (es) es.close();
    if (intervalId) clearInterval(intervalId);
    window.removeEventListener('resize', onResize);
  };
}

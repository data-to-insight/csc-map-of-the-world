---
title: Network, full screen
hide:
  - navigation
  - toc
  - footer
---

<style>
  .md-grid { max-width: initial; }
  .md-main__inner { margin: 0; }
  #network-app { width: 100%; min-height: 60vh; }
</style>

<div id="network-app"></div>

<!-- Note, can tune visible graph directly in browser on url via :
E.g. Wider neighborhood, more context
...?k=3&pad=150
or
E.g. Same hood, zoom out slightly
...?k=2&pad=200 
-->

<script src="https://unpkg.com/cytoscape@3.28.0/dist/cytoscape.min.js"></script>
<script>
(function () {
  function init() {
    const container = document.getElementById('network-app');
    if (!container) return;

    // tunables from URL, for example ?k=3&pad=120&color=degree
    const params   = new URLSearchParams(location.search);
    const FOCUS_K  = Number(params.get('k'))    || 5;
    const FIT_PAD  = Number(params.get('pad'))  || 200;
    const COLOR_MODE = (params.get('color') || 'type').toLowerCase(); // 'type' or 'degree'

    function fitContainer() {
      const header = document.querySelector('.md-header');
      const h = header ? header.offsetHeight : 0;
      container.style.height = `calc(100vh - ${h}px)`;
      container.style.width  = '100%';
    }
    fitContainer();

    let userHasInteracted = false;

    window.addEventListener('resize', () => {
      fitContainer();
      if (window.cy) {
        window.cy.resize();
        if (!userHasInteracted) firstFit(window.cy, { havePreset: window.cy.hasPresetPositions });
      }
    });

    const graphUrl  = new URL('../data/graph_data.lite.json', window.location.href).toString();
    const degreeUrl = new URL('../data/degree.json',          window.location.href).toString();

    function computeDegreeFromEdges(edges) {
      const adj = Object.create(null);
      for (const e of edges) {
        if (!Array.isArray(e) || e.length < 2) continue;
        const [s, t] = e;
        (adj[s] ||= new Set()).add(t);
        (adj[t] ||= new Set()).add(s);
      }
      const out = {};
      for (const k of Object.keys(adj)) out[k] = adj[k].size;
      return out;
    }

    // helpers
    function coreNodes(cy) {
      return cy.nodes().filter(n => n.connectedEdges().length > 0);
    }
    function percentile(sorted, q) {
      if (!sorted.length) return 0;
      const pos = (sorted.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
      } else {
        return sorted[base];
      }
    }
    function clipByPercentile(coll, qLow = 0.02, qHigh = 0.98) {
      if (!coll || coll.length === 0) return coll;
      const xs = [], ys = [];
      coll.forEach(n => { const p = n.position(); xs.push(p.x); ys.push(p.y); });
      xs.sort((a,b) => a - b);
      ys.sort((a,b) => a - b);
      const x1 = percentile(xs, qLow), x2 = percentile(xs, qHigh);
      const y1 = percentile(ys, qLow), y2 = percentile(ys, qHigh);
      return coll.filter(n => {
        const p = n.position();
        return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
      });
    }

    // focus selection
    function findFocusNode(cy) {
      const candidates = ['data_to_insight', 'Data to insight'];
      for (const key of candidates) {
        let n = cy.$id(key);
        if (n && n.length) return n;
        n = cy.nodes().filter(x => (x.data('s') || '').toLowerCase() === key.toLowerCase());
        if (n && n.length) return n[0];
        n = cy.nodes().filter(x => (x.data('label') || '').toLowerCase() === key.toLowerCase());
        if (n && n.length) return n[0];
      }
      return null;
    }
    function neighborhoodKHops(node, k = 2) {
      let coll = node;
      for (let i = 0; i < k; i++) {
        coll = coll.union(coll.neighborhood().nodes());
      }
      return coll;
    }

    // initial fit, uses FOCUS_K and FIT_PAD
    function firstFit(cy, { havePreset }) {
      const focus = findFocusNode(cy);
      if (focus) {
        const hood = neighborhoodKHops(focus, FOCUS_K);
        cy.resize();
        cy.fit(hood, FIT_PAD);
        return;
      }
      const core = coreNodes(cy);
      const target = havePreset ? clipByPercentile(core, 0.02, 0.98) : core;
      cy.resize();
      cy.fit(target.length ? target : cy.nodes(), 8);
    }

    // apply colouring either by node type, or by degree via a gradient
    function applyColoring(cy, mode, degrees) {
      if (mode === 'degree') {
        const vals = Object.values(degrees);
        const maxDeg = Math.max(1, ...vals);
        cy.style().fromJson([
          { selector: 'node', style: { 'background-color': `mapData(deg, 0, ${maxDeg}, #e0f3ff, #08519c)` } }
        ]).update();
        return;
      }
      // type colouring, adjust palette to match explorer.js if needed
      const typePalette = {
        organization: '#4c78a8',
        org:          '#4c78a8',
        service:      '#f58518',
        dataset:      '#54a24b',
        tool:         '#e45756',
        event:        '#72b7b2',
        plan:         '#ff9da6',
        person:       '#b279a2',
        rule:         '#eeca3b',
        default:      '#b8b8b8'
      };
      cy.style().fromJson([
        { selector: 'node', style: { 'background-color': typePalette.default } },
        { selector: 'node[t = "organization"], node[t = "org"]', style: { 'background-color': typePalette.organization } },
        { selector: 'node[t = "service"]',   style: { 'background-color': typePalette.service } },
        { selector: 'node[t = "dataset"]',   style: { 'background-color': typePalette.dataset } },
        { selector: 'node[t = "tool"]',      style: { 'background-color': typePalette.tool } },
        { selector: 'node[t = "event"]',     style: { 'background-color': typePalette.event } },
        { selector: 'node[t = "plan"]',      style: { 'background-color': typePalette.plan } },
        { selector: 'node[t = "person"]',    style: { 'background-color': typePalette.person } },
        { selector: 'node[t = "rule"]',      style: { 'background-color': typePalette.rule } }
      ]).update();
    }

    // load assets
    fetch(graphUrl).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${graphUrl}`);
      return r.json();
    })
    .then(async ({ nodes, edges }) => {
      let degrees = {};
      try {
        const r = await fetch(degreeUrl);
        if (!r.ok) throw new Error();
        degrees = await r.json();
      } catch {
        degrees = computeDegreeFromEdges(edges);
      }

      const havePreset = nodes.some(n => n.x !== undefined && n.y !== undefined);

      const elements = [
        ...nodes.map(n => ({
          data: { id: n.id, label: n.l, t: n.t, s: n.s },
          position: (n.x !== undefined && n.y !== undefined) ? { x: n.x, y: n.y } : undefined
        })),
        ...edges.map(e => ({ data: { source: e[0], target: e[1], rel: e[2] } }))
      ];

      const cy = window.cy = cytoscape({
        container,
        elements,
        pixelRatio: 1,
        textureOnViewport: true,
        wheelSensitivity: 0.2,
        hideEdgesOnViewport: true,
        motionBlur: true,
        layout: havePreset
          ? { name: 'preset', fit: false }
          : { name: 'cose', fit: true, animate: false, randomize: true, nodeRepulsion: 8000, idealEdgeLength: 50, gravity: 30, padding: 8 }
      });
      cy.hasPresetPositions = havePreset;

      // base style
      cy.style().fromJson([
        { selector: 'node', style: { 'background-color': '#777', 'width': 8, 'height': 8, 'label': '' } },
        { selector: 'edge', style: { 'line-color': '#aaa', 'width': 1 } }
      ]).update();

      // degree sizing and add deg to data so we can color by it
      const sizeFor = id => {
        const d = degrees[id] ?? 0;
        return Math.max(6, Math.min(24, 4 + Math.sqrt(d) * 2));
      };
      cy.batch(() => {
        cy.nodes().forEach(n => {
          const id = n.id();
          const w  = sizeFor(id);
          n.data('deg', degrees[id] ?? 0);
          n.style('width',  w);
          n.style('height', w);
        });
      });

      // apply chosen colouring
      applyColoring(cy, COLOR_MODE, degrees);

      // initial fit strategy
      firstFit(cy, { havePreset });

      // refit after render and one tick later, unless user interacts
      cy.once('render', () => { if (!userHasInteracted) firstFit(cy, { havePreset }); });
      requestAnimationFrame(() => { if (!userHasInteracted) firstFit(cy, { havePreset }); });

      // labels on zoom, stop auto fits on interaction
      cy.on('zoom', () => {
        userHasInteracted = true;
        const show = cy.zoom() > 1.2;
        cy.batch(() => cy.nodes().forEach(n => n.style('label', show ? n.data('label') : '')));
      });
      cy.on('pan zoom drag free', () => { userHasInteracted = true; });
    })
    .catch(err => {
      console.error('Failed to load graph assets', err);
      container.innerHTML = `<p style="padding:1rem">Could not load graph assets, see console. Tried:<br>
        <code>${graphUrl}</code><br><code>${degreeUrl}</code></p>`;
    });
  }

  if (window.document$) {
    document$.subscribe(() => init());
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>

/*
docs/js/render_graph_standard.js

Standard renderer with degree-seeded staged load
- consumes docs/data/graph_data.json or window.MOTW.graphStd if preloaded
- loads docs/data/degree.json or uses window.MOTW.degree, falls back to compute
- Stage 1: show top 3 highest-degree org nodes + their 1-hop org neighbours (org<->org edges only)
- Stage 2: add remaining nodes/edges in chunks while showing a status chip
- Edges start as haystack for speed, switch to bezier on zoom-in
- Info panel uses a type-agnostic "fields" bag (parity with lite)
 */
(function () {
  const EDGE_FIRST_BATCH = 800;
  const EDGE_CHUNK_SIZE  = 1500;
  const EDGE_CHUNK_DELAY = 150;
  const LABEL_ZOOM = 1.2;
  const HAYSTACK_TO_BEZIER_ZOOM = 1.1;

  const MAX_STAGE_NODES   = 600;   // cap how many nodes are shown in Stage 1
  const MAX_LAYOUT_NODES  = 700;   // if stage > this, skip COSE and use a quick grid
  const STAGE_EDGE_SLICE  = 300;   // initial edge slice to give layout structure


  // Find the site root prefix, e.g. "/csc-map-of-the-world/"
  const SITE_ROOT = (location.pathname.match(/^(.*?\/csc-map-of-the-world\/)/)?.[1]) || '/';

  function jitteredGridPositions(count, gap=28, jitter=8, seed=17){
    function rngFactory(a){ return function(){ let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296; }; }
    const cols = Math.ceil(Math.sqrt(count));
    const rng  = rngFactory(seed);
    const pos  = new Array(count);
    for (let i=0;i<count;i++){
      const x=(i%cols)*gap+(rng()*2-1)*jitter;
      const y=(Math.floor(i/cols))*gap+(rng()*2-1)*jitter;
      pos[i]={x,y};
    }
    return pos;
  }

  // Expand each visible connected component a bit, and also push isolated nodes outward
  function expandComponents(cy, factor = 1.08, animateMs = 250, isolatePush = 24){
    const visNodes = cy.nodes(':visible');
    if (!visNodes.length) return;

    // Global centroid of all visible nodes (used to push isolates)
    let gx = 0, gy = 0;
    visNodes.forEach(n => { const p = n.position(); gx += p.x; gy += p.y; });
    gx /= visNodes.length; gy /= visNodes.length;

    const visEles = visNodes.union(cy.edges(':visible'));
    const comps = visEles.components(); // arrays of collections

    cy.batch(() => {
      for (const comp of comps) {
        const nodes = comp.nodes();
        if (!nodes.length) continue;

        if (nodes.length >= 2) {
          // Expand multi-node component around its own centroid
          let cx = 0, cyy = 0;
          nodes.forEach(n => { const p = n.position(); cx += p.x; cyy += p.y; });
          cx /= nodes.length; cyy /= nodes.length;

          nodes.forEach(n => {
            const p = n.position();
            const tx = cx + (p.x - cx) * factor;
            const ty = cyy + (p.y - cyy) * factor;
            if (animateMs > 0) n.animate({ position: { x: tx, y: ty } }, { duration: animateMs });
            else n.position({ x: tx, y: ty });
          });
        } else {
          // Single isolated node: push away from global centroid
          const n  = nodes[0];
          const p  = n.position();
          let dx = p.x - gx, dy = p.y - gy;
          let len = Math.hypot(dx, dy);
          if (len < 1) {
            // Tiny random nudge if it's on the centroid
            const a = Math.random() * Math.PI * 2;
            dx = Math.cos(a); dy = Math.sin(a); len = 1;
          }
          const tx = p.x + (dx / len) * isolatePush;
          const ty = p.y + (dy / len) * isolatePush;
          if (animateMs > 0) n.animate({ position: { x: tx, y: ty } }, { duration: animateMs });
          else n.position({ x: tx, y: ty });
        }
      }
    });
  }


  function statusChip(container) {
    let el = document.getElementById('network-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'network-status';
      el.style.cssText =
        'position:absolute;top:8px;left:8px;z-index:10;background:rgba(255,255,255,.95);' +
        'border:1px solid #ddd;padding:6px 10px;border-radius:6px;font-size:.9em;color:#333';
      if (!container.style.position) container.style.position = 'relative';
      container.appendChild(el);
    }
    return {
      set(msg){ el.textContent = msg; },
      hide(){ if (el && el.parentNode) el.parentNode.removeChild(el); },
      showFor(msg, ms=1600){ this.set(msg); setTimeout(()=>this.hide(), ms); }
    };
  }

  function getGraphStd(url) {
    if (window.MOTW && window.MOTW.graphStd) return Promise.resolve(window.MOTW.graphStd);
    return fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`); return r.json(); });
  }
  function getDegree(url, fallbackEdges, nodesById) {
    if (window.MOTW && window.MOTW.degree) return Promise.resolve(window.MOTW.degree);
    return fetch(url).then(r => r.ok ? r.json() : Promise.reject()).catch(() => {
      // fallback: compute undirected degree from edges
      const deg = {};
      for (const id of Object.keys(nodesById)) deg[id] = 0;
      for (const e of fallbackEdges) {
        const s = e.data.source, t = e.data.target;
        if (deg[s] != null) deg[s] += 1;
        if (deg[t] != null) deg[t] += 1;
      }
      return deg;
    });
  }

  function setEdgeMode(cy, mode) {
    const s = cy.style();
    if (mode === 'fast') {
      s.selector('edge')
       .style('curve-style', 'haystack')
       .style('haystack-radius', 1)
       .style('line-color', '#aaa')
       .style('width', 1)
       .style('opacity', 0.35)
       .style('target-arrow-shape', 'none');
    } else {
      s.selector('edge')
       .style('curve-style', 'bezier')
       .style('line-color', '#a0a0a0')
       .style('width', 1.2)
       .style('opacity', 0.9)
       .style('target-arrow-shape', 'triangle');
    }
    s.update();
  }

  function addEdgesProgressively(cy, allEdgeEls, first = EDGE_FIRST_BATCH, onDone) {
    let idx = 0;
    const now = allEdgeEls.slice(0, first);
    idx = now.length;
    if (now.length) cy.add(now);

    function finish(){ if (typeof onDone === 'function') onDone(); }

    function pump() {
      if (idx >= allEdgeEls.length) { finish(); return; }
      const next = allEdgeEls.slice(idx, Math.min(allEdgeEls.length, idx + EDGE_CHUNK_SIZE));
      idx += next.length;
      cy.batch(() => { cy.add(next); });
      if (idx < allEdgeEls.length) setTimeout(pump, EDGE_CHUNK_DELAY);
      else finish();
    }

    if (idx >= allEdgeEls.length) finish();
    else setTimeout(pump, EDGE_CHUNK_DELAY);
  }

  // ----- Info panel helpers (parity with lite)
  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, m =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function buildFieldsHTML(d){
    const f = d.fields || {};
    const rows = [];

    const orgType   = f.organisation_type || f.organization_type || d.organisation_type;
    const region    = f.region || d.region;
    const projects  = Array.isArray(f.projects) ? f.projects
                    : Array.isArray(d.projects) ? d.projects : [];
    const persons   = Array.isArray(f.persons) ? f.persons
                    : Array.isArray(d.persons) ? d.persons : [];
    const published = d.date_published || d.published || d.date;


    if (d.type)           rows.push(`<div class="row"><span class="subhead">Type</span><div class="meta">${esc(d.type)}</div></div>`);
    if (d.slug)           rows.push(`<div class="row"><span class="subhead">Slug</span><div class="meta">${esc(d.slug)}</div></div>`);
    if (d.website)        rows.push(`<div class="row"><span class="subhead">Website</span> <a href="${esc(d.website)}" target="_blank" rel="noopener">${esc(d.website)}</a></div>`);
    // if (d.date_published) rows.push(`<div class="row"><span class="subhead">Published</span><div class="meta">${esc(d.date_published)}</div></div>`);
    if (published) rows.push(`<div class="row"><span class="subhead">Published</span><div class="meta">${esc(published)}</div></div>`);

    if (Array.isArray(d.tags) && d.tags.length){
      rows.push(`<div class="row"><div class="subhead">Tags</div><div class="tags">${
        d.tags.map(t=>`<span>${esc(t)}</span>`).join(" ")
      }</div></div>`);
    }

    if (orgType) rows.push(`<div class="row"><span class="subhead">Organisation type</span><div class="meta">${esc(orgType)}</div></div>`);
    if (region)  rows.push(`<div class="row"><span class="subhead">Region</span><div class="meta">${esc(region)}</div></div>`);
    if (projects.length){
      rows.push(`<div class="row"><span class="subhead">Projects</span><ul>${
        projects.filter(Boolean).map(p=>`<li>${esc(p)}</li>`).join("")
      }</ul></div>`);
    }
    if (persons.length){
      rows.push(`<div class="row"><span class="subhead">People</span><ul>${
        persons.map(p=>{
          if (p && typeof p === "object"){
            const nm = esc(p.name||""); const rl = esc(p.role||""); const fr = esc(p.from||"");
            const extra = [rl, fr].filter(Boolean).join(", ");
            return `<li>${nm}${extra?` <span class="meta">(${extra})</span>`:""}</li>`;
          }
          return `<li>${esc(p)}</li>`;
        }).join("")
      }</ul></div>`);
    }

    // optional appear in panel IF exist
    if (f.lead_organisation) rows.push(`<div class="row"><span class="subhead">Lead organisation</span><div class="meta">${esc(f.lead_organisation)}</div></div>`);
    if (f.location)          rows.push(`<div class="row"><span class="subhead">Location</span><div class="meta">${esc(f.location)}</div></div>`);
    if (f.date)              rows.push(`<div class="row"><span class="subhead">Date</span><div class="meta">${esc(f.date)}</div></div>`);

    if (f.status)           rows.push(`<div class="row"><span class="subhead">Status</span><div class="meta">${esc(f.status)}</div></div>`);
    if (f.linked_framework) rows.push(`<div class="row"><span class="subhead">Linked framework</span><div class="meta">${esc(f.linked_framework)}</div></div>`);
    if (Array.isArray(f.target_outcomes) && f.target_outcomes.length){
      rows.push(`<div class="row"><span class="subhead">Target outcomes</span><ul>${
        f.target_outcomes.map(o=>`<li>${esc(o)}</li>`).join("")
      }</ul></div>`);
    }
    return rows.join("\n");
  }

  function init(container) {
    const chip = statusChip(container);
    chip.set('Loading network...');

    const graphURL  = new URL('data/graph_data.json', location.origin + SITE_ROOT).toString();
    const degreeURL = new URL('data/degree.json',     location.origin + SITE_ROOT).toString();


    const siteBase  = graphURL.replace(/data\/graph_data\.json$/, '');

    getGraphStd(graphURL).then(async (raw) => {
      if (!Array.isArray(raw?.elements)) throw new Error('Expected {elements:[...]} in graph_data.json');

      // split nodes and edges (keep full data on nodes for the panel)
      const nodeEls = [];
      const edgeEls = [];

      function toClass(dOrType){
        const raw = String(dOrType || '').toLowerCase();
        if (raw === 'organization' || raw === 'organisation') return 'org';
        switch (raw) {
          case 'service': case 'event': case 'plan': case 'rule':
          case 'collection': case 'person': case 'relationship':
          case 'dataset': case 'tool': return raw;
          default: return 'default';
        }
      }

      for (const el of raw.elements) {
        if (el.group === 'nodes') {
          const d0  = el.data || {};
          const cls = (el.classes || '').trim().toLowerCase();
          const t   = cls ? cls : toClass(d0.type);

          // carry preset position from standard JSON if present
          const pos = (el.position && typeof el.position.x === 'number' && typeof el.position.y === 'number')
            ? el.position
            : undefined;

          const d = {
            ...d0,
            t,
            label: d0.label || d0.name || d0.id,
            slug:  d0.slug  || '',
            summary: d0.summary || d0.description || ''
          };

          // include position on element
          nodeEls.push({ group:'nodes', data: d, classes: t, position: pos });
        } else if (el.group === 'edges') {
          const d = el.data || {};
          edgeEls.push({ group:'edges', data: d, classes: (el.classes || '') });
        }
      }

      const nodesById = Object.fromEntries(nodeEls.map(n => [n.data.id, n]));
      // const orgIds = new Set(
      //   nodeEls
      //     .filter(n => (n.classes || '').toLowerCase() === 'org' || String(n.data.type || '').toUpperCase() === 'ORGANIZATION')
      //     .map(n => n.data.id)
      // );

      // neighbour map (undirected)
      const nbr = new Map();
      for (const e of edgeEls) {
        const { source: s, target: t } = e.data;
        if (!nbr.has(s)) nbr.set(s, new Set());
        if (!nbr.has(t)) nbr.set(t, new Set());
        nbr.get(s).add(t);
        nbr.get(t).add(s);
      }

      // degree map (prefer file; fallback computes from edges)
      const degree = await getDegree(degreeURL, edgeEls, nodesById);

      // --- Stage = org nodes (capped) + org↔org edges (fast, stable first paint)
      const orgNodeEls = nodeEls.filter(n => n.data.t === 'org' || (n.classes || '').toLowerCase() === 'org');

      let stageSet, stageNodeEls, stageEdgeEls;
      if (orgNodeEls.length > MAX_STAGE_NODES) {
        // Use degree to rank, then BFS 1-hop org neighbours until cap is hit
        const ranked = orgNodeEls
          .map(n => ({ id: n.data.id, el: n, deg: (degree[n.data.id] || 0) }))
          .sort((a,b) => b.deg - a.deg);

        const seedCount = Math.max(3, Math.floor(MAX_STAGE_NODES * 0.15)); // ~15% seeds
        const seeds = ranked.slice(0, seedCount).map(x => x.id);

        stageSet = new Set(seeds);
        for (const sid of seeds) {
          const ns = nbr.get(sid);
          if (!ns) continue;
          for (const m of ns) {
            const cls = (nodesById[m]?.classes || '').toLowerCase();
            if (cls === 'org') stageSet.add(m);
            if (stageSet.size >= MAX_STAGE_NODES) break;
          }
          if (stageSet.size >= MAX_STAGE_NODES) break;
        }

        stageNodeEls = orgNodeEls.filter(n => stageSet.has(n.data.id));
        stageEdgeEls = edgeEls.filter(e => stageSet.has(e.data.source) && stageSet.has(e.data.target));
      } else {
        stageSet     = new Set(orgNodeEls.map(n => n.data.id));
        stageNodeEls = orgNodeEls;
        stageEdgeEls = edgeEls.filter(e => stageSet.has(e.data.source) && stageSet.has(e.data.target));
      }

      // --- Everything else = rest (for background streaming)
      const stageEdgeKey = e =>
        (e.data.source < e.data.target)
          ? `${e.data.source}|${e.data.target}`
          : `${e.data.target}|${e.data.source}`;

      const stagedEdgeKeys = new Set(stageEdgeEls.map(stageEdgeKey));
      const restNodeEls    = nodeEls.filter(n => !stageSet.has(n.data.id));
      const restEdgeEls    = edgeEls.filter(e => !stagedEdgeKeys.has(stageEdgeKey(e)));

      // --- Create (or reuse)Cytoscape instance
      let cy = (window.MOTW_CY &&
                typeof window.MOTW_CY.add === 'function' &&
                typeof window.MOTW_CY.container === 'function' &&
                window.MOTW_CY.container() === container)
        ? window.MOTW_CY
        : cytoscape({
            container,
            elements: [],
            pixelRatio: 1,
            textureOnViewport: true,
            wheelSensitivity: 1,      // <= default (removes warning)
            hideEdgesOnViewport: true,
            motionBlur: true,
            layout: { name: 'preset', fit: false }
          });

          // keep both a safe handle and the legacy global (for other scripts)
          window.MOTW_CY = cy;
          window.cy      = cy;

          // --- Base style (so nodes/edges look right from the first paint)
          cy.style().fromJson([
            { selector: 'node', style: { 'background-color': '#b8b8b8', 'width': 8, 'height': 8, 'label': '' } },
            { selector: 'node.org',     style: { 'background-color': '#4c78a8' } },
            { selector: 'node.service', style: { 'background-color': '#f58518' } },
            { selector: 'node.dataset', style: { 'background-color': '#54a24b' } },
            { selector: 'node.tool',    style: { 'background-color': '#e45756' } },
            { selector: 'node.event',   style: { 'background-color': '#72b7b2' } },
            { selector: 'node.plan',    style: { 'background-color': '#ff9da6' } },
            { selector: 'node.person',  style: { 'background-color': '#b279a2' } },
            { selector: 'node.rule',    style: { 'background-color': '#eeca3b' } },
            { selector: 'edge',         style: { 'line-color': '#aaa', 'width': 1 } }
          ]).update();

          setEdgeMode(cy, 'fast');

      // Search hook & state
      let searchPredicate = () => true;  // default: match everything
      let searchActive = false;          // default: no active query

      // --- Stage 1: add stage nodes + a small slice of edges, then quick layout
      chip.set('Preparing initial view…');

      // 1a) add stage nodes
      cy.add(stageNodeEls);

      // 1b) add a small initial slice of edges to give the layout some structure
      const stageEdgeSlice = stageEdgeEls.slice(0, STAGE_EDGE_SLICE);
      if (stageEdgeSlice.length) cy.add(stageEdgeSlice);

      // 1c) decide how to arrange them
      const stageColl = cy.nodes().filter(n => stageSet.has(n.id()));
      const bb        = stageColl.boundingBox();
      const looksStacked = (Math.abs(bb.w) < 20 && Math.abs(bb.h) < 20);

      if (looksStacked) {
        if (stageColl.length > MAX_LAYOUT_NODES) {
          // Too big for COSE – use a quick jittered grid and move on
          const pos = jitteredGridPositions(stageColl.length, 28, 8, 17);
          let i = 0; stageColl.forEach(n => n.position(pos[i++]));
          cy.fit(stageColl, 120);
          chip.set('Adding nearby links…');
          addEdgesProgressively(cy, stageEdgeEls, STAGE_EDGE_SLICE, () => {
            // gentle expand after initial stage edges are in
            expandComponents(cy, 1.06, 180, 14);
          });
        } else {
          // Small enough – do a short COSE just on the staged subgraph
          chip.set('Arranging layout…');
          cy.style().selector('edge').style('opacity', 0.25).update();

          const sub = stageColl.union(stageColl.edgesWith(stageColl));
          const layout = sub.layout({
            name: 'cose',
            fit: true,
            animate: 'end',
            animationDuration: 450,
            numIter: 220,           // lighter than before
            nodeRepulsion: 80000,   // slightly reduced
            idealEdgeLength: 90,
            gravity: 2
          });
          layout.on('layoutstop', () => {
            cy.style().selector('edge').style('opacity', 1).update();
            chip.set('Adding nearby links…');
            addEdgesProgressively(cy, stageEdgeEls, STAGE_EDGE_SLICE);
          });
          layout.run();
        }
      } else {
        // Already has useful positions
        const core = stageColl.filter(n => n.connectedEdges().length > 0);
        cy.fit(core.length ? core : stageColl, 120);
        chip.set('Adding nearby links…');
        addEdgesProgressively(cy, stageEdgeEls, 0, () => {
          expandComponents(cy, 1.06, 180, 14);
        });

      }



      // stage 2
      const addRest = () => {
        chip.set('Expanding full network…');

        // first half
        const mid = Math.min(restNodeEls.length, 4000);
        const batchA = restNodeEls.slice(0, mid);
        seedPositionsForBatch(cy, batchA, nbr);           // <-- NEW
        cy.batch(() => { cy.add(batchA); });

        setTimeout(() => {
          // second half
          const batchB = restNodeEls.slice(mid);
          seedPositionsForBatch(cy, batchB, nbr);         // <-- NEW
          cy.batch(() => { cy.add(batchB); });

          // then edges for the rest
          addEdgesProgressively(cy, restEdgeEls, 0, () => {
            // expand a touch everywhere once everything is visible
            expandComponents(cy, 1.08, 220, 24);
            chip.showFor('Zoom in to view node labels', 2200);
          });
        }, 120);
      };

      if (window.requestIdleCallback) requestIdleCallback(addRest, { timeout: 800 });
      else setTimeout(addRest, 300);

      // zoom behaviour
      cy.on('zoom', () => {
        const z = cy.zoom();
        const show = z > LABEL_ZOOM;
        cy.batch(() => cy.nodes().forEach(n => n.style('label', show ? n.data('label') : '')));
        setEdgeMode(cy, z >= HAYSTACK_TO_BEZIER_ZOOM ? 'detail' : 'fast');
      });

      // ---- Filter & neighbours UI (self-contained) ----
      const typeFilter = document.getElementById('typeFilter');
      const ctxToggle  = document.getElementById('contextModeToggle');
      const resetBtn   = document.getElementById('resetView');

      (function ensureChoicesCss() {
        if (!document.querySelector('link[href*="choices.min.css"]')) {
          const l = document.createElement('link');
          l.rel = 'stylesheet';
          l.href = 'https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css';
          document.head.appendChild(l);
        }
      })();

      let choicesInstance = null;
      if (window.Choices && typeFilter && !typeFilter.dataset.enhanced) {
        choicesInstance = new Choices(typeFilter, { removeItemButton: true, shouldSort: false });
        typeFilter.dataset.enhanced = '1';
      }

      function getSelectedTypes() {
        const raw = choicesInstance
          ? choicesInstance.getValue(true)
          : Array.from(typeFilter?.selectedOptions || []).map(o => o.value);
        return new Set(raw.map(x => String(x).toLowerCase()));
      }

    //  function applyScopedView() {
    //     // // 1) Which types are allowed?
    //     // const types = typeFilter ? getSelectedTypes() : new Set(['org']);
    //     // // 2) Initial visible set = nodes with allowed type
    //     // let visible = new Set();
    //     // cy.nodes().forEach(n => {
    //     //   const t = String(n.data('t') || '').toLowerCase();

    //     //   // allow by type AND search
    //     //   if (types.has(t) && searchPredicate(n)) visible.add(n.id());

    //     // 1) Which types allowed? (revised to take types filter into account)
    //     // If dropdown/type filter exists, read it; otherwise, treat as empty set (no types selected)
    //     const types = typeFilter ? getSelectedTypes() : new Set();
    //     // We allow all types IFF there are **no** types selected AND there **is** an active search.
    //     const hasTypesSelected  = types && types.size > 0;
    //     const allowAllBySearch  = !hasTypesSelected && searchActive;

    //     // 2) Initial visible set = nodes that pass (type OR allowAllBySearch) AND search
    //     let visible = new Set();
    //     cy.nodes().forEach(n => {
    //       const t = String(n.data('t') || '').toLowerCase();
    //       const passesType = hasTypesSelected ? types.has(t) : allowAllBySearch;
    //       if (passesType && searchPredicate(n)) visible.add(n.id());
    //     });

    //     // 3) Keep neighbours?
    //     const keepNeighbours = !!(ctxToggle && ctxToggle.checked);
    //     if (keepNeighbours) {
    //       const add = new Set(visible);
    //       cy.edges().forEach(e => {
    //         const s = e.data('source'), t = e.data('target');
    //         if (visible.has(s) || visible.has(t)) { add.add(s); add.add(t); }
    //       });
    //       visible = add;
    //     }
    //     // 4) Apply visibility
    //     cy.batch(() => {
    //       cy.nodes().forEach(n => n.style('display', visible.has(n.id()) ? 'element' : 'none'));
    //       cy.edges().forEach(e => {
    //         const s = e.data('source'), t = e.data('target');
    //         e.style('display', (visible.has(s) && visible.has(t)) ? 'element' : 'none');
    //       });
    //     });
    //     // 5) Fit to visible connected core
    //     const core = cy.nodes().filter(n => n.style('display') !== 'none' && n.connectedEdges(':visible').length > 0);
    //     if (core.length) cy.fit(core, 16);
    //     // small post-fit spacing pass so things don't sit too tight
    //     expandComponents(cy, 1.04, 150, 12);

    //   }

    //   // wiring
    //   typeFilter?.addEventListener('change', applyScopedView);
    //   ctxToggle?.addEventListener('change', applyScopedView);
    //   resetBtn?.addEventListener('click', () => {
    //     if (choicesInstance) {
    //       choicesInstance.removeActiveItems();
    //       choicesInstance.setChoiceByValue(['org']);
    //     } else if (typeFilter) {
    //       Array.from(typeFilter.options).forEach(o => o.selected = (o.value === 'org'));
    //     }
    //     if (ctxToggle) ctxToggle.checked = false;
    //     applyScopedView();
    //   });

    //   // allow external code (e.g. .md page inline) to update search predicate and re-apply scope
    //   // ---- setter tells us if input query active ----
    //   // i.e. lets page tell renderer whether user currently has non-empty query. 
    //   // When there are no types selected, that flag enables --search shows all types--
    //   cy.__setSearchPredicate = (fn, isActive = null) => {
    //     searchPredicate = (typeof fn === 'function') ? fn : (() => true);
    //     if (isActive !== null) searchActive = !!isActive;
    //     // Run scoping slightly async so we're off input handler call stack
    //     setTimeout(() => applyScopedView(), 0);
    //   };



    //   // Run once after Stage 1 is on screen
    //   setTimeout(applyScopedView, 0);

    //   // Let other scripts know standard renderer owns scoping
    //   // towards preventing the org nodes showing when neighbours toggle on/off
    //   // see also const HAS_STANDARD_SCOPER in network.md page inline js
    //   cy.__standardScoper = true;
    //   window.MOTW_SCOPER = 'standard';
            
    //   // info panel (use full node data from _standard JSON)
    //   let panel = document.getElementById('node-panel');
    //   if (!panel) {
    //     panel = document.createElement('div');
    //     panel.id = 'node-panel';
    //     panel.className = 'node-panel';
    //     panel.style.display = 'none';
    //     panel.style.position = 'fixed';
    //     panel.style.top = '96px';
    //     panel.style.right = '16px';
    //     panel.style.width = 'min(360px,95vw)';
    //     panel.style.maxHeight = '70vh';
    //     panel.style.overflow = 'auto';
    //     panel.style.background = '#fff';
    //     panel.style.border = '1px solid #ddd';
    //     panel.style.borderRadius = '8px';
    //     panel.style.boxShadow = '0 10px 24px rgba(0,0,0,.12)';
    //     panel.style.padding = '12px 14px';
    //     panel.style.zIndex = '9999';
    //     document.body.appendChild(panel);
    //   }

    //   // --- close helpers / listeners
    //   function closePanel(){ panel.style.display = 'none'; }

    //   panel.addEventListener('click', (e) => {
    //     const btn = e.target.closest('[data-close-panel]');
    //     if (btn) {
    //       e.preventDefault();
    //       e.stopPropagation();
    //       closePanel();
    //     }
    //   });

    //   document.addEventListener('keydown', (e) => {
    //     if (e.key === 'Escape' && panel.style.display !== 'none') {
    //       closePanel();
    //     }
    //   }); 
      function applyScopedView() {
        // 0) Read UI state
        const hasChoices = !!choicesInstance;
        const typeFilterSelected = typeFilter ? (
          hasChoices
            ? new Set(choicesInstance.getValue(true).map(v => String(v).toLowerCase()))
            : new Set(Array.from(typeFilter.selectedOptions || []).map(o => String(o.value).toLowerCase()))
        ) : new Set();
        const hasTypesSelected = typeFilterSelected.size > 0;

        const keepNeighbours = !!(ctxToggle && ctxToggle.checked);

        // 1) Build the BASE visible set (before neighbour expansion)
        //    a) If types selected -> type ∧ search
        //    b) Else if search active -> search only (all types)
        //    c) Else (no types, no search) -> show ALL nodes
        const base = new Set();
        if (hasTypesSelected) {
          cy.nodes().forEach(n => {
            const t = String(n.data('t') || '').toLowerCase();
            if (typeFilterSelected.has(t) && searchPredicate(n)) base.add(n.id());
          });
        } else if (searchActive) {
          cy.nodes().forEach(n => { if (searchPredicate(n)) base.add(n.id()); });
        } else {
          cy.nodes().forEach(n => base.add(n.id())); // your requested behaviour
        }

        // 2) Neighbour expansion (only from the BASE set)
        const visible = new Set(base);
        if (keepNeighbours && base.size) {
          cy.edges().forEach(e => {
            const s = e.data('source'), t = e.data('target');
            if (base.has(s) || base.has(t)) { visible.add(s); visible.add(t); }
          });
        }

        // 3) Apply node visibility
        cy.batch(() => {
          cy.nodes().forEach(n => n.style('display', visible.has(n.id()) ? 'element' : 'none'));

          // 4) Compute edges that *could* be visible (both ends visible)
          const candidateEdges = [];
          cy.edges().forEach(e => {
            const s = e.data('source'), t = e.data('target');
            if (visible.has(s) && visible.has(t)) candidateEdges.push(e);
          });

          // 5) Edge thinning policy
          //    - If neighbours is ON OR search is active -> do NOT thin (avoid “floating” neighbour nodes)
          //    - Else thin to MAX_EDGES, guaranteeing ≥1 edge per node first, then fill to cap.
          const cap = (keepNeighbours || searchActive) ? Infinity : Number(MAX_EDGES || 0);

          if (!isFinite(cap) || candidateEdges.length <= cap) {
            // Show all candidate edges
            cy.edges().forEach(e => {
              const s = e.data('source'), t = e.data('target');
              e.style('display', (visible.has(s) && visible.has(t)) ? 'element' : 'none');
            });
          } else {
            // Greedy: keep at least one edge per visible node, then fill up to cap.
            const shownEdgeIds = new Set();
            const satisfiedNode = new Set();

            // pass 1: one edge per node (where possible)
            for (const e of candidateEdges) {
              if (shownEdgeIds.size >= cap) break;
              const s = e.data('source'), t = e.data('target');
              if (!(satisfiedNode.has(s) && satisfiedNode.has(t))) {
                shownEdgeIds.add(e.id());
                satisfiedNode.add(s); satisfiedNode.add(t);
              }
            }

            // pass 2: fill remaining slots
            for (let i = 0; shownEdgeIds.size < cap && i < candidateEdges.length; i++) {
              shownEdgeIds.add(candidateEdges[i].id());
            }

            // apply
            cy.edges().forEach(e => {
              const s = e.data('source'), t = e.data('target');
              const show = (visible.has(s) && visible.has(t) && shownEdgeIds.has(e.id()));
              e.style('display', show ? 'element' : 'none');
            });
          }
        });

        // 6) Fit & a gentle spacing pass
        const core = cy.nodes(':visible').filter(n => n.connectedEdges(':visible').length > 0);
        if (core.length) cy.fit(core, 16);
        // small post-fit spacing so components don’t sit too tight
        expandComponents(cy, 1.04, 120, 10);
      }


      // --- Info panel: create & wire -----------------------------------------
      function ensurePanel() {
        let el = document.getElementById('node-panel');
        if (!el) {
          el = document.createElement('div');
          el.id = 'node-panel';
          el.className = 'node-panel';
          el.style.display = 'none';
          el.style.position = 'fixed';
          el.style.top = '96px';
          el.style.right = '16px';
          el.style.width = 'min(360px,95vw)';
          el.style.maxHeight = '70vh';
          el.style.overflow = 'auto';
          el.style.background = '#fff';
          el.style.border = '1px solid #ddd';
          el.style.borderRadius = '8px';
          el.style.boxShadow = '0 10px 24px rgba(0,0,0,.12)';
          el.style.padding = '12px 14px';
          el.style.zIndex = '9999';
          document.body.appendChild(el);
        }
        return el;
      }

      const panel = ensurePanel();

      function closePanel(){ panel.style.display = 'none'; }

      panel.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-close-panel]');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          closePanel();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel.style.display !== 'none') {
          closePanel();
        }
      });

      // Open on node tap; close on background tap
      cy.on('tap', 'node', (e) => renderNodePanel(e.target));
      cy.on('tap',   (e) => { if (e.target === cy) closePanel(); });

      function renderNodePanel(n){
        const d = n.data(); // rich data from standard builder
        const title   = `<div class="row"><strong>${esc(d.label || n.id())}</strong></div>`;
        const meta    = `<div class="meta">${esc(d.slug || '')}</div>`;
        const summary = d.summary
          ? `<div class="row"><div class="subhead">Summary</div><div>${esc(d.summary)}</div></div>`
          : '';
        const fields  = buildFieldsHTML(d);
        const website = d.website ? `<div class="row"><a href="${esc(d.website)}" target="_blank" rel="noopener">Website</a></div>` : '';
        const details = d.page_url ? `<div class="row"><a href="${siteBase}${d.page_url}">Details</a></div>` : '';

        // fixed position close button, can fix as panel is also fixed
        panel.innerHTML = `
        <button
          data-close-panel
          aria-label="Close"
          title="Close"
          style="
            position:absolute;
            top:8px;
            right:8px;
            border:none;
            background:transparent;
            font-size:20px;
            line-height:1;
            cursor:pointer;
            color:#666;
          "
        >&times;</button>

        <div class="node-panel-content" style="padding-top:4px">
          ${title}
          ${meta}
          ${summary}
          ${fields}
          ${website}
          ${details}
        </div>
      `;
      panel.style.display = 'block';
      }

      cy.on('tap', 'node', (e) => renderNodePanel(e.target)); // close panel on click on background page
      cy.on('tap',   (e) => { if (e.target === cy) panel.style.display = 'none'; });

    }).catch(err => {
      chip.set('Could not load graph data');
      // eslint-disable-next-line no-console
      console.error(err);
    });
  }

  // Seed positions for nodes with no position, based on placed neighbours in cy
  function seedPositionsForBatch(cy, nodeBatch, nbr) {
    // Cache current positions of nodes already in cy
    const placed = new Map();
    cy.nodes().forEach(n => { placed.set(n.id(), n.position()); });

    // deterministic jitter from id (stable but not identical)
    function jitterFromId(id, radius = 20) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
      const r1 = ((h >>> 1) & 0xffff) / 0xffff;  // 0..1
      const r2 = ((h >>> 17) & 0xffff) / 0xffff; // 0..1
      const a = r1 * Math.PI * 2;
      const r = 4 + radius * r2;
      return { dx: Math.cos(a) * r, dy: Math.sin(a) * r };
    }

    // Center fallback (around current visible graph)
    const bb = cy.nodes().boundingBox();
    const cx = (bb.x1 + bb.x2) / 2;
    const cyy = (bb.y1 + bb.y2) / 2;
    let fallbackIdx = 0;

    for (const el of nodeBatch) {
      if (!el || !el.data || (el.position && typeof el.position.x === 'number' && typeof el.position.y === 'number')) {
        continue; // already has position
      }
      const id = el.data.id;
      const ns = nbr.get(id) || new Set();

      // avg up to 6 placed neighbours
      let sx = 0, sy = 0, c = 0;
      for (const nId of ns) {
        const p = placed.get(nId);
        if (p) { sx += p.x; sy += p.y; c++; if (c >= 6) break; }
      }
      if (c > 0) {
        const { dx, dy } = jitterFromId(id, 22);
        el.position = { x: sx / c + dx, y: sy / c + dy };
      } else {
        // no placed neighbours: put on loose spiral around graph centre
        const t = fallbackIdx * 0.9;
        const r = 80 + 6 * fallbackIdx;
        const { dx, dy } = jitterFromId(id, 12);
        el.position = { x: cx + Math.cos(t) * r + dx, y: cyy + Math.sin(t) * r + dy };
        fallbackIdx++;
      }
    }
    return nodeBatch; // mutated in place, but also returned 
  }


  function mount() {
    const container = document.getElementById('cy') || document.getElementById('network-app');
    if (!container) return;
    init(container);
  }

  if (window.document$) {
    document$.subscribe(() => setTimeout(mount, 0));
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();

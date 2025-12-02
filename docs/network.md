
# CSC Network Graph (IN DEV)

<!-- 1) mkdocs defaults, 2) css styled enlargement(not working), 3) forced full browswer win overlay --> 
<!-- <div id="cy" style="width: 100%; height: 600px;"></div> -->
<!-- <div id="cy"></div> --> 

This interactive graph is a work in progress mapping of key organisations, plans, and events and more that form the children’s services data ecosystem. It aims to provide both the simple connections and interelations between related CSC data work, projects, guidance, people and sub layer of detail and meta-data for those connected elements. 

This is a large scale mapping with many interconnected (moving)parts; currently a work-in-progress MVP. Data & relations are currently being added, graph layout and naming conventions for nodes in particular, is an ongoing discussion as we progress possible use-cases and standardise yml object structure.


<!-- depreciated in favour of dynamic path def after def SITE_ROOT -->
<!-- <link rel="prefetch" href="../data/degree.json" as="fetch" crossorigin> -->



<!-- Content search filter (in dev) -->
<div style="margin-bottom: 0.5em;">
  <label for="textSearch"><strong>Search:</strong></label>
  <input id="textSearch" type="text" placeholder="[IN DEV] name, tag, keyword…" style="width: 320px; margin-left: 0.5em;">
  <label style="margin-left: 0.75em; user-select: none;">
    <!-- Context toggle - keep neighbours visible in search or not -->
    <!-- <input type="checkbox" id="contextModeToggle" checked> --> <!-- default load ON -->
    <input type="checkbox" id="contextModeToggle"> <!-- default load OFF -->
    <strong>Keep neighbours (context)</strong>
  </label>
</div>


<!-- Enhanced multi-select filter with Choices.js -->
<div style="margin-bottom: 1em;">
  <label for="typeFilter"><strong>Filter by node type(s):</strong></label>
  <select id="typeFilter" multiple>
    <option value="org" selected>Organizations</option>
    <option value="plan">Plans</option>
    <option value="event">Events</option>
    <option value="service">Services</option>
  </select>
  <button id="resetView" style="margin-left: 1em;">Reset View</button>
</div>


<!-- Graph container -->
<div id="cy" style="width: 100%; height: 600px; border: 1px solid #ccc; margin-top: 1em;"></div>


<!-- Help link + quick tips -->
<!-- <div class="filter-help"> -->
  <!-- <a href="graph_filtering_guidance.md" class="help-link">Help: Filtering guide</a> -->
  <!-- <span aria-hidden="true"> · </span> -->
  <!-- <a href="#filtering-help" class="help-link">Quick tips</a> -->
<!-- </div> -->

<details id="filtering-help" class="filtering-help">
  <summary>Quick tips for filtering</summary>
  <div class="help-body">
    <p><strong>Free text</strong> matches the node’s <em>name</em>, <em>tags</em>, and <em>summary</em>.</p>
    <ul>
      <li><code>tag:&lt;word&gt;</code> — match nodes with that tag (e.g. <code>tag:ilacs</code>)</li>
      <li><code>type:&lt;kind&gt;</code> — restrict by type (<code>type:org</code>, <code>type:plan</code>, <code>type:event</code>, <code>type:service</code>)</li>
      <li>Combine terms: <code>tag:ilacs type:org</code> (all terms must match)</li>
      <li><em>Context mode</em>: keeps neighbours of matches visible for exploration</li>
      <li>Filters + search intersect (both must match)</li>
      <li>Share state: copy the URL (types and query persist in the hash)</li>
    </ul>

    <p><strong>Examples</strong></p>
    <ul>
      <li><code>ilacs</code> — any node mentioning “ilacs”</li>
      <li><code>tag:children_services</code> — nodes tagged “children_services”</li>
      <li><code>type:org dfe</code> — organisation nodes mentioning “dfe”</li>
      <li><code>tag:data_tools type:service</code> — services tagged “data_tools”</li>
    </ul>
  </div>
</details>

<style>
  #graph-status {
    font-size: 0.7em;
    color: #333;
  }
  .choices__inner {
    background-color: #f9f9f9;
    border-radius: 6px;
  }

  /* Panel polish */
.node-panel { font-size: 0.95em; line-height: 1.35; }
.node-panel .row { margin: 10px 0; }
.node-panel .meta { color:#666; font-size:0.9em; margin-top:-4px; }
.node-panel .subhead { color:#444; font-size:0.9em; margin-bottom:4px; }
.node-panel a { color:#2b4a9e; text-decoration: underline; }
.node-panel a:hover { text-decoration: none; }
.node-panel ul { margin: 6px 0 0 18px; padding: 0; }
.node-panel li { margin: 2px 0; }

/* Tag chips */
.node-panel .tags span{
  display:inline-block;
  background:#eef3ff;
  border:1px solid #dbe3ff;
  color:#2b4a9e;
  padding:2px 6px;
  border-radius:6px;
  margin:2px 6px 0 0;
  font-size:0.85em;
}

</style>







<!-- Choices.js (CSS + JS) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css">

<!-- libs first -->
<script defer src="https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js"></script>
<script defer src="../js/render_graph_standard.js"></script> <!-- note: _standard renderer -->
<script defer src="../js/search_tool.js"></script>

<!-- add colouring + loader + scoped view, default by type, switch with ?color=degree -->
<script>
(function () {
  // URL options: ?color=degree|type  ?types=org,service  ?ctx=1  ?maxe=800
  const params      = new URLSearchParams(location.search);
  const COLOR_MODE  = (params.get('color') || 'type').toLowerCase();
  const TYPES_PARAM = (params.get('types') || 'org')   // default to org-only
                        .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const CTX_PARAM   = params.get('ctx') === '1';       // include neighbours
  const MAX_EDGES   = Number(params.get('maxe') || 800); // cap visible edges after filtering

  // Find site root prefix, e.g. "/csc-map-of-the-world/"
  const SITE_ROOT = (location.pathname.match(/^(.*?\/csc-map-of-the-world\/)/)?.[1]) || '/';

  // prefetch degree.json with a site-root aware URL
  (() => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'fetch';
    link.crossOrigin = 'anonymous';
    link.href = new URL('data/degree.json', location.origin + SITE_ROOT).toString();
    document.head.appendChild(link);
  })();

  // status chip inside #cy, with fade
  function makeStatusChip() {
    const cyWrap = document.getElementById('cy');
    if (!cyWrap) return { set: ()=>{}, showFor: ()=>{}, hide: ()=>{} };
    if (!cyWrap.style.position) cyWrap.style.position = 'relative';
    const el = document.createElement('div');
    el.id = 'network-status';
    el.textContent = 'Loading network...';
    el.style.cssText = 'position:absolute;top:8px;left:8px;z-index:10;background:rgba(255,255,255,.95);border:1px solid #ddd;padding:6px 10px;border-radius:6px;font-size:.9em;color:#333;transition:opacity .25s ease;opacity:1';
    cyWrap.appendChild(el);
    const set = msg => { el.textContent = msg; el.style.opacity = '1'; };
    const hide = (afterMs = 0) => {
      if (afterMs > 0) {
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, afterMs);
      } else { el.remove(); }
    };
    const showFor = (msg, ms = 5000) => { set(msg); hide(ms); };
    return { set, hide, showFor };
  }
  const status = makeStatusChip();

  // If the standard renderer owns scoping, won't attach our own scope handlers if it does
  const HAS_STANDARD_SCOPER = (window.MOTW_SCOPER === 'standard');

  // wait for cy from render_graph_standard.js
  function whenCyReady(cb){
    const t0 = Date.now();
    (function spin(){
      const cy = window.cy;
      if (cy && typeof cy.ready === 'function'){ cy.ready(() => cb(cy)); return; }
      if (Date.now() - t0 > 8000) return; // give up quietly
      setTimeout(spin, 40);
    })();
  }

  // --- colouring helpers you already use ---
  function computeDegreesInBrowser(cy) {
    const deg = {}; cy.nodes().forEach(n => deg[n.id()] = 0);
    cy.edges().forEach(e => { const s=e.data('source'), t=e.data('target'); if (deg[s]!==undefined) deg[s]++; if (deg[t]!==undefined) deg[t]++; });
    return deg;
  }
  function applyTypeColors(cy) {
    const palette = { organization:'#4c78a8', org:'#4c78a8', service:'#f58518', dataset:'#54a24b', tool:'#e45756', event:'#72b7b2', plan:'#ff9da6', person:'#b279a2', rule:'#eeca3b', default:'#b8b8b8' };
    cy.style().fromJson([
      { selector:'node', style:{ 'background-color': palette.default } },
      { selector:'node[t = "organization"], node[t = "org"]', style:{ 'background-color': palette.organization } },
      { selector:'node[t = "service"]', style:{ 'background-color': palette.service } },
      { selector:'node[t = "dataset"]', style:{ 'background-color': palette.dataset } },
      { selector:'node[t = "tool"]',    style:{ 'background-color': palette.tool } },
      { selector:'node[t = "event"]',   style:{ 'background-color': palette.event } },
      { selector:'node[t = "plan"]',    style:{ 'background-color': palette.plan } },
      { selector:'node[t = "person"]',  style:{ 'background-color': palette.person } },
      { selector:'node[t = "rule"]',    style:{ 'background-color': palette.rule } }
    ]).update();
  }
  async function applyDegreeColors(cy) {
    let degrees = {};
    try {
      const degreeHref = new URL('data/degree.json', location.origin + SITE_ROOT).toString();
      const r = await fetch(degreeHref);
      if (!r.ok) throw new Error();
      degrees = await r.json();
    } catch { degrees = computeDegreesInBrowser(cy); }
    cy.batch(() => cy.nodes().forEach(n => n.data('deg', degrees[n.id()] ?? 0)));
    const maxDeg = Math.max(1, ...Object.values(degrees));
    cy.style().fromJson([{ selector: 'node', style: { 'background-color': `mapData(deg, 0, ${maxDeg}, #e0f3ff, #08519c)` } }]).update();
  }

  function getSelectedTypesFromDOM() {
    const sel = document.getElementById('typeFilter');
    if (!sel) return null;
    // Works whether Choices.js is enhancing or not, because the underlying <select> still reflects selection.
    const vals = Array.from(sel.selectedOptions || []).map(o => String(o.value).toLowerCase());
    return new Set(vals);
  }



  // --- scoped display logic (performance & correctness) ---
  function applyScopedView(cy) {
    // Prefer the live dropdown; fall back to URL ?types param
    const domTypes = getSelectedTypesFromDOM();
    const allowed  = (domTypes && domTypes.size) ? domTypes : new Set(TYPES_PARAM);

    const ctxToggle = document.getElementById('contextModeToggle');
    const includeNeighbours = ctxToggle ? !!ctxToggle.checked : CTX_PARAM;

    const visible = new Set();
    cy.nodes().forEach(n => {
      const t = String(n.data('t') || '').toLowerCase();
      if (allowed.has(t)) {
        visible.add(n.id());
        if (includeNeighbours) {
          n.neighborhood('node').forEach(m => visible.add(m.id()));
        }
      }
    });

    cy.batch(() => {
      cy.nodes().forEach(n => n.style('display', visible.has(n.id()) ? 'element' : 'none'));
      cy.edges().forEach(e => {
        const s = e.data('source'), t = e.data('target');
        e.style('display', (visible.has(s) && visible.has(t)) ? 'element' : 'none');
      });
    });

    // optional: thin edges further if too dense
    if (MAX_EDGES > 0) {
      const visEdges = cy.edges().filter(e => e.style('display') !== 'none');
      if (visEdges.length > MAX_EDGES) {
        const arr = visEdges.toArray();
        for (let i = MAX_EDGES; i < arr.length; i++) arr[i].style('display', 'none');
      }
    }
  }

  // quick COSE on the currently visible subgraph if everything looks stacked at {0,0}
  function quickLayoutIfStacked(cy) {
    const vis = cy.nodes(':visible');
    if (!vis.length) return;

    const bb = vis.boundingBox(); // {x1,x2,y1,y2,w,h}
    const w = Math.abs(bb.w || (bb.x2 - bb.x1));
    const h = Math.abs(bb.h || (bb.y2 - bb.y1));
    const looksStacked = (w < 20 && h < 20 && vis.length > 2);

    if (!looksStacked) return;

    status.set('Arranging layout...');
    const subgraph = vis.union(vis.edgesWith(vis));
    cy.style().selector('edge').style('opacity', 0.25).update();
    const layout = subgraph.layout({
      name: 'cose',
      fit: true,
      animate: 'end',
      animationDuration: 600,
      numIter: 500,
      nodeRepulsion: 90000,
      idealEdgeLength: 90,
      gravity: 2
    });
    layout.on('layoutstop', () => {
      cy.style().selector('edge').style('opacity', 1).update();
      status.showFor('Zoom in to view node labels', 2000);
    });
    layout.run();
  }

  // wire the checkbox if present so the scope updates live
  function wireScopeUI(cy) {
    if (HAS_STANDARD_SCOPER) return; // <-- force early running
    const ctxToggle = document.getElementById('contextModeToggle');
    if (ctxToggle) {
      ctxToggle.addEventListener('change', () => {
        applyScopedView(cy);
        quickLayoutIfStacked(cy); // re-run quick layout if user changes scope and nodes pile up
      }, { passive: true });
    }
  }

  // drive status + apply scope + color after render + run quick stage-1 layout if needed
  whenCyReady(async (cy) => {
    status.set('Preparing initial view...');

    // first paint status
    cy.once('render', () => status.set('Arranging layout...'));
    // fallback hide if no layout events fire
    const fallbackHide = setTimeout(() => status.showFor('Zoom in to view node labels', 5000), 6000);
    cy.once('layoutstop', () => { clearTimeout(fallbackHide); status.showFor('Zoom in to view node labels', 5000); });

    // enforce scoped view by default so non-org do not leak in
    // dont call inline scoper if standard scoper exists
    if (!HAS_STANDARD_SCOPER) {
      applyScopedView(cy);
      wireScopeUI(cy);
    }


    // if everything is at {0,0} (no preset), run a quick local layout on the visible subgraph
    quickLayoutIfStacked(cy);

    // color after initial view is set, to keep first paint quick
    const doColors = async () => {
      if (COLOR_MODE === 'degree') {
        status.set('Coloring by degree...');
        await applyDegreeColors(cy);
        status.showFor('Zoom in to view node labels', 5000);
      } else {
        applyTypeColors(cy);
      }
    };
    if (window.requestIdleCallback) requestIdleCallback(doColors, { timeout: 800 });
    else setTimeout(doColors, 200);

    // parse input/search query (supporting tag:, type:, free text) and call hook(in _standard renderer)
    // --- wire free-text search to standard scoper ---
    const searchInput = document.getElementById('textSearch');

    function debounce(fn, ms = 200){
      let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    // normalise a type token to our concise type keys
    function normType(s){
      s = String(s || '').toLowerCase();
      if (s === 'organisation' || s === 'organization' || s === 'orgs') return 'org';
      return s;
    }

    function buildSearchPredicate(query){

      // Ref: filter + input query logic applied
      // No filter type(s) selected + query --> results appear (plus neighbours if toggle on)
      // No type(s) + no query --> nothing (blank)
      // Type(s) selected--> type filter intersects with search

      const q = String(query || '').trim().toLowerCase();
      if (!q) return () => true;

      // tokens: free text + tag:foo + type:bar
      const parts = q.split(/\s+/g);

      const wantTags  = [];
      const wantTypes = [];
      const terms     = [];

      for (const p of parts){
        if (p.startsWith('tag:')) {
          const v = p.slice(4).trim();
          if (v) wantTags.push(v);
        } else if (p.startsWith('type:')) {
          const v = normType(p.slice(5).trim());
          if (v) wantTypes.push(v);
        } else {
          terms.push(p);
        }
      }

      return (n) => {
        const d = n.data() || {};
        const t = String(d.t || '').toLowerCase();

        // types from search are an *extra* constraint (independent of UI type filter)
        if (wantTypes.length && !wantTypes.includes(t)) return false;

        const tags = Array.isArray(d.tags) ? d.tags.map(s => String(s).toLowerCase())
                  : Array.isArray(d.fields?.tags) ? d.fields.tags.map(s => String(s).toLowerCase())
                  : [];

        // every tag: must be present
        for (const need of wantTags){
          if (!tags.includes(need)) return false;
        }

        // free-text across label, slug, summary, tags (joined)
        const hay = [
          d.label, d.slug, d.summary,
          (tags.length ? tags.join(' ') : '')
        ].filter(Boolean).join(' ').toLowerCase();

        // all terms must appear
        for (const term of terms){
          if (!hay.includes(term)) return false;
        }

        return true;
      };
    }

    if (searchInput && window.cy && typeof window.cy.__setSearchPredicate === 'function'){
      const apply = debounce(() => {
      const q = String(searchInput.value || '').trim();
      const pred = buildSearchPredicate(q);
      window.cy.__setSearchPredicate(pred, q.length > 0); // <— pass active flag

        // keep query in hash so can share state
        try {
          const val = String(searchInput.value || '').trim();
          
          if (val) location.hash = '#q=' + encodeURIComponent(val);
          else if (location.hash.startsWith('#q=')) history.replaceState(null, '', location.pathname + location.search);
        } catch(_) {}
      }, 200);

      searchInput.addEventListener('input', apply);

      // If URL hash has initial "#q=" apply it on load
      if (location.hash.startsWith('#q=')) {
        const q0 = decodeURIComponent(location.hash.slice(3));
        searchInput.value = q0;
        window.cy.__setSearchPredicate(buildSearchPredicate(q0), q0.trim().length > 0);
      }
    }

  });
})();
</script>




<!-- Submit suggested map [corrections](mailto:datatoinsight.enquiries@gmail.com?subject=CSC-MapOfTheWorld-CORRECTION&body=I%20suggest%20that%20the%20following%20needs%20correcting:) or data [additions](mailto:datatoinsight.enquiries@gmail.com?subject=CSC-MapOfTheWorld-DATA&body=I%20suggest%20that%20the%20Map%20should%20have%20the%20following%20added:)
 -->

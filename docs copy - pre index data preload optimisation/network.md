
# CSC Network Graph (IN DEV)

<!-- 1) mkdocs defaults, 2) css styled enlargement(not working), 3) forced full browswer win overlay --> 
<!-- <div id="cy" style="width: 100%; height: 600px;"></div> -->
<!-- <div id="cy"></div> --> 

This interactive graph is a work in progress mapping of key organisations, plans, and events and more that form the children’s services data ecosystem. It aims to provide both the simple connections and interelations between related CSC data work, projects, guidance, people and sub layer of detail and meta-data for those connected elements. 

This is a large scale mapping with many interconnected (moving)parts; currently a work-in-progress MVP. Data & relations are currently being added, graph layout and naming conventions for nodes in particular, is an ongoing discussion as we progress possible use-cases and standardise yml object structure.


<link rel="prefetch" href="data/degree.json" as="fetch" crossorigin>


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

  // status chip inside #cy, with fade
  function makeStatusChip() {
    const cyWrap = document.getElementById('cy');
    if (!cyWrap) return { set: ()=>{}, showFor: ()=>{}, hide: ()=>{} };
    cyWrap.style.position = 'relative';
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

  // wait for cy from render_graph_standard.js
  function whenCyReady(cb) {
    if (window.cy) return window.cy.ready(() => cb(window.cy));
    const start = Date.now();
    const t = setInterval(() => {
      if (window.cy) { clearInterval(t); window.cy.ready(() => cb(window.cy)); }
      if (Date.now() - start > 6000) { clearInterval(t); console.warn('Cytoscape not found'); status.set('Could not initialise graph'); }
    }, 50);
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
      const r = await fetch(new URL('data/degree.json', window.location.href).toString());
      if (!r.ok) throw new Error();
      degrees = await r.json();
    } catch { degrees = computeDegreesInBrowser(cy); }
    cy.batch(() => cy.nodes().forEach(n => n.data('deg', degrees[n.id()] ?? 0)));
    const maxDeg = Math.max(1, ...Object.values(degrees));
    cy.style().fromJson([{ selector: 'node', style: { 'background-color': `mapData(deg, 0, ${maxDeg}, #e0f3ff, #08519c)` } }]).update();
  }

  // --- new: scoped display logic for performance & correctness ---
  function applyScopedView(cy) {
    // source of truth for context: URL ?ctx=1 or checkbox state if present
    const ctxToggle = document.getElementById('contextModeToggle');
    const includeNeighbours = ctxToggle ? !!ctxToggle.checked : CTX_PARAM;

    const allowed = new Set(TYPES_PARAM); // e.g. {'org'}
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

    // Show only selected nodes and edges connecting them
    cy.batch(() => {
      cy.nodes().forEach(n => n.style('display', visible.has(n.id()) ? 'element' : 'none'));
      cy.edges().forEach(e => {
        const s = e.data('source'), t = e.data('target');
        const show = visible.has(s) && visible.has(t);
        e.style('display', show ? 'element' : 'none');
      });
    });

    // optional: thin edges further if too dense
    if (MAX_EDGES > 0) {
      const visEdges = cy.edges().filter(e => e.style('display') !== 'none');
      if (visEdges.length > MAX_EDGES) {
        // deterministically hide a tail to avoid jank
        const arr = visEdges.toArray();
        for (let i = MAX_EDGES; i < arr.length; i++) arr[i].style('display', 'none');
      }
    }

    // fit to currently visible core
    const core = cy.nodes().filter(n => n.style('display') !== 'none' && n.connectedEdges().length > 0);
    if (core.length) cy.fit(core, 16);
  }

  // wire the checkbox if present so the scope updates live
  function wireScopeUI(cy) {
    const ctxToggle = document.getElementById('contextModeToggle');
    if (ctxToggle) {
      ctxToggle.addEventListener('change', () => applyScopedView(cy), { passive: true });
    }
  }

  // drive status + apply scope + color after render
  whenCyReady(async (cy) => {
    status.set('Preparing initial view...');

    // first paint
    cy.once('render', () => status.set('Arranging layout...'));
    // layout may never fire in some setups, hide after a grace period
    const fallbackHide = setTimeout(() => status.showFor('Zoom in to view node labels', 5000), 6000);
    cy.once('layoutstop', () => { clearTimeout(fallbackHide); status.showFor('Zoom in to view node labels', 5000); });

    // enforce scoped view by default so non-org do not leak in
    applyScopedView(cy);
    wireScopeUI(cy);

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
  });
})();
</script>




<!-- Submit suggested map [corrections](mailto:datatoinsight.enquiries@gmail.com?subject=CSC-MapOfTheWorld-CORRECTION&body=I%20suggest%20that%20the%20following%20needs%20correcting:) or data [additions](mailto:datatoinsight.enquiries@gmail.com?subject=CSC-MapOfTheWorld-DATA&body=I%20suggest%20that%20the%20Map%20should%20have%20the%20following%20added:)
 -->

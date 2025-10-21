
# CSC Network Graph (IN DEV)

<!-- 1) mkdocs defaults, 2) css styled enlargement(not working), 3) forced full browswer win overlay --> 
<!-- <div id="cy" style="width: 100%; height: 600px;"></div> -->
<!-- <div id="cy"></div> --> 

This interactive graph is a work in progress mapping of key organisations, plans, and events and more that form the children’s services data ecosystem. It aims to provide both the simple connections and interelations between related CSC data work, projects, guidance, people and sub layer of detail and meta-data for those connected elements. 

This is a large scale mapping with many interconnected (moving)parts; currently a work-in-progress MVP. Data & relations are currently being added, graph layout and naming conventions for nodes in particular, is an ongoing discussion as we progress possible use-cases and standardise yml object structure.



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
<!-- add colouring to the standard renderer, default by type, switch with ?color=degree -->
<script>
(function () {
  // read mode from URL, e.g. ?color=degree
  const params = new URLSearchParams(location.search);
  const COLOR_MODE = (params.get('color') || 'type').toLowerCase(); // 'type' or 'degree'

  // wait for cy from render_graph_standard.js
  function whenCyReady(cb) {
    if (window.cy) {
      return window.cy.ready(() => cb(window.cy));
    }
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.cy) { clearInterval(timer); window.cy.ready(() => cb(window.cy)); }
      if (Date.now() - start > 4000) { clearInterval(timer); console.warn('Cytoscape not found'); }
    }, 50);
  }

  // compute degrees in-browser if degree.json is missing
  function computeDegreesInBrowser(cy) {
    const deg = {};
    cy.nodes().forEach(n => deg[n.id()] = 0);
    cy.edges().forEach(e => {
      const s = e.data('source'), t = e.data('target');
      if (deg[s] !== undefined) deg[s] += 1;
      if (deg[t] !== undefined) deg[t] += 1;
    });
    return deg;
  }

  // apply colouring by node type, palette matches explorer style
  function applyTypeColors(cy) {
    const typePalette = {
      organization: '#4c78a8',  // also used if you emit "organization"
      org:          '#4c78a8',  // legacy short form
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

  // apply colouring by degree using a data mapped gradient
  async function applyDegreeColors(cy) {
    let degrees = {};
    // network.md is at docs root, so data is 'data/...'
    const degreeUrl = new URL('data/degree.json', window.location.href).toString();
    try {
      const r = await fetch(degreeUrl);
      if (!r.ok) throw new Error('missing');
      degrees = await r.json();
    } catch {
      console.warn('degree.json not found, computing degrees in browser');
      degrees = computeDegreesInBrowser(cy);
    }

    // attach deg to node data for mapData
    cy.batch(() => {
      cy.nodes().forEach(n => n.data('deg', degrees[n.id()] ?? 0));
    });

    const maxDeg = Math.max(1, ...Object.values(degrees));
    cy.style().fromJson([
      { selector: 'node', style: { 'background-color': `mapData(deg, 0, ${maxDeg}, #e0f3ff, #08519c)` } }
    ]).update();
  }

  whenCyReady(async (cy) => {
    if (COLOR_MODE === 'degree') {
      await applyDegreeColors(cy);
    } else {
      applyTypeColors(cy);
    }
  });
})();
</script>



<!-- Submit suggested map [corrections](mailto:datatoinsight.enquiries@gmail.com?subject=CSC-MapOfTheWorld-CORRECTION&body=I%20suggest%20that%20the%20following%20needs%20correcting:) or data [additions](mailto:datatoinsight.enquiries@gmail.com?subject=CSC-MapOfTheWorld-DATA&body=I%20suggest%20that%20the%20Map%20should%20have%20the%20following%20added:)
 -->



<!-- Choices.js (CSS + JS) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css">
<script src="https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js"></script>

<!-- standard renderer -->
<script defer src="../js/render_graph_standard.js"></script>

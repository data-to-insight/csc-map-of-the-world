// docs/js/explorer.js
// Search-first Explorer: load small ego subgraphs on demand (starts blank|empty)



(function () {
  const cyContainer   = document.getElementById("cy");
  const searchInput   = document.getElementById("exploreSearch");
  const resultsEl     = document.getElementById("results");
  const clearBtn      = document.getElementById("clearGraph");
  const contextToggle = document.getElementById("contextModeToggle");

  if (!cyContainer) { console.error("Explorer: no #cy container found."); return; }

  // Paths: handle Git Pages subpath vs local mkdocs
  const GH_BASE  = "/csc-map-of-the-world/";
  const SITE_BASE = window.location.pathname.startsWith(GH_BASE) ? GH_BASE : "/";

  const DATA = {
    // cut down minimal info panel data
    liteIndexUrl: new URL(SITE_BASE + "data/lite_index.json", window.location.origin),
    // full info panel data 
    detailsUrl:   new URL(SITE_BASE + "data/node_details.json", window.location.origin),

    searchUrl:    new URL(SITE_BASE + "data/graph_search_index.json", window.location.origin),
    adjUrl:       new URL(SITE_BASE + "data/adjacency.json", window.location.origin)
  };


  const staticTypeColorMap = {
    organization:"#007acc", event:"#ff9800", person:"#4caf50", collection:"#9c27b0",
    plan:"#e91e63", rule:"#00bcd4", resource:"#8bc34a", service:"#ffc107", other:"#999999", org:"#007acc"
  };

  // helpers
  const debounce = (fn, ms=200) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };
  const esc = s => s==null ? "" : String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;","&gt;":">&gt;","\"":"&quot;","'":"&#39;"}[c]));

  // Small in-memory stores
  let LITE = {};   // {id:{id,l,t,s,x,y,sb?}} (info panel mini/lite details)
  let SEARCH = []; // [{id,l,t,s}]
  let ADJ = {};    // {id:[neighbourIds...]}
    let DETAILS = {};  // {id:{label,slug,type,summary,tags,website,projects,persons,...}} (info panel full details)


  // Cytoscape (blank start)
  const styles = [
    { selector:"node", style:{
      label:"data(label)",
      "text-valign":"center","color":"#000","font-size":12,"text-outline-width":0,
      "min-zoomed-font-size": 10
    }},
    ...Object.entries(staticTypeColorMap).map(([cls,color])=>({
      selector: `.${cls==="organization"?"org":cls}`,
      style: { "background-color": color, "background-opacity": 1 }
    })),
    { selector:"edge", style:{
      "width": 2, "line-color":"#aaa","target-arrow-color":"#aaa",
      "target-arrow-shape":"triangle","curve-style":"bezier"
    }},
    { selector:"node.match", style:{ "border-width": 3, "border-color":"#333" } }
  ];

  const cy = cytoscape({
    container: cyContainer,
    elements: [],
    layout: { name:"preset" }, // honour precomputed positions if available
    style: styles,
    renderer: {
      pixelRatio: 1,
      hideEdgesOnViewport: true,
      hideLabelsOnViewport: true,
      textureOnViewport: true,
      motionBlur: true
    }
  });

  // Edge tooltip (labels are heavy; show on hover instead (labels fine at <100 nodes, but not >1000+))
  const edgeTip = document.createElement("div");
  Object.assign(edgeTip.style, {
    position:"fixed", zIndex:9999, display:"none",
    padding:"4px 6px", background:"rgba(30,30,30,.85)", color:"#fff",
    borderRadius:"4px", fontSize:"12px", pointerEvents:"none"
  });
  document.body.appendChild(edgeTip);
  function moveTip(evt){
    const e = evt.originalEvent || {};
    edgeTip.style.left = ((e.clientX||0)+12)+"px";
    edgeTip.style.top  = ((e.clientY||0)+12)+"px";
  }
  cy.on("mouseover","edge", (evt)=>{ const lbl = evt.target.data("label"); if(lbl){ edgeTip.textContent=lbl; edgeTip.style.display="block"; moveTip(evt);} });
  cy.on("mousemove","edge", moveTip);
  cy.on("mouseout","edge", ()=> edgeTip.style.display="none");

  // Info panel (compact)
  let panel = document.getElementById("nodePanel");
  if (!panel) { panel = document.createElement("aside"); panel.id="nodePanel"; panel.className="node-panel"; document.body.appendChild(panel); }
  function openNodePanel(node) {
    const d = node.data();
    const id = d.id;

    const det  = (id && DETAILS && DETAILS[id]) || {};
    const lite = (id && LITE && LITE[id]) || {};

    const label =
      det.label ||
      d.label ||
      lite.l ||
      lite.label ||
      lite.name ||
      lite.title ||
      id;

    const slugVal =
      det.slug ||
      d.slug ||
      lite.slug ||
      lite.s ||
      "";

    const typeVal =
      (det.type || d.type || lite.t || "").toString().toUpperCase();

    const summary =
      det.summary ||
      det.description ||
      det.notes ||
      lite.summary ||
      lite.desc ||
      lite.description ||
      "";

    const tags = Array.isArray(det.tags)
      ? det.tags
      : (Array.isArray(lite.tags) ? lite.tags : []);

    const website = det.website || lite.website || "";

    const projects = Array.isArray(det.projects) ? det.projects : [];
    const persons  = Array.isArray(det.persons)  ? det.persons  : [];

    const orgType   = det.organisation_type || det.organization_type || "";
    const region    = det.region || "";
    const published = det.published || det.date_published || det.date || "";

    const pageUrl = det.page_url || "";
    const hasPage = typeof pageUrl === "string" && pageUrl.trim() !== "";

    const base = s => (s ? String(s).split("/").filter(Boolean).pop() : "");
    const queryTerm = (label && label.trim()) || base(slugVal) || id;
    const searchUrl = `${SITE_BASE}search/?q=${encodeURIComponent(queryTerm)}`;

    panel.innerHTML = `
      <div class="node-panel-inner">
        <div class="row" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h3>${esc(label || id)}</h3>
            ${slugVal ? `<div class="meta">${esc(slugVal)}</div>` : ""}
          </div>
          <button id="panelClose">✕</button>
        </div>

        ${summary
          ? `<div class="row">
               <div class="subhead"><strong>Summary</strong></div>
               <div class="node-summary">${esc(summary)}</div>
             </div>`
          : ""}

        <div class="row">
          <table>
            <tbody>
              ${typeVal ? `
                <tr>
                  <td>Type</td>
                  <td>${esc(typeVal)}</td>
                </tr>` : ""}
              ${slugVal ? `
                <tr>
                  <td>Slug</td>
                  <td>${esc(slugVal)}</td>
                </tr>` : ""}
              ${website ? `
                <tr>
                  <td>Website</td>
                  <td>
                    <a href="${esc(website)}" target="_blank" rel="noopener">
                      ${esc(website)}
                    </a>
                  </td>
                </tr>` : ""}
              ${published ? `
                <tr>
                  <td>Published</td>
                  <td>${esc(published)}</td>
                </tr>` : ""}
              ${region ? `
                <tr>
                  <td>Region</td>
                  <td>${esc(region)}</td>
                </tr>` : ""}
              ${orgType ? `
                <tr>
                  <td>Organisation type</td>
                  <td>${esc(orgType)}</td>
                </tr>` : ""}
              <tr>
                <td>Id</td>
                <td>${esc(id)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${tags && tags.length
          ? `<div class="row tags">
               <div class="subhead"><strong>Tags</strong></div>
               ${tags
                 .map(t => t ? `<span>${esc(t)}</span>` : "")
                 .join("")}
             </div>`
          : ""}

        ${projects && projects.length
          ? `<div class="row node-projects">
               <div class="subhead"><strong>Projects</strong></div>
               <div>${projects.map(p => esc(p || "")).filter(Boolean).join(", ")}</div>
             </div>`
          : ""}

        ${persons && persons.length
          ? `<div class="row node-persons">
               <div class="subhead"><strong>People</strong></div>
               <ul>
                 ${persons.map(p => {
                   const name = p.name || "";
                   const role = p.role || "";
                   const from = p.from || "";
                   const bits = [
                     name ? esc(name) : "",
                     role ? ` (${esc(role)})` : "",
                     from ? ` ${esc(from)}` : ""
                   ].join("");
                   return bits ? `<li>${bits}</li>` : "";
                 }).join("")}
               </ul>
             </div>`
          : ""}

        <div class="row toolbar">
          <a href="${esc(searchUrl)}">Search</a>
          ${hasPage ? `<span>|</span><a href="${esc(pageUrl)}">Details</a>` : ""}
        </div>
      </div>
    `;
    panel.classList.add("open");
  }

  function closeNodePanel(){ panel.classList.remove("open"); }
  document.addEventListener("click",(ev)=>{
    if (ev.target.id==="panelClose" || ev.target.closest("#panelClose")) { ev.preventDefault(); closeNodePanel(); }
  });
  cy.on("tap","node",(e)=> openNodePanel(e.target));

  // Converters
  function toCyNode(id){
    const n = LITE[id];
    if (!n) return null;
    const d = { id:n.id, label:n.l, type:n.t, slug:n.s||"" };
    const cls = (n.t==="organization"?"org":n.t);
    return (n.x!=null && n.y!=null)
      ? { data:d, classes:cls, position:{x:n.x,y:n.y} }
      : { data:d, classes:cls };
  }
  function toCyEdge(a,b,label=""){ return { data:{ source:a, target:b, label } }; }

  // Add ego graph for node (k hops)

  const added = new Set();      // node ids already in cy
  //const addedEdges = new Set(); // undirected edge keys already in cy
  // addedEdges persists across calls, clicking Add +1 hop multiple times or using Add +2 hops doesnt re create same edge


  function addEgo(rootId, hops = 1) {
    if (!LITE[rootId]) return;

    const queue = [[rootId, 0]];
    const seen = new Set([rootId]);
    const nodesToAdd = new Set([rootId]);
    const edgesToAdd = [];

    // Breadth first search out to given hop depth
    while (queue.length) {
      const [id, depth] = queue.shift();
      if (depth >= hops) continue;
      const nbrs = ADJ[id] || [];
      for (const nb of nbrs) {
        if (!LITE[nb]) continue;
        nodesToAdd.add(nb);
        edgesToAdd.push([id, nb]);
        if (!seen.has(nb)) {
          seen.add(nb);
          queue.push([nb, depth + 1]);
        }
      }
    }

    // Prepare nodes to add, still respecting <added> set
    const cyNodes = [];
    for (const id of nodesToAdd) {
      if (!added.has(id)) {
        const e = toCyNode(id);
        if (e) cyNodes.push(e);
        added.add(id);
      }
    }

    // Build set of existing edge keys from current graph
    const existingEdgeKeys = new Set();
    cy.edges().forEach(edge => {
      const src = edge.data("source");
      const tgt = edge.data("target");
      if (src == null || tgt == null) return;
      const a = String(src);
      const b = String(tgt);
      const key = a < b ? `${a}::${b}` : `${b}::${a}`;
      existingEdgeKeys.add(key);
    });

    // Deduplicate new edges against already in graph
    const cyEdges = [];
    for (const [aRaw, bRaw] of edgesToAdd) {
      if (aRaw == null || bRaw == null) continue;
      const a = String(aRaw);
      const b = String(bRaw);
      const key = a < b ? `${a}::${b}` : `${b}::${a}`;
      if (existingEdgeKeys.has(key)) continue;
      existingEdgeKeys.add(key);
      cyEdges.push(toCyEdge(aRaw, bRaw, ""));
    }

    if (cyNodes.length || cyEdges.length) {
      cy.batch(() => cy.add([...cyNodes, ...cyEdges]));

      // If any new nodes have no preset position, run small layout on just added elements
      if (!cyNodes.every(n => n.position)) {
        cy.layout({
          name: "cose",
          animate: false,
          nodeDimensionsIncludeLabels: true
        }).run();
      }

      // Important, tell Cytoscape the container size/position may have changed
      // this stops mouse position being out of alignment with graph node positions
      cy.resize();

      // fit to content
      cy.fit(cy.elements(), 50);
    }
  }



  // Append/replace behaviour (Keep neighbours toggle)
  let appendMode = !!(contextToggle && contextToggle.checked);
  if (contextToggle) {
    contextToggle.checked = false; // default OFF
    appendMode = false;
    contextToggle.addEventListener("change", ()=> { appendMode = contextToggle.checked; });
  }

  // Clear button
  clearBtn?.addEventListener("click", ()=>{
    cy.elements().remove();
    added.clear();
    resultsEl.style.display = "none";
    if (searchInput) searchInput.value = "";
    closeNodePanel();
  });

  // Search UI
  // incls 3 hop options in result-actions
  function renderResults(items){
    resultsEl.innerHTML = "";
    if (!items.length) { resultsEl.style.display = "none"; return; }
    for (const it of items.slice(0, 30)) {
      const row = document.createElement("div");
      row.className = "result-item";
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.padding = ".25rem .5rem";
      row.style.borderTop = "1px solid #eee";
      row.innerHTML = `
        <div>
          <strong>${esc(it.l)}</strong>
          <span class="badge" style="margin-left:.25rem; font-size:12px; color:#555;">${esc(it.t)}</span>
          <div style="font-size:12px;color:#666;">${esc(it.id)}</div>
        </div>
        <div class="result-actions">
          <button class="explore-btn" data-add="${esc(it.id)}">Add</button>
          <button class="explore-btn" data-add1h="${esc(it.id)}">Add +1 hop</button>
          <button class="explore-btn" data-add2h="${esc(it.id)}">Add +2 hops</button>
        </div>
      `;
      resultsEl.appendChild(row);
    }
    resultsEl.style.display = "block";
  }


  function doSearch(q){
    q = (q||"").trim().toLowerCase();

    // Reset any left over type operators for clean search-first
    // remove tokens "type:org" or "type:plan"
    q = q.split(/\s+/).filter(tok => !/^type:/i.test(tok)).join(" ");

    if (!q) { resultsEl.style.display="none"; return; }
    const hits = SEARCH.filter(d =>
      (d.l && d.l.toLowerCase().includes(q)) ||
      (d.id && d.id.toLowerCase().includes(q)) ||
      (d.s && d.s.toLowerCase().includes(q))
    );
    renderResults(hits);
  }

  // Click handlers: honour appendMode
  // called from renderResults / 3 hop optoins
  // Click handlers, honour appendMode
  resultsEl.addEventListener("click", (ev) => {
    const add   = ev.target.getAttribute("data-add");
    const add1h = ev.target.getAttribute("data-add1h");
    const add2h = ev.target.getAttribute("data-add2h");
    const chosenId = add || add1h || add2h;
    const willAppend = appendMode; // when OFF, we replace

    if (chosenId) {
      if (!willAppend) {
        cy.elements().remove();
        added.clear();
        closeNodePanel();
      }

      if (add)   { addEgo(add, 0); }   // node only
      if (add1h) { addEgo(add1h, 1); } // root plus 1 hop
      if (add2h) { addEgo(add2h, 2); } // root plus 2 hops

      // After adding to graph, keep only this row visible
      // calls renderResults([chosen]) so list collapses down to just select entry
      const chosen = SEARCH.find(d => d.id === chosenId);
      if (chosen) {
        renderResults([chosen]);
        // resultsEl.style.display = "none" // hide all reseults row once 1 selected/clicked
      }
    }
  });


 

  // Enter key = add first result (0-hop if OFF, 1-hop if ON)
  searchInput?.addEventListener("keydown", (e)=>{
    if (e.key !== "Enter") return;
    const first = resultsEl.querySelector(".result-item button[data-add]") || null;
    const firstId = first?.getAttribute("data-add");
    if (firstId) {
      if (!appendMode) { cy.elements().remove(); added.clear(); closeNodePanel(); }
      addEgo(firstId, appendMode ? 1 : 0);
    }
  });

  searchInput?.addEventListener("input", debounce(e=> doSearch(e.target.value), 150));

  // Load assets
  // explorer still works if richer node_details.json missing, but uses it if found
  Promise.all([
    fetch(DATA.liteIndexUrl).then(r => r.json()),
    fetch(DATA.searchUrl).then(r => r.json()),
    fetch(DATA.adjUrl).then(r => r.json()),
    fetch(DATA.detailsUrl)
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => ({})) // tolerate missing details file
  ]).then(([lite, idx, adj, details]) => {
    LITE = lite || {};
    SEARCH = Array.isArray(idx) ? idx : [];
    ADJ = adj || {};
    DETAILS = details || {};
    console.log("Explorer assets:", {
      nodes: Object.keys(LITE).length,
      search_docs: SEARCH.length,
      details: Object.keys(DETAILS).length
    });
  }).catch(err => {
    console.error("Failed to load explorer assets:", err);
    cyContainer.innerHTML = "<p style='color:red;'>Could not load explorer assets.</p>";
  });
})();

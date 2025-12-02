// docs/js/explorer.js

// Search-first Explorer: load small ego subgraphs on demand (faster, static)

(function () {
  const cyContainer   = document.getElementById("cy");
  const searchInput   = document.getElementById("exploreSearch");
  const resultsEl     = document.getElementById("results");
  const clearBtn      = document.getElementById("clearGraph");
  const contextToggle = document.getElementById("contextModeToggle");

  if (!cyContainer) {
    console.error("Explorer: no #cy container found.");
    return;
  }


  // base path: repo subpath if present (GitHub Pages), else root (MkDocs serve)
    const GH_BASE = "/csc-map-of-the-world/";
    const SITE_BASE = window.location.pathname.startsWith(GH_BASE) ? GH_BASE : "/";

    const DATA = {
    liteIndexUrl: new URL(SITE_BASE + "data/lite_index.json", window.location.origin),
    searchUrl:    new URL(SITE_BASE + "data/search_index.json", window.location.origin),
    adjUrl:       new URL(SITE_BASE + "data/adjacency.json", window.location.origin)
    };


//   // Compute SITE_BASE robustly using known data path
//   const probe = new URL("csc-map-of-the-world/data/graph_data.lite.json", window.location.origin);
//   const SITE_BASE = probe.pathname.replace(/data\/graph_data(?:\.lite)?\.json$/, "");

//   const DATA = {
//     liteIndexUrl: new URL(SITE_BASE + "data/lite_index.json", window.location.origin),
//     searchUrl:    new URL(SITE_BASE + "data/search_index.json", window.location.origin),
//     adjUrl:       new URL(SITE_BASE + "data/adjacency.json", window.location.origin)
//   };


  const staticTypeColorMap = {
    organization:"#007acc", event:"#ff9800", person:"#4caf50", collection:"#9c27b0",
    plan:"#e91e63", rule:"#00bcd4", resource:"#8bc34a", service:"#ffc107", other:"#999999", org:"#007acc"
  };

  // helpers
  const debounce = (fn, ms=200) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };
  const esc = s => s==null ? "" : String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  // Data caches
  let LITE = {};            // {id:{id,l,t,s,x,y,sb?}}
  let SEARCH = [];          // [{id,l,t,s}]
  let ADJ = {};             // {id:[neighbors...]}

  // Cytoscape (empty start)
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
    { selector:"node.match", style:{
      "border-width": 3,"border-color":"#333"
    }}
  ];

  const cy = cytoscape({
    container: cyContainer,
    elements: [],
    layout: { name:"preset" }, // set positions from LITE if present
    style: styles,
    renderer: {
      pixelRatio: 1,
      hideEdgesOnViewport: true,
      hideLabelsOnViewport: true,
      textureOnViewport: true,
      motionBlur: true
    }
  });

  // sm edge tooltip
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

  // Info panel 
  let panel = document.getElementById("nodePanel");
  if (!panel) { panel = document.createElement("aside"); panel.id="nodePanel"; panel.className="node-panel"; document.body.appendChild(panel); }

  function openNodePanel(node){
    const d = node.data();
    const base = s => (s? String(s).split("/").filter(Boolean).pop() : "");
    const queryTerm = (d.label && d.label.trim()) || base(d.slug) || d.id;
    const searchUrl = `${SITE_BASE}search/?q=${encodeURIComponent(queryTerm)}`;
    const pageUrl   = d.slug ? `${SITE_BASE}${String(d.slug).replace(/^\/+/,"")}/` : "";

    panel.innerHTML = `
      <div class="row" style="display:flex;justify-content:space-between;align-items:center;">
        <h3>${esc(d.label || d.id)}</h3>
        <button id="panelClose">✕</button>
      </div>
      <div class="meta">${esc((d.type||"").toLowerCase())}</div>
      <div class="row">${esc((d.summary||"")).slice(0,800)}</div>
      <div class="row toolbar" style="display:flex; gap:8px; margin-top:10px;">
        <a href="${esc(searchUrl)}">Search</a>
        ${pageUrl ? `&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${esc(pageUrl)}">Open details</a>` : ""}
      </div>
    `;
    panel.classList.add("open");
  }
  function closeNodePanel(){ panel.classList.remove("open"); }

  document.addEventListener("click",(ev)=>{
    if (ev.target.id==="panelClose" || ev.target.closest("#panelClose")) { ev.preventDefault(); closeNodePanel(); }
  });
  cy.on("tap","node",(e)=> openNodePanel(e.target));

  // Convert helpers
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

  // Add ego graph for node (1 hop by default)
  const added = new Set(); // node ids already in CY
  function addEgo(rootId, hops=1){
    if (!LITE[rootId]) return;

    // BFS up to k hops
    const queue = [[rootId,0]];
    const seen  = new Set([rootId]);
    const nodesToAdd = new Set([rootId]);
    const edgesToAdd = [];

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
          queue.push([nb, depth+1]);
        }
      }
    }

    const cyNodes = [];
    for (const id of nodesToAdd) {
      if (!added.has(id)) {
        const e = toCyNode(id);
        if (e) cyNodes.push(e);
        added.add(id);
      }
    }
    const cyEdges = edgesToAdd.map(([a,b]) => toCyEdge(a,b,""));

    if (cyNodes.length || cyEdges.length) {
      cy.batch(()=> cy.add([...cyNodes, ...cyEdges]));
      // cheap layout: do nothing if positions exist; otherwise do small cose on new bits
      if (!cyNodes.every(n=>n.position)) {
        cy.layout({ name:"cose", animate:false, nodeDimensionsIncludeLabels:true }).run();
      }
      cy.fit(cy.elements(), 50);
    }
  }

  // Clear button
  clearBtn?.addEventListener("click", ()=>{
    cy.elements().remove();
    added.clear();
    resultsEl.style.display = "none";
    searchInput.value = "";
    closeNodePanel();
  });

  // Context toggle only used when later decide to keep neighbours on match,
  // here we’re selecting specific nodes, so default it off but wired for later:
  if (contextToggle) contextToggle.checked = false;

  // Search UI (substring match on label; add button per result)
  function renderResults(items){
    resultsEl.innerHTML = "";
    if (!items.length) { resultsEl.style.display = "none"; return; }
    for (const it of items.slice(0, 30)) {
      const row = document.createElement("div");
      row.className = "result-item";
      row.innerHTML = `
        <div>
          <strong>${esc(it.l)}</strong>
          <span class="badge">${esc(it.t)}</span>
          <div style="font-size:12px;color:#666;">${esc(it.id)}</div>
        </div>
        <div>
          <button data-add="${esc(it.id)}">Add</button>
          <button data-add1h="${esc(it.id)}" style="margin-left:.25rem;">Add +1 hop</button>
        </div>
      `;
      resultsEl.appendChild(row);
    }
    resultsEl.style.display = "block";
  }

  function doSearch(q){
    q = (q||"").trim().toLowerCase();
    if (!q) { resultsEl.style.display="none"; return; }
    const hits = SEARCH.filter(d =>
      (d.l && d.l.toLowerCase().includes(q)) ||
      (d.id && d.id.toLowerCase().includes(q)) ||
      (d.s && d.s.toLowerCase().includes(q))
    );
    renderResults(hits);
  }

  resultsEl.addEventListener("click",(ev)=>{
    const add   = ev.target.getAttribute("data-add");
    const add1h = ev.target.getAttribute("data-add1h");
    if (add)   { addEgo(add, 0); }     // just node (0-hop means node itself)
    if (add1h) { addEgo(add1h, 1); }   // include neighbours
  });

  searchInput?.addEventListener("input", debounce(e=> doSearch(e.target.value), 150));

  // Load all three small(er) files
  Promise.all([
    fetch(DATA.liteIndexUrl).then(r=>r.json()),
    fetch(DATA.searchUrl).then(r=>r.json()),
    fetch(DATA.adjUrl).then(r=>r.json())
  ]).then(([lite, idx, adj])=>{
    LITE = lite;
    SEARCH = idx;
    ADJ = adj;

    // starter: focus orgs only label "DfE" etc if user types;
    // otherwise do nothing on load (blank canvas)
    console.log("Explorer assets loaded:", {
      nodes: Object.keys(LITE).length,
      search_docs: SEARCH.length
    });
  }).catch(err=>{
    console.error("Failed to load explorer assets:", err);
    cyContainer.innerHTML = "<p style='color:red;'>Could not load explorer assets.</p>";
  });
})();

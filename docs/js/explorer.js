// docs/js/explorer.js
// Search-first Explorer: load small ego subgraphs on demand (blank start)

(function () {
  const cyContainer   = document.getElementById("cy");
  const searchInput   = document.getElementById("exploreSearch");
  const resultsEl     = document.getElementById("results");
  const clearBtn      = document.getElementById("clearGraph");
  const contextToggle = document.getElementById("contextModeToggle");

  if (!cyContainer) { console.error("Explorer: no #cy container found."); return; }

  // Paths: handle GitHub Pages subpath vs local mkdocs
  const GH_BASE  = "/csc-map-of-the-world/";
  const SITE_BASE = window.location.pathname.startsWith(GH_BASE) ? GH_BASE : "/";

  const DATA = {
    liteIndexUrl: new URL(SITE_BASE + "data/lite_index.json", window.location.origin),
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
  let LITE = {};   // {id:{id,l,t,s,x,y,sb?}}
  let SEARCH = []; // [{id,l,t,s}]
  let ADJ = {};    // {id:[neighbourIds...]}

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
    layout: { name:"preset" }, // honour precomputed positions if present
    style: styles,
    renderer: {
      pixelRatio: 1,
      hideEdgesOnViewport: true,
      hideLabelsOnViewport: true,
      textureOnViewport: true,
      motionBlur: true
    }
  });

  // Edge tooltip (labels are heavy; show on hover)
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
  const added = new Set(); // node ids already in cy
  function addEgo(rootId, hops=1){
    if (!LITE[rootId]) return;

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
        if (!seen.has(nb)) { seen.add(nb); queue.push([nb, depth+1]); }
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
      // If any new nodes have no preset position, run a small layout on just-added elements
      if (!cyNodes.every(n=>n.position)) {
        cy.layout({ name:"cose", animate:false, nodeDimensionsIncludeLabels:true }).run();
      }
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

    // Reset any lingering type operators for clean search-first
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
  resultsEl.addEventListener("click",(ev)=>{
    const add   = ev.target.getAttribute("data-add");
    const add1h = ev.target.getAttribute("data-add1h");
    const willAppend = appendMode; // when OFF, we replace
    if (add || add1h) {
      if (!willAppend) { cy.elements().remove(); added.clear(); closeNodePanel(); }
      if (add)   { addEgo(add, 0); }     // node only
      if (add1h) { addEgo(add1h, 1); }   // + 1 hop
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
  Promise.all([
    fetch(DATA.liteIndexUrl).then(r=>r.json()),
    fetch(DATA.searchUrl).then(r=>r.json()),
    fetch(DATA.adjUrl).then(r=>r.json())
  ]).then(([lite, idx, adj])=>{
    LITE = lite || {};
    SEARCH = Array.isArray(idx) ? idx : [];
    ADJ = adj || {};
    console.log("Explorer assets:", { nodes:Object.keys(LITE).length, search_docs:SEARCH.length });
  }).catch(err=>{
    console.error("Failed to load explorer assets:", err);
    cyContainer.innerHTML = "<p style='color:red;'>Could not load explorer assets.</p>";
  });
})();

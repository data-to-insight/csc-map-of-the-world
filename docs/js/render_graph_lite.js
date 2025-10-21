// SUMMARY: Large-graph friendly renderer (lite) 
// Key fixes:
// - Load/enhance Choices.js *before* data fetch (no basic select shows)
// - Guard against dup initialisation
// - Keep org-only boot + context toggle default OFF
// - Works with graph_data.lite.json (+ fall back if old shape)


document.addEventListener("DOMContentLoaded", function () {
  // --- DOM hooks ---
  const cyContainer  = document.getElementById("cy");
  const typeFilter   = document.getElementById("typeFilter");
  const resetBtn     = document.getElementById("resetView");
  const textSearch   = document.getElementById("textSearch");
  const contextToggle= document.getElementById("contextModeToggle");
  if (!cyContainer) return console.error("No #cy element found");

  // --- Data URL + SITE_BASE ---
  const GRAPH_VER = "2025-03-05-03"; // bump to bust caches
  const graphDataURL = new URL("csc-map-of-the-world/data/graph_data.lite.json", window.location.origin);
  graphDataURL.searchParams.set("v", GRAPH_VER);
  // Support .../graph_data.json and .../graph_data.lite.json
  const SITE_BASE = graphDataURL.pathname.replace(/data\/graph_data(?:\.lite)?\.json$/, "");

  // --- Colours by class ---
  const staticTypeColorMap = {
    organization:"#007acc", event:"#ff9800", person:"#4caf50", collection:"#9c27b0",
    plan:"#e91e63", rule:"#00bcd4", resource:"#8bc34a", service:"#ffc107", other:"#999999"
  };

  // --- Choices loader (defensive; loads CSS+JS if missing) ---
  function ensureChoices(cb) {
    if (typeof Choices === "function") { cb(); return; }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js";
    s.onload = cb;
    document.head.appendChild(s);
  }

  // --- Helpers ---
  function debounce(fn, ms = 150){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
  const esc = (s)=> s==null ? "" : String(s).replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  function normaliseTypeToken(t){ const m=(t||"").toLowerCase(); return (m==="org"||m==="organisation"||m==="organization")?"org":m; }
  function parseQuery(q){
    const out={text:[],tag:[],type:[]};
    (q||"").split(/\s+/).forEach(tok=>{
      if(!tok) return;
      if(tok.startsWith("tag:")) out.tag.push(tok.slice(4).toLowerCase());
      else if(tok.startsWith("type:")) out.type.push(normaliseTypeToken(tok.slice(5)));
      else out.text.push(tok.toLowerCase());
    });
    return out;
  }
  function readStateFromHash(){
    const p=new URLSearchParams((location.hash||"").replace(/^#/,""));
    const types=(p.get("types")||"").split(",").map(s=>s.trim()).filter(Boolean);
    const q=p.get("q")||p.get("query")||"";
    return {types,q};
  }
  function updateHash(types,q){
    const params=new URLSearchParams();
    if(types&&types.length) params.set("types", types.join(","));
    if(q) params.set("q", q);
    const str=params.toString();
    if(str) location.hash=str; else history.replaceState(null,"",location.pathname+location.search);
  }

  // --- Edge tooltip (labels are heavy; show on hover) ---
  const edgeTip = document.createElement("div");
  edgeTip.id = "edgeTip";
  Object.assign(edgeTip.style, {
    position:"fixed", zIndex: 9999, display:"none",
    padding:"4px 6px", background:"rgba(30,30,30,.85)", color:"#fff",
    borderRadius:"4px", fontSize:"12px", pointerEvents:"none"
  });
  document.body.appendChild(edgeTip);
  function moveTip(evt){
    const e = evt.originalEvent;
    const x = (e && e.clientX) || 0;
    const y = (e && e.clientY) || 0;
    edgeTip.style.left = (x+12)+"px";
    edgeTip.style.top  = (y+12)+"px";
  }

  // --- In-memory graph store (lite shape) ---
  let allNodes = [];         // {id,l,t,s?,x?,y?,sb?}
  let allEdges = [];         // {source,target,label?}
  const nodeById = new Map();
  const byType   = {};       // { org:[...], plan:[...], ... }
  const loadedTypes = new Set();
  const addedIds    = new Set();

  // --- Load graph JSON ---
  fetch(graphDataURL).then(r=>{
    if(!r.ok) throw new Error("HTTP "+r.status);
    return r.json();
  }).then(raw=>{
    // Normalise to lite arrays if old shape
    if (Array.isArray(raw?.elements)) {
      const nodes = raw.elements.filter(e=>e.group==="nodes").map(e=>{
        const d = e.data||{};
        const cls = (e.classes||"").trim() || ((d.type||"").toLowerCase()==="organization"?"org":(d.type||"").toLowerCase());
        const pos = e.position || undefined;
        return { id:d.id, l:d.label, t: cls==="organization"?"org":cls, s:d.slug||d.page_url||"", x:pos?.x, y:pos?.y, sb:(d.search_blob||"") };
      });
      const edges = raw.elements.filter(e=>e.group==="edges").map(e=>{
        const d=e.data||{};
        return [d.source, d.target, d.label||""];
      });
      raw = { nodes, edges };
    }

    // Fill indexes
    allNodes = (raw.nodes||[]).map(n=>{
      const t = (n.t==="organization"?"org":n.t)||"other";
      const obj = { id:n.id, l:n.l, t, s:n.s||"", x:n.x, y:n.y, sb:n.sb||"" };
      nodeById.set(obj.id, obj);
      if (!byType[t]) byType[t] = [];
      byType[t].push(obj);
      return obj;
    });
    allEdges = (raw.edges||[]).map(e=>({ source:e[0], target:e[1], label:e[2]||"" }));

    // --- Cytoscape init (empty; we add chunks) ---
    const dynamicNodeStyles = Object.entries(staticTypeColorMap).map(([cls,color])=>({
      selector: `.${cls==="organization"?"org":cls}`,
      style: { "background-color": color, "background-opacity": 1 }
    }));
    const cy = cytoscape({
      container: cyContainer,
      elements: [],
      layout: { name:"preset" },
      style: [
        { selector:"node", style:{
          label:"data(label)",
          "text-valign":"center","color":"#000","font-size":12,"text-outline-width":0,
          "min-zoomed-font-size": 10
        }},
        ...dynamicNodeStyles,
        { selector:"edge", style:{
          "width": 2, "line-color":"#aaa","target-arrow-color":"#aaa",
          "target-arrow-shape":"triangle","curve-style":"bezier"
        }},
        { selector:"node.match", style:{
          "border-width": 3,"border-color":"#333"
          // (omit shadow-* properties; invalid in Cytoscape)
        }}
      ],
      renderer: { pixelRatio: 1, hideEdgesOnViewport: true, hideLabelsOnViewport: true, textureOnViewport: true, motionBlur: true }
    });

    // Edge tooltips
    cy.on("mouseover","edge", (evt)=>{
      const lbl = evt.target.data("label");
      if (lbl) { edgeTip.textContent = lbl; edgeTip.style.display="block"; moveTip(evt); }
    });
    cy.on("mousemove","edge", moveTip);
    cy.on("mouseout","edge", ()=>{ edgeTip.style.display="none"; });

    // Side panel (compact, same as standard)
    const relatedURL = new URL("csc-map-of-the-world/data/related_nodes.json", window.location.origin);
    fetch(relatedURL).then(r=>r.ok?r.json():{}).then(obj=>{ window.__relatedIndex=obj||{}; })
                     .catch(()=>{ window.__relatedIndex={}; });

    let panel = document.getElementById("nodePanel");
    if (!panel) { panel = document.createElement("aside"); panel.id="nodePanel"; panel.className="node-panel"; document.body.appendChild(panel); }
    function openNodePanel(node){
      if(!panel) return;
      const d = node.data();
      const tagsHtml  = (d.tags || []).map(t=>`<span>#${t}</span>`).join("");
      const pageUrl = d.page_url ? `${SITE_BASE}${String(d.page_url).replace(/^\/+/, "")}` :
                        (d.slug ? `${SITE_BASE}${String(d.slug).replace(/^\/+/, "")}/` : "");
      const base = (s)=> (s? String(s).split("/").filter(Boolean).pop() : "");
      const queryTerm = (d.label && d.label.trim()) || base(d.slug||d.page_url) || (d.id||"");
      const searchUrl = `${SITE_BASE}search/?q=${encodeURIComponent(queryTerm)}`;
      const hasRelated = window.__relatedIndex && d.slug && window.__relatedIndex[d.slug];

      panel.innerHTML = `
        <div class="row" style="display:flex; justify-content: space-between; align-items:center;">
          <h3>${d.label || d.slug || d.id || "(untitled)"}</h3>
          <button id="panelClose">✕</button>
        </div>
        <div class="meta">${(d.type||"").toLowerCase()}</div>
        <div class="row">${(d.summary||"").slice(0,800)}</div>
        <div class="row tags">${tagsHtml}</div>
        <div class="row toolbar" style="display:flex; gap:8px; margin-top:10px;">
          <a href="${searchUrl}">Search</a>
          ${pageUrl ? `&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${pageUrl}">Open details</a>` : ""}
          ${hasRelated ? `<button data-related-slug="${d.slug}">Show related</button>` : ""}
        </div>
      `;
      panel.classList.add("open");
      panel.style.transform = "translateX(0)";
      panel.style.display = "block";
    }
    function closeNodePanel(){ if(!panel) return; panel.classList.remove("open"); panel.style.transform="translateX(110%)"; panel.style.display=""; }
    document.addEventListener("click",(ev)=>{
      if (ev.target.id==="panelClose" || ev.target.closest("#panelClose")) { ev.preventDefault(); closeNodePanel(); return; }
      const btn = ev.target.closest("button[data-related-slug]");
      if (btn && window.__relatedIndex) {
        const slug = btn.getAttribute("data-related-slug");
        const rel = (window.__relatedIndex[slug]||[]).map(r=>r.slug);
        filterToRelated(rel);
      }
    });
    cy.on("tap","node",(e)=>openNodePanel(e.target));

    // Conversion helpers
    function toCyNode(n){
      const data = { id:n.id, label:n.l, type:n.t, slug:n.s||"", search_blob:n.sb||"" };
      if (n.x!=null && n.y!=null) return { data, classes:(n.t==="organization"?"org":n.t), position:{x:n.x,y:n.y} };
      return { data, classes:(n.t==="organization"?"org":n.t) };
    }
    function toCyEdge(e){ return { data:{ source:e.source, target:e.target, label:e.label||"" } }; }

    // Chunked add + debounced layout to avoid pile-up
    function addInChunks(elems, chunk=1200, afterAll){
      let i = 0;
      (function step(){
        const slice = elems.slice(i, i+chunk);
        if (!slice.length) { if (afterAll) afterAll(); return; }
        cy.batch(()=> cy.add(slice));
        i += chunk;
        requestAnimationFrame(step);
      })();
    }
    const runLayout = debounce(()=>{
      cy.layout({
        name:"cose", animate:true, padding:50,
        boundingBox:{ x1:0, y1:0, x2:cyContainer.clientWidth, y2:cyContainer.clientHeight-200 },
        fit:false, nodeDimensionsIncludeLabels:true
      }).run();
    }, 60);

    // Load a class + incident edges + counterpart nodes so edges render
    function ensureTypeLoaded(typeCls){
      if (loadedTypes.has(typeCls)) return;
      const newNodes = (byType[typeCls]||[]).filter(n=>!addedIds.has(n.id));

      const toAddNodesMap = new Map();
      newNodes.forEach(n=>toAddNodesMap.set(n.id, n));

      const incidentEdges = [];
      for (const e of allEdges) {
        const srcIn = toAddNodesMap.has(e.source);
        const tgtIn = toAddNodesMap.has(e.target);
        if (srcIn || tgtIn) {
          incidentEdges.push(e);
          if (!toAddNodesMap.has(e.source)) {
            const nn = nodeById.get(e.source);
            if (nn && !addedIds.has(nn.id)) toAddNodesMap.set(nn.id, nn);
          }
          if (!toAddNodesMap.has(e.target)) {
            const nn = nodeById.get(e.target);
            if (nn && !addedIds.has(nn.id)) toAddNodesMap.set(nn.id, nn);
          }
        }
      }

      const toAddNodes = Array.from(toAddNodesMap.values());
      toAddNodes.forEach(n=>addedIds.add(n.id));
      loadedTypes.add(typeCls);
      addInChunks([...toAddNodes.map(toCyNode), ...incidentEdges.map(toCyEdge)], 1200, runLayout);
    }

    // Legend + status (no global :visible scans)
    const legendBlock = document.createElement("details");
    legendBlock.id="static-legend";
    legendBlock.open = false;
    legendBlock.style = "margin-top:1em; padding:.5em; border:1px solid #ccc; background:#fafafa; border-radius:4px;";
    const sm = document.createElement("summary"); sm.textContent="Show Graph Legend";
    legendBlock.appendChild(sm);
    const legendList = document.createElement("div");
    legendList.style = "margin-top:.5em; font-size:.9em;";
    const legendRowByClass = {};
    Object.entries(staticTypeColorMap).forEach(([type,color])=>{
      const cls = (type==="organization"?"org":type);
      const row = document.createElement("div");
      row.style="display:flex; align-items:center; margin:4px 0;";
      row.dataset.type = cls;
      row.innerHTML = `<span style="width:14px;height:14px;background:${color};display:inline-block;margin-right:6px;border-radius:3px;"></span> ${type[0].toUpperCase()+type.slice(1)} (0)`;
      legendList.appendChild(row);
      legendRowByClass[cls]=row;
    });
    legendBlock.appendChild(legendList);
    cyContainer.parentElement.appendChild(legendBlock);

    const statusDisplay = document.createElement("p");
    statusDisplay.id="graph-status"; statusDisplay.style.fontSize=".75em"; statusDisplay.style.margin=".5em 0";
    cyContainer.parentElement.insertBefore(statusDisplay, cyContainer);
    function updateLegendCounts(countByClass){
      for (const [cls,row] of Object.entries(legendRowByClass)){
        const type = cls==="org" ? "Organization" : cls[0].toUpperCase()+cls.slice(1);
        const color = staticTypeColorMap[cls==="org"?"organization":cls];
        const n = countByClass[cls]||0;
        row.innerHTML = `<span style="width:14px;height:14px;background:${color};display:inline-block;margin-right:6px;border-radius:3px;"></span> ${type} (${n})`;
      }
    }

    // Filtering
    let choicesInstance=null;
    ensureChoices(()=>{
      if (typeFilter) {
        choicesInstance = new Choices(typeFilter, { removeItemButton:true, searchEnabled:false, shouldSort:false, placeholderValue:"Filter by type..." });
        choicesInstance.setChoiceByValue("org");
        typeFilter.addEventListener("change", ()=>applyFilter());
      }
    });
    function getSelectedClasses(){ return choicesInstance ? choicesInstance.getValue(true) : []; }

    let currentQuery = "";
    // default OFF — keep neighbours
    let contextModeEnabled = contextToggle ? contextToggle.checked : false;
    if (contextToggle) contextToggle.checked = false;
    if (contextToggle) contextToggle.addEventListener("change", ()=>{ contextModeEnabled = contextToggle.checked; applyFilter(); });

    function nodeMatchesQuery(node, q){
      if (!q) return true;
      const qobj = parseQuery(q);
      const nodeTypeClass = (node.classes()[0] || "").toLowerCase();
      const nodeTypeData  = (node.data("type") || "").toLowerCase();
      const nodeTags = (node.data("tags") || []).map(String).map(s=>s.toLowerCase());
      const blob = (node.data("search_blob") || node.data("label") || "").toLowerCase();
      if (qobj.type.length){
        const matchesType = qobj.type.some(t => (t==="org" ? (nodeTypeClass==="org"||nodeTypeData==="organization") : (nodeTypeClass===t || nodeTypeData===t)));
        if (!matchesType) return false;
      }
      if (qobj.tag.length){
        const hasAnyTag = qobj.tag.some(t => nodeTags.includes(t));
        if (!hasAnyTag) return false;
      }
      return qobj.text.every(t => blob.includes(t));
    }
    function ensureTypesForSelection(selected){ (selected||[]).forEach(cls => ensureTypeLoaded(cls)); }

    // Accepts optional override for selected types
    function applyFilter(selectedOverride){
      const selected = Array.isArray(selectedOverride) ? selectedOverride : getSelectedClasses();
      const q = (currentQuery||"").trim().toLowerCase();
      ensureTypesForSelection(selected);

      const countByClass = {};
      let visibleCount = 0;

      cy.batch(()=>{
        if (!selected.length && !q) {
          cy.nodes().forEach(n=>{
            n.style("display","element");
            const cls = (n.classes()[0]||"other");
            countByClass[cls] = (countByClass[cls]||0) + 1;
          });
          cy.edges().style("display","element");
        } else {
          cy.nodes().forEach(node=>{
            const nodeCls = node.classes()[0];
            const typeOk = !selected.length || selected.includes(nodeCls);
            const textOk = nodeMatchesQuery(node, q);
            const show = typeOk && textOk;
            node.style("display", show ? "element" : "none");
            if (q) node.toggleClass("match", show); else node.removeClass("match");
            if (show) {
              visibleCount++;
              countByClass[nodeCls] = (countByClass[nodeCls]||0) + 1;
            }
          });
          cy.edges().forEach(edge=>{
            const show = edge.source().style("display")!=="none" && edge.target().style("display")!=="none";
            edge.style("display", show ? "element" : "none");
          });
          if (contextModeEnabled && q) {
            const matched = cy.nodes(".match");
            if (matched.length) matched.closedNeighborhood().style("display","element");
          }
        }
      });

      const totalAll    = allNodes.length;
      const totalLoaded = cy.nodes().length;
      const shown       = visibleCount || totalLoaded;
      statusDisplay.textContent = `Showing ${shown} of ${totalLoaded} loaded (of ${totalAll} total)`;
      updateLegendCounts(countByClass);
      updateHash(selected, q);
    }

    if (textSearch) textSearch.addEventListener("input", debounce(e=>{ currentQuery=e.target.value||""; applyFilter(); },150));

    if (resetBtn) resetBtn.addEventListener("click", ()=>{
      cy.batch(()=>{
        cy.elements().style("display","element");
        if (choicesInstance) choicesInstance.removeActiveItems();
        if (textSearch) textSearch.value="";
        cy.nodes().removeClass("match");
        currentQuery="";
      });
      updateLegendCounts({});
      updateHash([], "");
      cy.fit();
    });

    // Initial state — force org-only first paint unless URL says otherwise
    const { types: hashTypes, q: hashQ } = readStateFromHash();
    const hasInitialState = (hashTypes && hashTypes.length) || (hashQ && hashQ.length);
    // Raw select fallback before Choices mounts
    if (typeFilter && !hasInitialState) {
      Array.from(typeFilter.options).forEach(opt => { opt.selected = (opt.value === "org"); });
    }
    if (hasInitialState) {
      ensureTypesForSelection(hashTypes || []);
      if (textSearch) { textSearch.value = hashQ || ""; currentQuery = hashQ || ""; }
      applyFilter(hashTypes);
    } else {
      applyFilter(["org"]);
    }
  }).catch(err=>{
    console.error("Failed to load graph data:", err);
    cyContainer.innerHTML = "<p style='color:red;'>Could not load graph data.</p>";
  });
});

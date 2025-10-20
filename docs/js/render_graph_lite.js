// SUMMARY: Large-graph friendly renderer
// - Seed load (org only), lazy add by type in chunks
// - LOD: no edge labels; show as tooltip on hover; min-zoom label; pixelRatio=1
// - Avoid full ':visible' scans (count while filtering)
// - Accepts BOTH old shape ({elements:[...]}) and new "lite" shape
//   ({"nodes":[{id,l,t,s?,x?,y?,sb?},...],"edges":[[src,tgt,?label],...]})
// - Side panel + context mode preserved

document.addEventListener("DOMContentLoaded", function () {
  const cyContainer  = document.getElementById("cy");
  const typeFilter   = document.getElementById("typeFilter");
  const resetBtn     = document.getElementById("resetView");
  const textSearch   = document.getElementById("textSearch");
  const contextToggle= document.getElementById("contextModeToggle");

  if (!cyContainer) return console.error("No #cy");

  // existing graph path; SITE_BASE to build links
  const graphDataURL = new URL("csc-map-of-the-world/data/graph_data.lite.json", window.location.origin);
  const SITE_BASE    = graphDataURL.pathname.replace(/data\/graph_data\.lite\.json$/, "");

  const staticTypeColorMap = {
    organization:"#007acc", event:"#ff9800", person:"#4caf50", collection:"#9c27b0",
    plan:"#e91e63", rule:"#00bcd4", resource:"#8bc34a", service:"#ffc107", other:"#999999"
  };

  // --- Choices loader ---
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
  function debounce(fn, ms = 150){ let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a),ms);} }
  const esc = (s)=> s==null ? "" : String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const normalizeTypeToken = (t)=>{ const m=(t||"").toLowerCase(); return (m==="org"||m==="organisation"||m==="organization")?"org":m; };
  function parseQuery(q){
    const out={text:[],tag:[],type:[]};
    (q||"").split(/\s+/).forEach(tok=>{
      if(!tok) return;
      if(tok.startsWith("tag:")) out.tag.push(tok.slice(4).toLowerCase());
      else if(tok.startsWith("type:")) out.type.push(normalizeTypeToken(tok.slice(5)));
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

  // --- Edge tooltip ---
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

  // --- State buckets for lazy loading ---
  let allNodes = [];   // lite-normalised
  let allEdges = [];   // lite-normalised
  const loadedTypes = new Set(); // which type classes have been added to cy
  const byType = {};   // { org: [nodeObj,...], plan: [...], ... }
  const addedIds = new Set(); // node ids already in cy

  // Load graph JSON (old or lite)
  fetch(graphDataURL).then(r=>{
    if(!r.ok) throw new Error("HTTP "+r.status);
    return r.json();
  }).then(raw=>{
    // --- Normalise to "lite" shape in-memory ---
    if (Array.isArray(raw?.elements)) {
      // Old shape -> lite arrays
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

    allNodes = (raw.nodes||[]).map(n=>{
      const classes = (n.t==="organization"?"org":n.t)||"other";
      if(!byType[classes]) byType[classes]=[];
      byType[classes].push(n);
      return n;
    });
    allEdges = (raw.edges||[]).map(e=>{
      return { source:e[0], target:e[1], label:e[2]||"" };
    });

    // ---- Cytoscape init (empty, add seed later) ----
    const dynamicNodeStyles = Object.entries(staticTypeColorMap).map(([cls,color])=>({
      selector: `.${cls==="organization"?"org":cls}`,
      style: { "background-color": color, "background-opacity": 1 }
    }));
    const cy = cytoscape({
      container: cyContainer,
      elements: [], // start empty (seed load later)
      layout: { name:"preset" },
      style: [
        { selector:"node", style:{
          label:"data(label)",
          "text-valign":"center","color":"#000","font-size":12,"text-outline-width":0,
          "min-zoomed-font-size": 10   // performance gain: hide labels when zoomed out
        }},
        ...dynamicNodeStyles,
        { selector:"edge", style:{
          // label removed (tooltip instead)
          "width": 2, "line-color":"#aaa","target-arrow-color":"#aaa",
          "target-arrow-shape":"triangle","curve-style":"bezier"
        }},
        { selector:"node.match", style:{
          "border-width": 3,"border-color":"#333",
          "shadow-blur": 12,"shadow-opacity": .4,"shadow-offset-x":0,"shadow-offset-y":0
        }}
      ],
      renderer: { // cheaper renderer
        pixelRatio: 1,
        hideEdgesOnViewport: true,
        hideLabelsOnViewport: true,
        textureOnViewport: true,
        motionBlur: true
      }
    });

    // Edge tooltips
    cy.on("mouseover","edge", (evt)=>{
      const lbl = evt.target.data("label");
      if (lbl) { edgeTip.textContent = lbl; edgeTip.style.display="block"; moveTip(evt); }
    });
    cy.on("mousemove","edge", moveTip);
    cy.on("mouseout","edge", ()=>{ edgeTip.style.display="none"; });

    // Side panel (compacted)
    const relatedURL = new URL("csc-map-of-the-world/data/related_nodes.json", window.location.origin);
    fetch(relatedURL).then(r=>r.ok?r.json():{}).then(obj=>{ window.__relatedIndex=obj||{}; })
                     .catch(()=>{ window.__relatedIndex={}; });

    // Optional: load node_details for richer panel fields (website/persons/projects)
    let NODE_DETAILS = {};
    const detailsURL = new URL("csc-map-of-the-world/data/node_details.json", window.location.origin);
    fetch(detailsURL).then(r=>r.ok?r.json():{}).then(obj=>{ NODE_DETAILS=obj||{}; })
                     .catch(()=>{ NODE_DETAILS={}; });

    let panel = document.getElementById("nodePanel");
    if (!panel) { panel = document.createElement("aside"); panel.id="nodePanel"; panel.className="node-panel"; document.body.appendChild(panel); }

    function openNodePanel(node){
      if(!panel) return;
      const d = node.data();
      const enrich = (NODE_DETAILS[d.id] || {});
      const tagsHtml  = (d.tags || enrich.tags || []).map(t=>`<span>#${esc(t)}</span>`).join("");

      // Build links
      const pageUrl = d.page_url ? `${SITE_BASE}${String(d.page_url).replace(/^\/+/, "")}` :
                      (d.slug ? `${SITE_BASE}${String(d.slug).replace(/^\/+/, "")}/` : "");
      const base = (s)=> (s? String(s).split("/").filter(Boolean).pop() : "");
      const queryTerm = (d.label && d.label.trim()) || base(d.slug||d.page_url) || (d.id||"");
      const searchUrl = `${SITE_BASE}search/?q=${encodeURIComponent(queryTerm)}`;
      const hasRelated = window.__relatedIndex && d.slug && window.__relatedIndex[d.slug];

      // Optional info rows (prefer details if present)
      const website = d.website || enrich.website;
      const persons = d.persons || enrich.persons || [];
      const projects= d.projects|| enrich.projects|| [];
      const notes   = d.notes   || enrich.notes;

      const websiteRow = website ? `
        <div class="row"><div class="subhead"><strong>Website</strong></div>
        <div><a href="${esc(website)}" target="_blank" rel="noopener">${esc(website)}</a></div></div>` : "";

      const projectsRow = (Array.isArray(projects) && projects.length) ? `
        <div class="row"><div class="subhead"><strong>Projects</strong></div>
        <ul style="margin:6px 0 0 18px; padding:0;">${projects.map(p=>`<li>${esc(p).replace(/[_-]/g," ")}</li>`).join("")}</ul></div>` : "";

      const personsRow = (Array.isArray(persons) && persons.length) ? `
        <div class="row"><div class="subhead"><strong>People</strong></div>
        <ul style="margin:6px 0 0 18px; padding:0;">
          ${persons.map(p=>{
            const name=esc(p.name||""); const role=p.role?` — ${esc(p.role)}`:"";
            const frm=p.from?` <span style="color:#666;">(${esc(p.from)})</span>`:"";
            return `<li>${name}${role}${frm}</li>`;
          }).join("")}
        </ul></div>` : "";

      const orgMetaRow = (d.organisation_type || enrich.organisation_type || d.region || enrich.region) ? `
        <div class="row"><div class="subhead"><strong>Organisation</strong></div>
        <div>
          ${(d.organisation_type||enrich.organisation_type)?`<div>Type: ${esc(d.organisation_type||enrich.organisation_type)}</div>`:""}
          ${(d.region||enrich.region)?`<div>Region: ${esc(d.region||enrich.region)}</div>`:""}
        </div></div>` : "";

      const notesRow = notes ? `<div class="row"><div class="subhead"><strong>Notes</strong></div><div>${esc(notes)}</div></div>` : "";

      panel.innerHTML = `
        <div class="row" style="display:flex; justify-content: space-between; align-items:center;">
          <h3>${esc(d.label || d.slug || d.id || "(untitled)")}</h3>
          <button id="panelClose">✕</button>
        </div>
        <div class="meta">${esc((d.type||"").toLowerCase())}</div>
        <div class="row">${esc((d.summary||enrich.summary||"")).slice(0,800)}</div>
        <div class="row tags">${tagsHtml}</div>
        ${websiteRow}${projectsRow}${personsRow}${orgMetaRow}${notesRow}
        <div class="row toolbar" style="display:flex; gap:8px; margin-top:10px;">
          <a href="${esc(searchUrl)}">Search</a>
          ${pageUrl ? `&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${esc(pageUrl)}">Open details</a>` : ""}
          ${hasRelated ? `<button data-related-slug="${esc(d.slug)}">Show related</button>` : ""}
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

    // --- Seed subset load only org on start ---
    const SEED_CLASS = "org";
    function toCyNode(n){
      const data = { id:n.id, label:n.l, type:n.t, slug:n.s||"", search_blob:n.sb||"" };
      if (n.x!=null && n.y!=null) return { data, classes: (n.t==="organization"?"org":n.t), position:{x:n.x,y:n.y} };
      return { data, classes: (n.t==="organization"?"org":n.t) };
    }
    function toCyEdge(e){ return { data:{ source:e.source, target:e.target, label:e.label||"" } }; }

    function addInChunks(elems, chunk=1200){
      let i = 0;
      (function step(){
        const slice = elems.slice(i, i+chunk);
        if (!slice.length) return;
        cy.batch(()=> cy.add(slice));
        i += chunk;
        requestAnimationFrame(step);
      })();
    }

    function ensureTypeLoaded(typeCls){
      if (loadedTypes.has(typeCls)) return;
      const nodes = (byType[typeCls]||[]).filter(n=>!addedIds.has(n.id));
      const ids   = new Set(nodes.map(n=>n.id));
      const edges = allEdges.filter(e => ids.has(e.source) && ids.has(e.target));
      nodes.forEach(n=>addedIds.add(n.id));
      loadedTypes.add(typeCls);
      addInChunks([...nodes.map(toCyNode), ...edges.map(toCyEdge)]);
    }

    // seed orgs
    ensureTypeLoaded(SEED_CLASS);

    // --- Legend + status (avoid global scans; compute in-filter) ---
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

    // --- Filtering ---
    let choicesInstance=null;
    ensureChoices(()=>{
      if (typeFilter) {
        choicesInstance = new Choices(typeFilter, { removeItemButton:true, searchEnabled:false, shouldSort:false, placeholderValue:"Filter by type..." });
        choicesInstance.setChoiceByValue("org");
        typeFilter.addEventListener("change", applyFilter);
      }
    });

    function getSelectedClasses(){
      if (!choicesInstance) return [];
      return choicesInstance.getValue(true);
    }

    let currentQuery = "";
    let contextModeEnabled = contextToggle ? contextToggle.checked : true;
    if (contextToggle) {
      contextToggle.addEventListener("change", ()=>{ contextModeEnabled = contextToggle.checked; applyFilter(); });
    }

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

    function ensureTypesForSelection(selected){
      // if user selects types not yet loaded, add them first
      (selected||[]).forEach(cls => ensureTypeLoaded(cls));
    }

    function applyFilter(){
      const selected = getSelectedClasses();
      const q = (currentQuery||"").trim().toLowerCase();

      ensureTypesForSelection(selected); // lazy-load first

      const countByClass = {}; // NEW: avoid global ':visible' scans
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

          // Context neighbours (already scoped to matches -> cheap)
          if (contextModeEnabled && q) {
            const matched = cy.nodes(".match");
            if (matched.length) matched.closedNeighborhood().style("display","element");
          }
        }
      });

      statusDisplay.textContent = `Showing ${visibleCount || cy.nodes().length} of ${cy.nodes().length} nodes`;
      updateLegendCounts(countByClass);
      updateHash(selected, q);
    }

    if (textSearch) {
      textSearch.addEventListener("input", debounce(e=>{ currentQuery=e.target.value||""; applyFilter(); },150));
    }

    resetBtn.addEventListener("click", ()=>{
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

    // Initial state: seed org only, then apply URL state if any
    const { types: hashTypes, q: hashQ } = readStateFromHash();
    const hasInitialState = (hashTypes && hashTypes.length) || (hashQ && hashQ.length);
    if (hasInitialState) {
      if (choicesInstance) {
        choicesInstance.removeActiveItems();
        hashTypes.forEach(t => choicesInstance.setChoiceByValue(normalizeTypeToken(t)));
      } else if (typeFilter && hashTypes && hashTypes.length) {
        Array.from(typeFilter.options).forEach(opt => { opt.selected = hashTypes.includes(opt.value); });
      }
      if (textSearch) { textSearch.value = hashQ || ""; currentQuery = hashQ || ""; }
      // ensure those types loaded before first filter
      ensureTypesForSelection(hashTypes || []);
      applyFilter();
    } else {
      // show orgs only by default
      applyFilter();
    }
  }).catch(err=>{
    console.error("Failed to load graph data:", err);
    cyContainer.innerHTML = "<p style='color:red;'>Could not load graph data.</p>";
  });
});

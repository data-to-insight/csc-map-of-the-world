/**
 * Lite renderer (large-graph friendly)
 * - Loads docs/data/graph_data.lite.json (or window.MOTW.graphLite if preloaded)
 * - Adds nodes immediately, edges in staged chunks (haystack → bezier on zoom)
 * - Optional UI: typeFilter (Choices.js), contextModeToggle, resetView, textSearch
 * - Info panel: enriches from standard graph JSON if available (fields/tags/website/links)
 */

(function () {
  const EDGE_FIRST_BATCH = 800;
  const EDGE_CHUNK_SIZE  = 1500;
  const EDGE_CHUNK_DELAY = 150;
  const LABEL_ZOOM = 1.2;
  const HAYSTACK_TO_BEZIER_ZOOM = 1.1;

  // -------- status chip
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

  // -------- data getters (prefer preloaded MOTW)
  function getGraphLite(url) {
    if (window.MOTW && window.MOTW.graphLite) return Promise.resolve(window.MOTW.graphLite);
    return fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`); return r.json(); });
  }
  function getGraphStd(url) {
    if (window.MOTW && window.MOTW.graphStd) return Promise.resolve(window.MOTW.graphStd);
    return fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`); return r.json(); });
  }

  // -------- edges: fast/detailed styles + progressive add
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
  function addEdgesProgressively(cy, allEdgeEls, first = EDGE_FIRST_BATCH) {
    let idx = 0;
    const now = allEdgeEls.slice(0, first);
    idx = now.length;
    if (now.length) cy.add(now);

    function pump() {
      if (idx >= allEdgeEls.length) return;
      const next = allEdgeEls.slice(idx, Math.min(allEdgeEls.length, idx + EDGE_CHUNK_SIZE));
      idx += next.length;
      cy.batch(() => { cy.add(next); });
      if (idx < allEdgeEls.length) setTimeout(pump, EDGE_CHUNK_DELAY);
    }
    setTimeout(pump, EDGE_CHUNK_DELAY);
  }

  // -------- panel helpers (shared with standard)
  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, m =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function buildFieldsHTML(d){
    const f = d.fields || {};
    const rows = [];

    const orgType  = f.organisation_type || f.organization_type || d.organisation_type;
    const region   = f.region || d.region;
    const projects = Array.isArray(f.projects) ? f.projects
                   : Array.isArray(d.projects) ? d.projects : [];
    const persons  = Array.isArray(f.persons) ? f.persons
                   : Array.isArray(d.persons) ? d.persons : [];

    if (d.type)           rows.push(`<div class="row"><span class="subhead">Type</span><div class="meta">${esc(d.type)}</div></div>`);
    if (d.slug)           rows.push(`<div class="row"><span class="subhead">Slug</span><div class="meta">${esc(d.slug)}</div></div>`);
    if (d.website)        rows.push(`<div class="row"><span class="subhead">Website</span> <a href="${esc(d.website)}" target="_blank" rel="noopener">${esc(d.website)}</a></div>`);
    if (d.date_published) rows.push(`<div class="row"><span class="subhead">Published</span><div class="meta">${esc(d.date_published)}</div></div>`);
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

  function mount() {
    const container     = document.getElementById('cy') || document.getElementById('network-app');
    if (!container) return;

    // Optional UI hooks (exist on some pages)
    const typeFilter    = document.getElementById('typeFilter');
    const resetBtn      = document.getElementById('resetView');
    const textSearch    = document.getElementById('textSearch');
    const contextToggle = document.getElementById('contextModeToggle');

    // Choices.js guard
    let choicesInstance = null;
    if (window.Choices && typeFilter && !typeFilter.dataset.enhanced) {
      choicesInstance = new Choices(typeFilter, { removeItemButton: true, shouldSort: false });
      typeFilter.dataset.enhanced = "1";
    }

    const chip = statusChip(container);
    chip.set('Loading network...');

    const liteURL = new URL('../data/graph_data.lite.json', location.href).toString();
    const stdURL  = new URL('../data/graph_data.json',      location.href).toString();
    const siteBase = stdURL.replace(/data\/graph_data\.json$/, '');

    // Fetch lite graph first for fast paint; fetch standard in the background for panel enrichment
    Promise.allSettled([getGraphLite(liteURL), getGraphStd(stdURL)]).then(results => {
      const lite = results[0].status === 'fulfilled' ? results[0].value : { nodes:[], edges:[] };
      const std  = results[1].status === 'fulfilled' ? results[1].value : null;

      const nodes = lite.nodes || [];
      const edges = lite.edges || [];

      // Build enrichment map from standard JSON if available
      const detailsById = new Map();
      if (std && Array.isArray(std.elements)) {
        for (const el of std.elements) {
          if (el.group !== 'nodes') continue;
          const d = el.data || {};
          const classes = (el.classes || '').trim();
          // normalise a compact detail object for the panel
          detailsById.set(d.id, {
            id: d.id,
            label: d.label,
            type:  d.type || classes || '',
            slug:  d.slug || '',
            tags:  Array.isArray(d.tags) ? d.tags : [],
            summary: d.summary || d.description || '',
            website: d.website || '',
            date_published: d.date_published || '',
            page_url: d.page_url || '',
            fields: d.fields || {}  // our builder now emits this bag
          });
        }
      }

      // Indexes for filtering
      const nodeById  = new Map(nodes.map(n => [n.id, n]));
      const neighbors = new Map(nodes.map(n => [n.id, []]));
      edges.forEach(([s,t]) => { neighbors.get(s)?.push(t); neighbors.get(t)?.push(s); });

      // Initial visible set (org-only; context off unless checkbox is checked)
      const allowTypes = new Set(['org']);
      let visibleIds   = new Set(nodes.filter(n => allowTypes.has(String(n.t||'').toLowerCase())).map(n => n.id));
      if (contextToggle && contextToggle.checked) {
        const add = new Set(visibleIds);
        visibleIds.forEach(id => (neighbors.get(id) || []).forEach(m => add.add(m)));
        visibleIds = add;
      }

      // Build initial cy elements
      const nodeEls = [];
      visibleIds.forEach(id => {
        const n = nodeById.get(id);
        if (!n) return;
        const pos = (typeof n.x === 'number' && typeof n.y === 'number') ? { x:n.x, y:n.y } : undefined;
        nodeEls.push({
          group: 'nodes',
          data: { id: n.id, label: n.l, t: n.t || 'other', s: n.s || '', sb: n.sb || '' },
          position: pos
        });
      });
      const edgeEls = edges
        .filter(([s,t]) => visibleIds.has(s) && visibleIds.has(t))
        .map(([s,t,rel]) => ({ group: 'edges', data: { source: s, target: t, rel: rel || '' } }));

      // Bring up Cytoscape
      const cy = window.cy || cytoscape({
        container,
        elements: [],
        pixelRatio: 1,
        textureOnViewport: true,
        wheelSensitivity: 0.2,
        hideEdgesOnViewport: true,
        motionBlur: true,
        layout: { name: 'preset', fit: false }
      });
      window.cy = cy;

      // Style (type colouring via t attr)
      cy.style().fromJson([
        { selector: 'node', style: { 'background-color': '#b8b8b8', 'width': 8, 'height': 8, 'label': '' } },
        { selector: 'node[t = "org"], node[t = "organization"]', style: { 'background-color': '#4c78a8' } },
        { selector: 'node[t = "service"]',   style: { 'background-color': '#f58518' } },
        { selector: 'node[t = "dataset"]',   style: { 'background-color': '#54a24b' } },
        { selector: 'node[t = "tool"]',      style: { 'background-color': '#e45756' } },
        { selector: 'node[t = "event"]',     style: { 'background-color': '#72b7b2' } },
        { selector: 'node[t = "plan"]',      style: { 'background-color': '#ff9da6' } },
        { selector: 'node[t = "person"]',    style: { 'background-color': '#b279a2' } },
        { selector: 'node[t = "rule"]',      style: { 'background-color': '#eeca3b' } },
        { selector: 'edge', style: { 'line-color': '#aaa', 'width': 1 } }
      ]).update();

      setEdgeMode(cy, 'fast');

      // Add nodes immediately; fit; then feed edges
      cy.add(nodeEls);
      const core = cy.nodes().filter(n => n.connectedEdges().length > 0);
      cy.fit(core.length ? core : cy.nodes(), 16);
      chip.set('Adding edges…');
      addEdgesProgressively(cy, edgeEls);
      cy.once('render', () => setTimeout(() => chip.hide(), 800));

      // Zoom: labels and edge mode switch
      cy.on('zoom', () => {
        const z = cy.zoom();
        const show = z > LABEL_ZOOM;
        cy.batch(() => cy.nodes().forEach(n => n.style('label', show ? n.data('label') : '')));
        setEdgeMode(cy, z >= HAYSTACK_TO_BEZIER_ZOOM ? 'detail' : 'fast');
      });

      // Simple info panel (uses standard details if available; otherwise minimal lite fallback)
      let panel = document.getElementById('node-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'node-panel';
        panel.className = 'node-panel';
        panel.style.display = 'none';
        panel.style.position = 'fixed';
        panel.style.top = '96px';
        panel.style.right = '16px';
        panel.style.width = 'min(360px,95vw)';
        panel.style.maxHeight = '70vh';
        panel.style.overflow = 'auto';
        panel.style.background = '#fff';
        panel.style.border = '1px solid #ddd';
        panel.style.borderRadius = '8px';
        panel.style.boxShadow = '0 10px 24px rgba(0,0,0,.12)';
        panel.style.padding = '12px 14px';
        panel.style.zIndex = '9999';
        document.body.appendChild(panel);
      }
      function renderPanelFor(node){
        // prefer rich standard details if present
        const rich = detailsById.get(node.id());
        const base = {
          label: node.data('label'),
          type:  node.data('t'),
          slug:  node.data('s')
        };
        const d = rich || base;

        const title   = `<div class="row"><strong>${esc(d.label || node.id())}</strong></div>`;
        const meta    = `<div class="meta">${esc(d.slug || '')}</div>`;
        const summary = d.summary ? `<div class="row"><div class="subhead">Summary</div><div>${esc(d.summary)}</div></div>` : '';
        const fields  = buildFieldsHTML(d);
        const website = d.website ? `<div class="row"><a href="${esc(d.website)}" target="_blank" rel="noopener">Website</a></div>` : '';
        const details = d.page_url ? `<div class="row"><a href="${siteBase}${d.page_url}">Details</a></div>` : '';

        panel.innerHTML = `
          <div class="node-panel-content">
            ${title}
            ${meta}
            ${summary}
            ${fields}
            ${website}
            ${details}
          </div>`;
        panel.style.display = 'block';
      }
      cy.on('tap', 'node', (e) => renderPanelFor(e.target));
      cy.on('tap', (e) => { if (e.target === cy) panel.style.display = 'none'; });

      // ------- Optional UI: filtering & search (if elements are present)
      function applyFilter() {
        const selectedTypes = new Set(
          (choicesInstance ? choicesInstance.getValue(true)
                           : Array.from(typeFilter?.selectedOptions || []).map(o => o.value))
            .map(s => String(s).toLowerCase())
        );
        const ctx = !!(contextToggle && contextToggle.checked);

        let vis = new Set(nodes.filter(n => selectedTypes.has(String(n.t).toLowerCase())).map(n => n.id));
        if (ctx) {
          const add = new Set(vis);
          vis.forEach(id => (neighbors.get(id) || []).forEach(m => add.add(m)));
          vis = add;
        }

        cy.batch(() => {
          cy.nodes().forEach(n => n.style('display', vis.has(n.id()) ? 'element' : 'none'));
          cy.edges().forEach(e => {
            const s = e.data('source'), t = e.data('target');
            e.style('display', (vis.has(s) && vis.has(t)) ? 'element' : 'none');
          });
        });

        const coreNow = cy.nodes().filter(n => n.style('display') !== 'none' && n.connectedEdges(':visible').length > 0);
        if (coreNow.length) cy.fit(coreNow, 16);
      }

      function applySearch() {
        const q = (textSearch?.value || '').toLowerCase().trim();
        if (!q) {
          cy.nodes().forEach(n => n.style('opacity', 1));
          cy.edges().forEach(e => e.style('opacity', 1));
          return;
        }
        const match = new Set();
        nodes.forEach(n => {
          const blob = String(n.sb || `${n.l} ${n.s} ${n.t}`).toLowerCase();
          if (blob.includes(q)) match.add(n.id);
        });
        cy.batch(() => {
          cy.nodes().forEach(n => n.style('opacity', match.has(n.id()) ? 1 : 0.15));
          cy.edges().forEach(e => {
            const s = e.data('source'), t = e.data('target');
            e.style('opacity', (match.has(s) || match.has(t)) ? 1 : 0.1);
          });
        });
      }

      typeFilter?.addEventListener('change', applyFilter);
      contextToggle?.addEventListener('change', applyFilter);
      resetBtn?.addEventListener('click', () => {
        if (choicesInstance) { choicesInstance.removeActiveItems(); choicesInstance.setChoiceByValue(['org']); }
        if (typeFilter && !choicesInstance) {
          Array.from(typeFilter.options).forEach(o => o.selected = (o.value === 'org'));
        }
        if (contextToggle) contextToggle.checked = false;
        applyFilter();
      });
      textSearch?.addEventListener('input', applySearch);
    }).catch(err => {
      console.error(err);
      chip.set('Could not load graph data');
    });
  }

  if (window.document$) {
    document$.subscribe(() => setTimeout(mount, 0));
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();

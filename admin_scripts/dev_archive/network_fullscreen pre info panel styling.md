---
title: Full Network (IN DEV)
hide:
  - navigation
  - toc
  - footer
---

<!-- Note: Page incl .js scripts is self-contained excepting the unpinning data. This for now, we might seperate those 
scripts out into /js to improve consistency to such as network.md and other front-end processing -->

<style>
  .md-grid { max-width: initial; }
  .md-main__inner { margin: 0; }

  #network-app { width: 100%, min-height: 60vh, position: relative }

  /* small status chip inside graph */
  #network-status {
    position: absolute, top: 8px, left: 8px, z-index: 10,
    background: rgba(255,255,255,.95), border: 1px solid #ddd,
    padding: 6px 10px, border-radius: 6px, font-size: .9em, color: #333
  }
</style>

<div id="network-app"></div>

<!-- Note, can tune visible graph directly in browser on url via :
E.g. Wider neighborhood, more context
...?k=3&pad=150
or
E.g. Same hood, zoom out slightly
...?k=2&pad=200 
-->
<!-- External libs from CDN -->
<script src="https://unpkg.com/cytoscape@3.28.0/dist/cytoscape.min.js"></script>
<script src="https://unpkg.com/cytoscape-fcose@2.2.0/cytoscape-fcose.js"></script>
<script>
(function () {
  function init() {
    const container = document.getElementById('network-app');
    if (!container) return;
    container.style.position = 'relative';

    // simple HTML escaper
    const esc = s =>
      s == null
        ? ''
        : String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          }[c]));

    // tunables via URL if wanted, defaults are good
    const params       = new URLSearchParams(location.search);
    const LABEL_ZOOM   = Number(params.get('label_zoom')) || 1.2;  // labels on when zoom above this
    const FOCUS_K      = Number(params.get('k'))      || 5;
    const FIT_PAD      = Number(params.get('pad'))    || 200;
    const COLOR_MODE   = (params.get('color')  || 'type').toLowerCase();       // 'type' | 'degree'
    const LAYOUT_AFTER = (params.get('layout') || 'progressive').toLowerCase(); // default progressive
    const ENGINE       = (params.get('engine') || 'fcose').toLowerCase();       // default fcose
    const STAGE_K      = Number(params.get('stage_k')) || 1;                    // initial hops, default 1

    function fitContainer() {
      const header = document.querySelector('.md-header');
      const h = header ? header.offsetHeight : 0;
      container.style.height = `calc(100vh - ${h}px)`;
      container.style.width  = '100%';
    }
    fitContainer();

    // status chip inside container, with fade out helper
    const statusEl = document.createElement('div');
    statusEl.id = 'network-status';
    statusEl.textContent = 'Loading main network...';
    statusEl.style.cssText = 'position:absolute;top:8px;left:8px;z-index:10;background:rgba(255,255,255,.95);border:1px solid #ddd;padding:6px 10px;border-radius:6px;font-size:.9em;color:#333;transition:opacity .25s ease;opacity:1';
    container.appendChild(statusEl);
    function setStatus(msg) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.style.opacity = '1';
    }
    function hideStatus(afterMs = 0) {
      if (!statusEl || !statusEl.parentNode) return;
      if (afterMs > 0) {
        setTimeout(() => {
          statusEl.style.opacity = '0';
          setTimeout(() => { statusEl.parentNode && statusEl.parentNode.removeChild(statusEl); }, 300);
        }, afterMs);
      } else {
        statusEl.parentNode.removeChild(statusEl);
      }
    }
    function showFor(msg, ms = 5000) {
      setStatus(msg);
      hideStatus(ms);
    }

    let userHasInteracted = false;
    window.addEventListener('resize', () => {
      fitContainer();
      if (window.cy) {
        window.cy.resize();
        if (!userHasInteracted) firstFit(window.cy, { havePreset: window.cy.hasPresetPositions });
      }
    });


    const graphUrl   = new URL('../data/graph_data.lite.json', window.location.href).toString();
    const degreeUrl  = new URL('../data/degree.json',          window.location.href).toString();

    // added towards info panel
    const detailsUrl = new URL('../data/node_details.json',    window.location.href).toString();
    // simple in memory store for node_details.json
    let DETAILS = {};  // { id: { label, slug, type, summary, tags, website, projects, persons, page_url, ... } }



    // helpers
    function setLabels(coll, show) { coll.forEach(n => n.style('label', show ? n.data('label') : '')); }
    function setLabelsAll(cy, show) { cy.batch(() => cy.nodes().forEach(n => n.style('label', show ? n.data('label') : ''))); }
    function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
    function jitteredGridPositions(count, gap=28, jitter=8, seed=17){
      const cols = Math.ceil(Math.sqrt(count)), rng=mulberry32(seed), pos=new Array(count);
      for (let i=0;i<count;i++){ const x=(i%cols)*gap+(rng()*2-1)*jitter, y=(Math.floor(i/cols))*gap+(rng()*2-1)*jitter; pos[i]={x,y}; }
      return pos;
    }
    function computeDegreeFromEdges(edges){
      const adj=Object.create(null);
      for (const e of edges){ if (!Array.isArray(e)||e.length<2) continue; const[s,t]=e; (adj[s] ||= new Set()).add(t); (adj[t] ||= new Set()).add(s); }
      const out={}; for (const k of Object.keys(adj)) out[k]=adj[k].size; return out;
    }
    function neighborhoodKHopsSet(id, k, neighbors){
      let set=new Set([id]);
      for (let i=0;i<k;i++){
        const add=new Set(set);
        for (const n of set){ const nb=neighbors.get(n); if (!nb) continue; for (const m of nb) add.add(m); }
        set=add;
      }
      return set;
    }
    function applyTypeColors(cy){
      cy.style().fromJson([
        { selector: 'node', style: { 'background-color': '#b8b8b8' } },
        { selector: 'node[t = "organization"], node[t = "org"]', style: { 'background-color': '#4c78a8' } },
        { selector: 'node[t = "service"]',   style: { 'background-color': '#f58518' } },
        { selector: 'node[t = "dataset"]',   style: { 'background-color': '#54a24b' } },
        { selector: 'node[t = "tool"]',      style: { 'background-color': '#e45756' } },
        { selector: 'node[t = "event"]',     style: { 'background-color': '#72b7b2' } },
        { selector: 'node[t = "plan"]',      style: { 'background-color': '#ff9da6' } },
        { selector: 'node[t = "person"]',    style: { 'background-color': '#b279a2' } },
        { selector: 'node[t = "rule"]',      style: { 'background-color': '#eeca3b' } }
      ]).update();
    }
    function firstFit(cy, { havePreset }){
      const core = cy.nodes().filter(n=>n.connectedEdges().length>0);
      cy.resize();
      cy.fit(core.length?core:cy.nodes(), 8);
    }
    function runProgressiveLayout(cy){
      if (LAYOUT_AFTER === 'none') {
        showFor('Zoom in to view node labels', 5000);
        return;
      }
      const isFCoSE = (ENGINE === 'fcose') && typeof cytoscape('core', 'layout', 'fcose') === 'function';
      const opts = isFCoSE ? {
        name: 'fcose', quality: 'draft', randomize: false, animate: 'end', animationDuration: 700,
        nodeRepulsion: 4500, idealEdgeLength: 90, gravity: 0.25, packComponents: true, tile: true
      } : {
        name: 'cose', randomize: false, animate: 'end', animationDuration: 700,
        numIter: 700, nodeRepulsion: 120000, idealEdgeLength: 90, gravity: 2, initialTemp: 200, coolingFactor: 0.99
      };
      cy.style().selector('edge').style('opacity', 0.25).update();
      const layout = cy.elements().layout(opts);
      layout.on('layoutstop', ()=>{
        cy.style().selector('edge').style('opacity', 1).update();
        if (!userHasInteracted) firstFit(cy, {havePreset:true});
        showFor('Zoom in to view node labels', 5000);
      });
      layout.run();
    }

    // start fetch, status == loading
    fetch(graphUrl).then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status} for ${graphUrl}`); return r.json(); })
    .then(async ({ nodes, edges }) => {
      setStatus('Preparing initial view...');

      // degrees and neighbor map
      let degrees={};
      try { const r=await fetch(degreeUrl); if(!r.ok) throw new Error(); degrees=await r.json(); } catch { degrees=computeDegreeFromEdges(edges); }


      // optional node details, nice to have but not required
      // towards info panel... but with caution give scale of graph
      try {
        const rDet = await fetch(detailsUrl);
        if (rDet.ok) {
          DETAILS = await rDet.json();
        } else {
          DETAILS = {};
        }
      } catch (e) {
        DETAILS = {};
      }

      const neighbors = new Map(); for (const [s,t] of edges){ (neighbors.get(s) || neighbors.set(s,new Set()).get(s)).add(t); (neighbors.get(t) || neighbors.set(t,new Set()).get(t)).add(s); }

      // choose top degree id
      let topId = nodes[0]?.id || null, max=-1;
      for (const n of nodes){ const d = degrees[n.id] ?? 0; if (d > max){ max=d; topId=n.id; } }

      // preset positions for all nodes, used in both stages
      const havePreset = nodes.some(n => n.x !== undefined && n.y !== undefined);
      const allPos = havePreset ? null : jitteredGridPositions(nodes.length, 28, 8, 17);
      const indexById = new Map(nodes.map((n,i)=>[n.id, i]));

      // stage 1 set, top plus 1 hop
      const stageSet = topId ? neighborhoodKHopsSet(topId, STAGE_K, neighbors) : new Set(nodes.slice(0, 20).map(n=>n.id));
      const stageNodes = nodes.filter(n => stageSet.has(n.id));
      const stageEdges = edges.filter(([s,t]) => stageSet.has(s) && stageSet.has(t));
      const edgeKey = (a,b) => a < b ? `${a}|${b}` : `${b}|${a}`;
      const stageEdgeKeys = new Set(stageEdges.map(([s,t]) => edgeKey(s,t)));

      // build initial elements
      const elements = [];
      for (const n of stageNodes){
        const i = indexById.get(n.id);
        elements.push({
          data: { id: n.id, label: n.l, t: n.t, s: n.s },
          position: havePreset ? ((n.x!==undefined&&n.y!==undefined)?{x:n.x,y:n.y}:undefined) : allPos[i]
        });
      }
      for (const [s,t,rel] of stageEdges){ elements.push({ data: { source: s, target: t, rel } }); }

      // create cy
      const cy = window.cy = cytoscape({
        container,
        elements,
        pixelRatio: 1,
        textureOnViewport: true,
        wheelSensitivity: 0.2,
        hideEdgesOnViewport: true,
        motionBlur: true,
        layout: { name: 'preset', fit: false }
      });
      cy.hasPresetPositions = true;

      // base style, sizing, colouring
      cy.style().fromJson([
        { selector: 'node', style: { 'background-color': '#777', 'width': 8, 'height': 8, 'label': '' } },
        { selector: 'edge', style: { 'line-color': '#aaa', 'width': 1 } }
      ]).update();



      // small node info panel, reuses .node-panel CSS from explorer pg
      // incl explicit hint when there is no node_details entry for selected node
      // "No extra details available for this node"

      let panel = document.getElementById('nodePanel');
      if (!panel) {
        panel = document.createElement('aside');
        panel.id = 'nodePanel';
        panel.className = 'node-panel';
        document.body.appendChild(panel);
      }

      function openNodePanel(node) {
        const d = node.data();
        const id = d.id;
        const det = (id && DETAILS[id]) || {};

        const label =
          det.label ||
          d.label ||
          d.l ||
          id;

        const typeVal = (det.type || d.t || '').toString().toLowerCase();
        const slugVal = det.slug || d.s || '';

        const summary =
          det.summary ||
          det.description ||
          det.notes ||
          '';

        const tags = Array.isArray(det.tags) ? det.tags : [];
        const website = det.website || '';
        const projects = Array.isArray(det.projects) ? det.projects : [];
        const persons  = Array.isArray(det.persons)  ? det.persons  : [];

        const orgType = det.organisation_type || det.organization_type || '';
        const region  = det.region || '';

        const pageUrl = det.page_url || '';
        const hasPage = typeof pageUrl === 'string' && pageUrl.trim() !== '';

        const base = s => (s ? String(s).split('/').filter(Boolean).pop() : '');
        const queryTerm = (label && label.trim()) || base(slugVal) || id;
        const searchUrl = `${location.pathname.replace(/network_fullscreen.*$/, '')}search/?q=${encodeURIComponent(queryTerm)}`;

        const metaRows = [];
        if (id)      metaRows.push(['Id', id]);
        if (typeVal) metaRows.push(['Type', typeVal]);
        if (slugVal) metaRows.push(['Slug', slugVal]);
        if (orgType) metaRows.push(['Organisation type', orgType]);
        if (region)  metaRows.push(['Region', region]);

        panel.innerHTML = `
          <div class="node-panel-inner">
            <div class="row" style="display:flex;justify-content:space-between;align-items:center;">
              <h3>${esc(label || id)}</h3>
              <button id="panelClose">✕</button>
            </div>

            ${typeVal ? `<div class="meta">${esc(typeVal)}</div>` : ''}

            ${
              summary
                ? `<div class="row node-summary">
                     ${esc(summary)}
                   </div>`
                : ''
            }

            
            ${
              !summary && (!tags || !tags.length) && !website && (!projects || !projects.length) && (!persons || !persons.length)
                ? `<div class="row node-summary">
                    Limited detail available for this node.
                  </div>`
                : ''
            }


            ${
              tags && tags.length
                ? `<div class="row tags">
                    <div class="subhead"><strong>Tags</strong></div>
                    ${tags
                      .map(t => t ? `<span>${esc(t)}</span>` : "")
                      .join("")}
                  </div>`
                : ""
            }


            ${
              website
                ? `<div class="row node-website">
                     <strong>Website</strong>:
                     <a href="${esc(website)}" target="_blank" rel="noopener">
                       ${esc(website)}
                     </a>
                   </div>`
                : ''
            }

            ${
              projects && projects.length
                ? `<div class="row node-projects">
                     <strong>Projects</strong>:
                     ${projects.map(p => esc(p || '')).filter(Boolean).join(', ')}
                   </div>`
                : ''
            }

            ${
              persons && persons.length
                ? `<div class="row node-persons">
                     <strong>Persons</strong>:
                     <ul style="margin:0.25rem 0 0 1rem;padding:0;">
                       ${persons.map(p => {
                         const name = p.name || '';
                         const role = p.role || '';
                         const from = p.from || '';
                         const bits = [
                           name ? esc(name) : '',
                           role ? ` (${esc(role)})` : '',
                           from ? ` since ${esc(from)}` : ''
                         ].join('');
                         return bits ? `<li>${bits}</li>` : '';
                       }).join('')}
                     </ul>
                   </div>`
                : ''
            }

            ${
              metaRows.length
                ? `<div class="row">
                     <table>
                       <tbody>
                         ${metaRows.map(([k, v]) => `
                           <tr>
                             <td>${esc(k)}</td>
                             <td>${esc(v)}</td>
                           </tr>
                         `).join('')}
                       </tbody>
                     </table>
                   </div>`
                : ''
            }

            <div class="row toolbar">
              <a href="${esc(searchUrl)}">Search</a>
              ${
                hasPage
                  ? `<span>|</span>
                     <a href="${esc(pageUrl)}">Open details</a>`
                  : ''
              }
            </div>
          </div>
        `;
        panel.classList.add('open');
      }

      function closeNodePanel() {
        panel.classList.remove('open');
      }

      // node click opens panel
      cy.on('tap', 'node', evt => {
        openNodePanel(evt.target);
      });

      // close button
      document.addEventListener('click', ev => {
        if (ev.target.id === 'panelClose' || ev.target.closest && ev.target.closest('#panelClose')) {
          ev.preventDefault();
          closeNodePanel();
        }
      });
      // end main info panel block 




      if (COLOR_MODE !== 'degree') applyTypeColors(cy);

      const sizeFor = id => { const d = degrees[id] ?? 0; return Math.max(6, Math.min(24, 4 + Math.sqrt(d) * 2)); };
      cy.batch(()=>{ cy.nodes().forEach(n => { const w=sizeFor(n.id()); n.data('deg', degrees[n.id()] ?? 0); n.style('width', w); n.style('height', w); }); });
      if (COLOR_MODE === 'degree'){
        const maxDeg = Math.max(1, ...Object.values(degrees));
        cy.style().fromJson([{ selector: 'node', style: { 'background-color': `mapData(deg, 0, ${maxDeg}, #e0f3ff, #08519c)` } }]).update();
      }

      // fit to the small hood
      if (topId){
        const focus = cy.$id(topId);
        const hood = (()=>{ let coll = focus; for (let i=0;i<STAGE_K;i++){ coll = coll.union(coll.neighborhood().nodes()); } return coll; })();
        cy.resize(); cy.fit(hood, FIT_PAD);
        setLabels(hood.nodes ? hood.nodes() : hood, true);
        setStatus('Expanding full network...please wait, page may appear stalled but it's not [Approx 1min load time]');
      } else {
        firstFit(cy, { havePreset: true });
        setStatus('Expanding full network...please wait, page may appear stalled but it's not [Approx 1min load time]');
      }

      // stage 2, add the rest, then animate to natural layout
      const addRest = () => {
        const restNodes = nodes.filter(n => !stageSet.has(n.id));
        const restEdges = edges.filter(([s,t]) => !stageEdgeKeys.has(edgeKey(s,t)));
        cy.batch(()=>{
          for (const n of restNodes){
            const i = indexById.get(n.id);
            cy.add({
              group: 'nodes',
              data: { id: n.id, label: n.l, t: n.t, s: n.s, deg: degrees[n.id] ?? 0 },
              position: havePreset ? ((n.x!==undefined&&n.y!==undefined)?{x:n.x,y:n.y}:undefined) : allPos[i]
            });
          }
          for (const [s,t,rel] of restEdges){ cy.add({ group:'edges', data:{ source:s, target:t, rel } }); }
        });

        // ensure styles on new nodes
        cy.batch(()=>{ cy.nodes().forEach(n => { if (!n.style('width')){ const w=sizeFor(n.id()); n.style('width',w); n.style('height',w); } }); });

        setStatus('Arranging layout...');
        runProgressiveLayout(cy);
      };

      const startLater = () => {
        if (window.requestIdleCallback) requestIdleCallback(addRest, { timeout: 1000 });
        else setTimeout(addRest, 300);
      };
      cy.once('render', () => { if (!userHasInteracted) startLater(); });

      // labels and interaction
      cy.on('zoom', () => {
        userHasInteracted = true;
        const show = cy.zoom() > LABEL_ZOOM;
        setLabelsAll(cy, show);
      });
      cy.on('pan zoom drag free', () => { userHasInteracted = true; });

    }).catch(err => {
      console.error('Failed to load graph assets', err);
      setStatus('Could not load graph data');
      container.innerHTML = `<p style="padding:1rem">Could not load graph assets, see console. Tried:<br>
        <code>${graphUrl}</code><br><code>${degreeUrl}</code></p>`;
    });
  }

  if (window.document$) { document$.subscribe(() => init()); }
  else if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
</script>

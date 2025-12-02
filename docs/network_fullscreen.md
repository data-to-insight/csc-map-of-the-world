---
title: CSC Network Full (Pre-Alpha)
hide:
  - navigation
  - toc
  - footer
---

<!-- Note: Page incl .js scripts is self-contained excepting the unpinning data.
     I might separate scripts out into /js later to mirror network.md etc. -->

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
    const COLOR_MODE   = (params.get('color')  || 'type').toLowerCase();        // 'type' | 'degree'
    const LAYOUT_AFTER = (params.get('layout') || 'progressive').toLowerCase(); // default progressive
    const ENGINE       = (params.get('engine') || 'fcose').toLowerCase();       // default fcose
    const STAGE_K      = Number(params.get('stage_k')) || 1;                    // initial hops, default 1

    function fitContainer() {
      const header = document.querySelector('.md-header');
      const h = header ? header.offsetHeight : 0;
      container.style.height = 'calc(100vh - ' + h + 'px)';
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
        setTimeout(function () {
          statusEl.style.opacity = '0';
          setTimeout(function () {
            if (statusEl.parentNode) statusEl.parentNode.removeChild(statusEl);
          }, 300);
        }, afterMs);
      } else {
        statusEl.parentNode.removeChild(statusEl);
      }
    }

    function showFor(msg, ms) {
      if (ms == null) ms = 5000;
      setStatus(msg);
      hideStatus(ms);
    }

    let userHasInteracted = false;
    window.addEventListener('resize', function () {
      fitContainer();
      if (window.cy) {
        window.cy.resize();
        if (!userHasInteracted) firstFit(window.cy, { havePreset: window.cy.hasPresetPositions });
      }
    });

    const graphUrl   = new URL('../data/graph_data.lite.json', window.location.href).toString();
    const degreeUrl  = new URL('../data/degree.json',          window.location.href).toString();
    const detailsUrl = new URL('../data/node_details.json',    window.location.href).toString();

    // node details store
    let DETAILS = {};  // { id: { label, slug, type, summary, tags, website, projects, persons, page_url, ... } }

    // helpers
    function setLabels(coll, show) {
      coll.forEach(function (n) {
        n.style('label', show ? n.data('label') : '');
      });
    }

    function setLabelsAll(cy) {
      const show = cy.zoom() > LABEL_ZOOM;
      cy.batch(function () {
        cy.nodes().forEach(function (n) {
          n.style('label', show ? n.data('label') : '');
        });
      });
    }

    function mulberry32(a){
      return function(){
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    function jitteredGridPositions(count, gap, jitter, seed){
      if (gap == null) gap = 28;
      if (jitter == null) jitter = 8;
      if (seed == null) seed = 17;

      const cols = Math.ceil(Math.sqrt(count));
      const rng  = mulberry32(seed);
      const pos  = new Array(count);
      for (let i = 0; i < count; i++) {
        const x = (i % cols) * gap + (rng() * 2 - 1) * jitter;
        const y = (Math.floor(i / cols)) * gap + (rng() * 2 - 1) * jitter;
        pos[i] = { x: x, y: y };
      }
      return pos;
    }

    function computeDegreeFromEdges(edges){
      const adj = Object.create(null);
      for (let idx = 0; idx < edges.length; idx++) {
        const e = edges[idx];
        if (!Array.isArray(e) || e.length < 2) continue;
        const s = e[0];
        const t = e[1];
        (adj[s] ||= new Set()).add(t);
        (adj[t] ||= new Set()).add(s);
      }
      const out = {};
      const keys = Object.keys(adj);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        out[k] = adj[k].size;
      }
      return out;
    }

    function neighborhoodKHopsSet(id, k, neighbors){
      let set = new Set([id]);
      for (let i = 0; i < k; i++) {
        const add = new Set(set);
        set.forEach(function (n) {
          const nb = neighbors.get(n);
          if (!nb) return;
          nb.forEach(function (m) { add.add(m); });
        });
        set = add;
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

    function firstFit(cy, opts){
      const core = cy.nodes().filter(function (n) {
        return n.connectedEdges().length > 0;
      });
      cy.resize();
      cy.fit(core.length ? core : cy.nodes(), 8);
    }

    function runProgressiveLayout(cy){
      if (LAYOUT_AFTER === 'none') {
        showFor('Zoom in to view node labels', 5000);
        return;
      }
      const isFCoSE =
        (ENGINE === 'fcose') &&
        typeof cytoscape('core', 'layout', 'fcose') === 'function';

      const opts = isFCoSE ? {
        name: 'fcose',
        quality: 'draft',
        randomize: false,
        animate: 'end',
        animationDuration: 700,
        nodeRepulsion: 4500,
        idealEdgeLength: 90,
        gravity: 0.25,
        packComponents: true,
        tile: true
      } : {
        name: 'cose',
        randomize: false,
        animate: 'end',
        animationDuration: 700,
        numIter: 700,
        nodeRepulsion: 120000,
        idealEdgeLength: 90,
        gravity: 2,
        initialTemp: 200,
        coolingFactor: 0.99
      };

      cy.style().selector('edge').style('opacity', 0.25).update();
      const layout = cy.elements().layout(opts);
      layout.on('layoutstop', function () {
        cy.style().selector('edge').style('opacity', 1).update();
        if (!userHasInteracted) firstFit(cy, { havePreset: true });
        showFor('Zoom in to view node labels', 5000);
      });
      layout.run();
    }

    // start fetch, status == loading
    fetch(graphUrl)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + graphUrl);
        return r.json();
      })
      .then(async function (payload) {
        const nodes = payload.nodes || [];
        const edges = payload.edges || [];

        setStatus('Preparing initial view...');

        // degrees and neighbor map
        let degrees = {};
        try {
          const r = await fetch(degreeUrl);
          if (!r.ok) throw new Error();
          degrees = await r.json();
        } catch (e) {
          degrees = computeDegreeFromEdges(edges);
        }

        // optional node details, used by info panel
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

        const neighbors = new Map();
        for (let i = 0; i < edges.length; i++) {
          const e = edges[i];
          const s = e[0];
          const t = e[1];
          (neighbors.get(s) || neighbors.set(s, new Set()).get(s)).add(t);
          (neighbors.get(t) || neighbors.set(t, new Set()).get(t)).add(s);
        }

        // choose top degree id
        let topId = nodes[0] ? nodes[0].id : null;
        let max   = -1;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const d = degrees[n.id] != null ? degrees[n.id] : 0;
          if (d > max) {
            max   = d;
            topId = n.id;
          }
        }

        // preset positions for all nodes, used in both stages
        const havePreset = nodes.some(function (n) {
          return n.x !== undefined && n.y !== undefined;
        });
        const allPos     = havePreset ? null : jitteredGridPositions(nodes.length, 28, 8, 17);
        const indexById  = new Map();
        for (let i = 0; i < nodes.length; i++) {
          indexById.set(nodes[i].id, i);
        }

        // stage 1 set, top plus 1 hop
        const stageSet   = topId
          ? neighborhoodKHopsSet(topId, STAGE_K, neighbors)
          : new Set(nodes.slice(0, 20).map(function (n) { return n.id; }));

        const stageNodes = nodes.filter(function (n) { return stageSet.has(n.id); });
        const stageEdges = edges.filter(function (e) {
          const s = e[0];
          const t = e[1];
          return stageSet.has(s) && stageSet.has(t);
        });

        const edgeKey = function (a, b) {
          return a < b ? (a + '|' + b) : (b + '|' + a);
        };
        const stageEdgeKeys = new Set();
        for (let i = 0; i < stageEdges.length; i++) {
          const s = stageEdges[i][0];
          const t = stageEdges[i][1];
          stageEdgeKeys.add(edgeKey(s, t));
        }

        // build initial elements
        const elements = [];
        for (let i = 0; i < stageNodes.length; i++) {
          const n = stageNodes[i];
          const idx = indexById.get(n.id);
          elements.push({
            data:     { id: n.id, label: n.l, t: n.t, s: n.s },
            position: havePreset
              ? ((n.x !== undefined && n.y !== undefined) ? { x: n.x, y: n.y } : undefined)
              : allPos[idx]
          });
        }
        for (let i = 0; i < stageEdges.length; i++) {
          const e = stageEdges[i];
          elements.push({ data: { source: e[0], target: e[1], rel: e[2] } });
        }

        // create cy
        const cy = window.cy = cytoscape({
          container: container,
          elements:  elements,
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

        if (COLOR_MODE !== 'degree') applyTypeColors(cy);

        const sizeFor = function (id) {
          const d = degrees[id] != null ? degrees[id] : 0;
          return Math.max(6, Math.min(24, 4 + Math.sqrt(d) * 2));
        };

        cy.batch(function () {
          cy.nodes().forEach(function (n) {
            const w = sizeFor(n.id());
            n.data('deg', degrees[n.id()] != null ? degrees[n.id()] : 0);
            n.style('width', w);
            n.style('height', w);
          });
        });

        if (COLOR_MODE === 'degree') {
          const degVals = Object.values(degrees);
          const maxDeg  = Math.max(1, degVals.length ? Math.max.apply(null, degVals) : 1);
          cy.style().fromJson([
            {
              selector: 'node',
              style: { 'background-color': 'mapData(deg, 0, ' + maxDeg + ', #e0f3ff, #08519c)' }
            }
          ]).update();
        }

        // small node info panel, reuses .node-panel CSS
        let panel = document.getElementById('nodePanel');
        if (!panel) {
          panel = document.createElement('aside');
          panel.id = 'nodePanel';
          panel.className = 'node-panel';
          document.body.appendChild(panel);
        }

        function openNodePanel(node) {
          const d  = node.data();
          const id = d.id;

          const det = (id && DETAILS && DETAILS[id]) || {};

          const label =
            det.label ||
            d.label ||
            id;

          const slugVal =
            det.slug ||
            d.slug ||
            '';

          const typeVal =
            (det.type || d.type || d.t || '').toString().toUpperCase();

          const summary =
            det.summary ||
            det.description ||
            det.notes ||
            '';

          const tags = Array.isArray(det.tags) ? det.tags : [];

          const website  = det.website || '';
          const projects = Array.isArray(det.projects) ? det.projects : [];
          const persons  = Array.isArray(det.persons)  ? det.persons  : [];

          const orgType   = det.organisation_type || det.organization_type || '';
          const region    = det.region || '';
          const published = det.published || det.date_published || det.date || '';

          const pageUrl = det.page_url || '';
          const hasPage = typeof pageUrl === 'string' && pageUrl.trim() !== '';

          const base = function (s) {
            return s ? String(s).split('/').filter(Boolean).pop() : '';
          };
          const queryTerm = (label && label.trim()) || base(slugVal) || id;

          const searchUrl =
            location.pathname.replace(/network_fullscreen.*$/, '') +
            'search/?q=' +
            encodeURIComponent(queryTerm);

          let html = '';

          html += '<div class="node-panel-inner">';

          // header row
          html += '<div class="row" style="display:flex;justify-content:space-between;align-items:center;">';
          html += '  <div>';
          html += '    <h3>' + esc(label || id) + '</h3>';
          if (slugVal) {
            html += '    <div class="meta">' + esc(slugVal) + '</div>';
          }
          html += '  </div>';
          html += '  <button id="panelClose">\u2715</button>';
          html += '</div>';

          // summary
          if (summary) {
            html += '<div class="row">';
            html += '  <div class="subhead"><strong>Summary</strong></div>';
            html += '  <div class="node-summary">' + esc(summary) + '</div>';
            html += '</div>';
          }

          // meta table
          html += '<div class="row">';
          html += '  <table><tbody>';

          if (typeVal) {
            html += '    <tr><td>Type</td><td>' + esc(typeVal) + '</td></tr>';
          }
          if (slugVal) {
            html += '    <tr><td>Slug</td><td>' + esc(slugVal) + '</td></tr>';
          }
          if (website) {
            html += '    <tr><td>Website</td><td>';
            html += '      <a href="' + esc(website) + '" target="_blank" rel="noopener">';
            html +=            esc(website);
            html += '      </a>';
            html += '    </td></tr>';
          }
          if (published) {
            html += '    <tr><td>Published</td><td>' + esc(published) + '</td></tr>';
          }
          if (region) {
            html += '    <tr><td>Region</td><td>' + esc(region) + '</td></tr>';
          }
          if (orgType) {
            html += '    <tr><td>Organisation type</td><td>' + esc(orgType) + '</td></tr>';
          }

          html += '    <tr><td>Id</td><td>' + esc(id) + '</td></tr>';

          html += '  </tbody></table>';
          html += '</div>';

          // tags
          if (tags && tags.length) {
            html += '<div class="row tags">';
            html += '  <div class="subhead"><strong>Tags</strong></div>';
            tags.forEach(function (t) {
              if (!t) return;
              html += '  <span>' + esc(t) + '</span>';
            });
            html += '</div>';
          }

          // projects
          if (projects && projects.length) {
            const projStr = projects
              .map(function (p) { return p || ''; })
              .filter(Boolean)
              .map(esc)
              .join(', ');
            if (projStr) {
              html += '<div class="row node-projects">';
              html += '  <div class="subhead"><strong>Projects</strong></div>';
              html += '  <div>' + projStr + '</div>';
              html += '</div>';
            }
          }

          // people
          if (persons && persons.length) {
            html += '<div class="row node-persons">';
            html += '  <div class="subhead"><strong>People</strong></div>';
            html += '  <ul>';
            persons.forEach(function (p) {
              const name = p.name || '';
              const role = p.role || '';
              const from = p.from || '';
              const parts = [];
              if (name) parts.push(esc(name));
              if (role) parts.push(' (' + esc(role) + ')');
              if (from) parts.push(' ' + esc(from));
              const text = parts.join('');
              if (text) {
                html += '    <li>' + text + '</li>';
              }
            });
            html += '  </ul>';
            html += '</div>';
          }

          // toolbar
          html += '<div class="row toolbar">';
          html += '  <a href="' + esc(searchUrl) + '">Search</a>';
          if (hasPage) {
            html += '  <span>|</span>';
            html += '  <a href="' + esc(pageUrl) + '">Details</a>';
          }
          html += '</div>';

          html += '</div>'; // .node-panel-inner

          panel.innerHTML = html;
          panel.classList.add('open');
        }

        function closeNodePanel() {
          panel.classList.remove('open');
        }

        // node click opens panel
        cy.on('tap', 'node', function (evt) {
          openNodePanel(evt.target);
        });

        // close button
        document.addEventListener('click', function (ev) {
          if (ev.target.id === 'panelClose' ||
              (ev.target.closest && ev.target.closest('#panelClose'))) {
            ev.preventDefault();
            closeNodePanel();
          }
        });

        // fit to the small hood
        if (topId) {
          const focus = cy.$id(topId);
          const hood  = (function () {
            let coll = focus;
            for (let i = 0; i < STAGE_K; i++) {
              coll = coll.union(coll.neighborhood().nodes());
            }
            return coll;
          })();
          cy.resize();
          cy.fit(hood, FIT_PAD);
          setLabels(hood.nodes ? hood.nodes() : hood, true);
          setStatus('Expanding full network...please wait, page may appear stalled during loading [Approx wait time 1min]');
        } else {
          firstFit(cy, { havePreset: true });
          setStatus('Expanding full network...please wait, page may appear stalled during loading [Approx wait time 1min]');
        }

        // stage 2, add the rest, then animate to natural layout
        const addRest = function () {
          const restNodes = nodes.filter(function (n) { return !stageSet.has(n.id); });
          const restEdges = edges.filter(function (e) {
            const s = e[0];
            const t = e[1];
            return !stageEdgeKeys.has(edgeKey(s, t));
          });

          cy.batch(function () {
            for (let i = 0; i < restNodes.length; i++) {
              const n   = restNodes[i];
              const idx = indexById.get(n.id);
              cy.add({
                group: 'nodes',
                data: {
                  id: n.id,
                  label: n.l,
                  t: n.t,
                  s: n.s,
                  deg: degrees[n.id] != null ? degrees[n.id] : 0
                },
                position: havePreset
                  ? ((n.x !== undefined && n.y !== undefined) ? { x: n.x, y: n.y } : undefined)
                  : allPos[idx]
              });
            }
            for (let i = 0; i < restEdges.length; i++) {
              const e = restEdges[i];
              cy.add({
                group: 'edges',
                data: { source: e[0], target: e[1], rel: e[2] }
              });
            }
          });

          // ensure styles on new nodes
          cy.batch(function () {
            cy.nodes().forEach(function (n) {
              if (!n.style('width')) {
                const w = sizeFor(n.id());
                n.style('width', w);
                n.style('height', w);
              }
            });
          });

          setStatus('Arranging layout...');
          runProgressiveLayout(cy);
        };

        const startLater = function () {
          if (window.requestIdleCallback) {
            requestIdleCallback(addRest, { timeout: 1000 });
          } else {
            setTimeout(addRest, 300);
          }
        };

        cy.once('render', function () {
          if (!userHasInteracted) startLater();
        });

        // labels and interaction
        cy.on('zoom', function () {
          userHasInteracted = true;
          setLabelsAll(cy);
        });
        cy.on('pan zoom drag free', function () {
          userHasInteracted = true;
        });

      })
      .catch(function (err) {
        console.error('Failed to load graph assets', err);
        setStatus('Could not load graph data');
        container.innerHTML =
          '<p style="padding:1rem">Could not load graph assets, see console. Tried:<br>' +
          '<code>' + esc(graphUrl) + '</code><br><code>' + esc(degreeUrl) + '</code></p>';
      });
  }

  if (window.document$) {
    document$.subscribe(function () { init(); });
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>

<script>
  // Register fcose plugin if both globals exist
  if (window.cytoscape && window.cytoscapeFcose) {
    window.cytoscape.use(window.cytoscapeFcose);
  }
</script>

---
title: Network, full screen
hide:
  - navigation
  - toc
  - footer
---

<style>
  .md-grid { max-width: initial; }
  .md-main__inner { margin: 0; }
  #network-app { width: 100%; min-height: 60vh; }
</style>


<div id="network-app"></div>

<script src="https://unpkg.com/cytoscape@3.28.0/dist/cytoscape.min.js"></script>
<script>
(function () {
  function init() {
    const container = document.getElementById('network-app');
    if (!container) return;

    // size to viewport, minus header height
    function fit() {
      const header = document.querySelector('.md-header');
      const h = header ? header.offsetHeight : 0;
      container.style.height = `calc(100vh - ${h}px)`;
      container.style.width = '100%';
    }
    fit();

    // handle Material instant navigation
    window.addEventListener('resize', () => { fit(); window.cy && window.cy.resize(); });

    // build a robust URL for the data file, go up one level from this page
    const dataUrl = new URL('../data/graph_data.lite.json', window.location.href).toString();
    console.log('Loading graph data from', dataUrl);

    fetch(dataUrl).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${dataUrl}`);
      return r.json();
    }).then(({ nodes, edges }) => {
      const havePreset = nodes.some(n => n.x !== undefined && n.y !== undefined);

      const elements = [
        ...nodes.map(n => ({
          data: { id: n.id, label: n.l, t: n.t, s: n.s },
          position: (n.x !== undefined && n.y !== undefined) ? { x: n.x, y: n.y } : undefined
        })),
        ...edges.map(e => ({ data: { source: e[0], target: e[1], rel: e[2] } }))
      ];

      window.cy = cytoscape({
        container,
        elements,
        pixelRatio: 1,
        textureOnViewport: true,
        wheelSensitivity: 0.2,
        hideEdgesOnViewport: true,
        motionBlur: true,
        layout: havePreset ? { name: 'preset', fit: true }
                           : { name: 'cose', fit: true, animate: false, nodeRepulsion: 8000, idealEdgeLength: 50, gravity: 30 }
      });

      cy.style().fromJson([
        { selector: 'node', style: { 'background-color': '#777', 'width': 8, 'height': 8, 'label': '' } },
        { selector: 'edge', style: { 'line-color': '#aaa', 'width': 1 } }
      ]).update();

      cy.on('zoom', () => {
        const show = cy.zoom() > 1.2;
        cy.batch(() => cy.nodes().forEach(n => n.style('label', show ? n.data('label') : '')));
      });
    }).catch(err => {
      console.error('Failed to load graph data', err);
      container.innerHTML = `<p style="padding:1rem">Could not load graph data, tried: <code>${dataUrl}</code></p>`;
    });
  }

  // run on initial load and on Material instant nav page swaps
  if (window.document$) {
    document$.subscribe(() => init());
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>

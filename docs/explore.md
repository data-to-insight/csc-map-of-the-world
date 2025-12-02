# Network Explorer (search-first)

<!-- Explorer controls -->
<!-- uses docs/js/explorer.js -->
<div style="margin-bottom: 0.75rem;">
  <label for="exploreSearch"><strong>Search:</strong></label>
  <input id="exploreSearch" type="text" placeholder="Search by name / id / slug…" style="width: 360px; margin-left: .5em;" />
  <label style="margin-left: 0.75em; user-select: none;">
    <input type="checkbox" id="contextModeToggle" />
    <strong>Keep neighbours (append)</strong>
  </label>
  <button id="clearGraph" style="margin-left: .75em;">Clear all</button>
</div>

<!-- Search results list -->
<div id="results" style="display:none; margin: .5rem 0; border:1px solid #ddd; border-radius:6px; padding:.5rem;"></div>

<!-- Graph -->
<div id="cy" style="width:100%; height:70vh; border:1px solid #ddd; border-radius:6px;"></div>

<!-- Cytoscape then explorer (order matters) -->
<script src="https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js"></script>
<script defer src="../js/explorer.js"></script>


<!-- panel base CSS (keep things decent if site CSS missing) -->
<style>
  .result-item { padding:4px 6px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; }
  .result-item:hover { background:#f5f5f5; }
  .badge { font-size:11px; padding:2px 6px; border-radius:10px; background:#eee; }
  .node-panel { position:fixed; top:96px; right:16px; width:min(380px,95vw); max-height:70vh; overflow:auto;
                background:#fff; border:1px solid #ddd; border-radius:8px; box-shadow:0 10px 24px rgba(0,0,0,.12);
                padding:12px 14px; z-index:9999; transform:translateX(110%); transition:transform 160ms ease-in-out; }
  .node-panel.open { transform:translateX(0); }
  .node-panel .tags span { display:inline-block; font-size:12px; background:#eef3ff; border:1px solid #d9e4ff; padding:2px 6px; border-radius:10px; margin:2px 4px 0 0; }
  .node-panel .row { margin:.5rem 0; }
  .node-panel .meta { font-size:.85em; color:#666; margin-top:-4px; margin-bottom:6px; }
</style>

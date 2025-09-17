
# CSC Network Graph (in dev)

<!-- 1) mkdocs defaults, 2) css styled enlargement(not working), 3) forced full browswer win overlay --> 
<!-- <div id="cy" style="width: 100%; height: 600px;"></div> -->
<!-- <div id="cy"></div> --> 

This interactive graph shows key organisations, plans, and events in the children’s services data ecosystem.
Use the dropdown to filter by type. You can select more than one item using Ctrl/Cmd.

Dev-notes: Data & relations currently being added, graph layout and naming conventions for nodes in particular is a work in progress as we progress possible use-cases and standardise yml object structure.

<!-- Content search filter (in dev) -->
<div style="margin-bottom: 0.5em;">
  <label for="textSearch"><strong>Search:</strong></label>
  <input id="textSearch" type="text" placeholder="[IN DEV] name, tag, keyword…" style="width: 320px; margin-left: 0.5em;">
  <label style="margin-left: 0.75em; user-select: none;">
    <!-- Context toggle - keep neighbours visible in search or not -->
    <input type="checkbox" id="contextModeToggle" checked>
    <strong>Keep neighbours (context)</strong>
  </label>
</div>


<!-- Enhanced multi-select filter with Choices.js -->
<div style="margin-bottom: 1em;">
  <label for="typeFilter"><strong>Filter by node type(s):</strong></label>
  <select id="typeFilter" multiple>
    <option value="org" selected>Organizations</option>
    <option value="plan">Plans</option>
    <option value="event">Events</option>
    <option value="service">Services</option>
  </select>
  <button id="resetView" style="margin-left: 1em;">Reset View</button>
</div>

<!-- Help link + quick tips -->
<div class="filter-help">
  <!-- Change this href to your guide page path -->
  <a href="guides/filtering_graph/" class="help-link">Help: Filtering guide</a>
  <span aria-hidden="true"> · </span>
  <a href="#filtering-help" class="help-link">Quick tips</a>
</div>

<details id="filtering-help" class="filtering-help">
  <summary>Quick tips for filtering</summary>
  <div class="help-body">
    <p><strong>Free text</strong> matches the node’s <em>name</em>, <em>tags</em>, and <em>summary</em>.</p>
    <ul>
      <li><code>tag:&lt;word&gt;</code> — match nodes with that tag (e.g. <code>tag:ilacs</code>)</li>
      <li><code>type:&lt;kind&gt;</code> — restrict by type (<code>type:org</code>, <code>type:plan</code>, <code>type:event</code>, <code>type:service</code>)</li>
      <li>Combine terms: <code>tag:ilacs type:org</code> (all terms must match)</li>
      <li><em>Context mode</em>: keeps neighbours of matches visible for exploration</li>
      <li>Filters + search intersect (both must match)</li>
      <li>Share state: copy the URL (types and query persist in the hash)</li>
    </ul>

    <p><strong>Examples</strong></p>
    <ul>
      <li><code>ilacs</code> — any node mentioning “ilacs”</li>
      <li><code>tag:children_services</code> — nodes tagged “children_services”</li>
      <li><code>type:org dfe</code> — organisation nodes mentioning “dfe”</li>
      <li><code>tag:data_tools type:service</code> — services tagged “data_tools”</li>
    </ul>
  </div>
</details>

<!-- Graph container -->
<div id="cy" style="width: 100%; height: 600px; border: 1px solid #ccc; margin-top: 1em;"></div>


Submit suggested map [corrections](mailto:datatoinsight.enquiries@gmail.com?subject=CSC-MapOfTheWorld-CORRECTION&body=I%20suggest%20that%20the%20following%20needs%20correcting:) or data [additions](mailto:datatoinsight.enquiries@gmail.com?subject=CSC-MapOfTheWorld-DATA&body=I%20suggest%20that%20the%20Map%20should%20have%20the%20following%20added:)


<style>
  #graph-status {
    font-size: 0.7em;
    color: #333;
  }
  .choices__inner {
    background-color: #f9f9f9;
    border-radius: 6px;
  }
</style>

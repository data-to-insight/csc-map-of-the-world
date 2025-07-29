# CSC Network Graph (in dev)

<!-- 1) mkdocs defaults, 2) css styled enlargement(not working), 3) forced full browswer win overlay --> 
<!-- <div id="cy" style="width: 100%; height: 600px;"></div> -->
<!-- <div id="cy"></div> --> 

<!-- Multi-select filter and reset button -->
<div style="margin-bottom: 1em;">
  <label for="typeFilter">Filter by node type(s):</label>
  <select id="typeFilter" multiple size="4" style="min-width: 200px;">
    <option value="org">Organizations</option>
    <option value="plan">Plans</option>
    <option value="event">Events</option>
    <option value="service">Services</option>
  </select>
  <button id="resetView">Reset View</button>
</div>

<!-- graph container -->
<div id="cy" style="width: 100%; height: 600px; border: 1px solid #ccc; margin-top: 1em;"></div>


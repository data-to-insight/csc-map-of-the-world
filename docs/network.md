# CSC Network Graph (in dev)

<!-- 1) mkdocs defaults, 2) css styled enlargement(not working), 3) forced full browswer win overlay --> 
<!-- <div id="cy" style="width: 100%; height: 600px;"></div> -->
<!-- <div id="cy"></div> --> 

This interactive graph shows key organisations, plans, and events in the children’s services data ecosystem.
Use the dropdown to filter by type. You can select more than one item using Ctrl/Cmd.

Dev-notes: Placeholder, awaiting data/sample node-set shown & some relations not yet in place, graph spacing all in progress.

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

<!-- Graph container -->
<div id="cy" style="width: 100%; height: 600px; border: 1px solid #ccc; margin-top: 1em;"></div>


If you'd like to suggest additions, please [submit a request](mailto:datatoinsight.enquiries@gmail.com).

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

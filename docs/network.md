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
  <input id="textSearch" type="text" placeholder="name, tag, keyword…" style="width: 320px; margin-left: 0.5em;">
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

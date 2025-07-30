# CSC Network Relationships

This is a reference page detailing the scope of relationship labels from the Smart City Concept Model (SCCM) as applied to the Children's Social Care (CSC) (network diagram)[network.md]. These relationships are reproduced directly from the <a href="http://www.smartcityconceptmodel.com/" target="_blank">Smart City Concept Model</a> definitions, but shown here for each relevant object type towards additional clarity on the derived network diagram (generated from the core YAML definitions within this tool).

<details><summary><strong>Service Relationships</strong></summary>
<table><thead><tr><th>Subject</th><th>Relationship</th><th>Object</th></tr></thead><tbody>
<tr><td>Service</td><td>contains</td><td>Service</td></tr>
<tr><td>Service</td><td>influencedBy</td><td>Objective</td></tr>
<tr><td>Service</td><td>providedBy</td><td>Agent</td></tr>
<tr><td>Service</td><td>responsibilityOf</td><td>Agent</td></tr>
<tr><td>Service</td><td>serviceImplementsMethod</td><td>Method</td></tr>
<tr><td>Service</td><td>usedBy</td><td>Community</td></tr>
<tr><td>Service</td><td>subjectOf</td><td>Agreement</td></tr>
<tr><td>Service</td><td>containedIn</td><td>Service</td></tr>
<tr><td>Service</td><td>containedIn</td><td>Function</td></tr>
<tr><td>Service</td><td>raises</td><td>Case</td></tr>
<tr><td>Service</td><td>usesResource</td><td>Resource</td></tr>
<tr><td>Service</td><td>hasRule</td><td>Rule</td></tr>
</tbody></table>
</details>

<details><summary><strong>Event Relationships</strong></summary>
<table><thead><tr><th>Subject</th><th>Relationship</th><th>Object</th></tr></thead><tbody>
<tr><td>Event</td><td>atPlace</td><td>Place</td></tr>
<tr><td>Event</td><td>hasOutcome</td><td>State</td></tr>
<tr><td>Event</td><td>containedIn</td><td>Case</td></tr>
<tr><td>Event</td><td>containedIn</td><td>Account</td></tr>
<tr><td>Event</td><td>hasRoleFrom</td><td>Item</td></tr>
<tr><td>Event</td><td>hasOutcome</td><td>Decision</td></tr>
<tr><td>Event</td><td>eventPlannedIn</td><td>Plan</td></tr>
</tbody></table>
</details>

<details><summary><strong>Plan Relationships</strong></summary>
<table><thead><tr><th>Subject</th><th>Relationship</th><th>Object</th></tr></thead><tbody>
<tr><td>Plan</td><td>contains</td><td>Plan</td></tr>
<tr><td>Plan</td><td>hasTarget</td><td>Target</td></tr>
<tr><td>Plan</td><td>influencedBy</td><td>Objective</td></tr>
<tr><td>Plan</td><td>planDerivedFromMethod</td><td>Method</td></tr>
<tr><td>Plan</td><td>planForEvent</td><td>Event</td></tr>
<tr><td>Plan</td><td>planForCase</td><td>Case</td></tr>
<tr><td>Plan</td><td>containedIn</td><td>Plan</td></tr>
<tr><td>Plan</td><td>planOf</td><td>Agent</td></tr>
<tr><td>Plan</td><td>usesResource</td><td>Resource</td></tr>
</tbody></table>
</details>

<details><summary><strong>Community Relationships</strong></summary>
<table><thead><tr><th>Subject</th><th>Relationship</th><th>Object</th></tr></thead><tbody>
<tr><td>Community</td><td>contains</td><td>Community</td></tr>
<tr><td>Community</td><td>containedIn</td><td>Community</td></tr>
<tr><td>Community</td><td>uses</td><td>Service</td></tr>
</tbody></table>
</details>

<details><summary><strong>Organization Relationships</strong></summary>
<table><thead><tr><th>Subject</th><th>Relationship</th><th>Object</th></tr></thead><tbody>
<tr><td>Organization</td><td>contains</td><td>Organization</td></tr>
<tr><td>Organization</td><td>containedIn</td><td>Organization</td></tr>
<tr><td>Organization</td><td>hasMember</td><td>Person</td></tr>
</tbody></table>
</details>

<details><summary><strong>Person Relationships</strong></summary>
<table><thead><tr><th>Subject</th><th>Relationship</th><th>Object</th></tr></thead><tbody>
<tr><td>Person</td><td>memberOf</td><td>Organization</td></tr>
</tbody></table>
</details>

<details><summary><strong>Rule Relationships</strong></summary>
<table><thead><tr><th>Subject</th><th>Relationship</th><th>Object</th></tr></thead><tbody>
<tr><td>Rule</td><td>ruleFor</td><td>Service</td></tr>
</tbody></table>
</details>

<details><summary><strong>Resource Relationships</strong></summary>
<table><thead><tr><th>Subject</th><th>Relationship</th><th>Object</th></tr></thead><tbody>
<tr><td>Resource</td><td>resourceFor</td><td>Service</td></tr>
<tr><td>Resource</td><td>resourceFor</td><td>Plan</td></tr>
<tr><td>Resource</td><td>resourceOf</td><td>Agent</td></tr>
</tbody></table>
</details>

<details><summary><strong>Collection Relationships</strong></summary>
<table><thead><tr><th>Subject</th><th>Relationship</th><th>Object</th></tr></thead><tbody>
<tr><td>Collection</td><td>collectionContains</td><td>Item</td></tr>
<tr><td>Collection</td><td>collectionDefinedBy</td><td>Agent</td></tr>
</tbody></table>
</details>

<details><summary><strong>Agent Relationships</strong></summary>
<table><thead><tr><th>Subject</th><th>Relationship</th><th>Object</th></tr></thead><tbody>
<tr><td>Agent</td><td>has</td><td>Object</td></tr>
<tr><td>Agent</td><td>has</td><td>Abstract</td></tr>
<tr><td>Agent</td><td>hasAgreement</td><td>Agreement</td></tr>
<tr><td>Agent</td><td>hasObjective</td><td>Objective</td></tr>
<tr><td>Agent</td><td>hasPlan</td><td>Plan</td></tr>
<tr><td>Agent</td><td>hasResource</td><td>Resource</td></tr>
<tr><td>Agent</td><td>takesDecision</td><td>Decision</td></tr>
<tr><td>Agent</td><td>uses</td><td>Item</td></tr>
<tr><td>Agent</td><td>makesAssumption</td><td>Assumption</td></tr>
<tr><td>Agent</td><td>definesCollection</td><td>Collection</td></tr>
<tr><td>Agent</td><td>owns</td><td>Account</td></tr>
<tr><td>Agent</td><td>provides</td><td>Service</td></tr>
<tr><td>Agent</td><td>responsibleFor</td><td>Service</td></tr>
</tbody></table>
</details>
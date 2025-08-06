# 0_README_relationships.md

Each file defines one relationship between two SCCM entities (typically AGENT → AGENT or AGENT → SERVICE or ORGANIZATION → SERVICE).
Use `'@type': RELATIONSHIP` and include relationship_type, source, and target.

Maps to SCCM: **RELATIONSHIP** (subject-predicate-object model)



## Folder Structure (SCCM-Aligned)

| Folder                     | SCCM Concept         | Notes                                                                 |
|----------------------------|----------------------|-----------------------------------------------------------------------|
| `data/organizations/`      | `ORGANIZATION`       | For public bodies, networks, partnerships, etc                        |
| `data/services/`           | `SERVICE`, `FUNCTION`| For initiatives, tools, and capabilities delivered by organisations   |
| `data/plans/`              | `PLAN`               | For strategies, roadmaps, coordinated actions (e.g. NVEST roadmap)    |
| `data/events/`             | `EVENT`              | For past/present activities such as launches, reviews, inspections    |
| `data/relationships/`      | `RELATIONSHIP`       | One file per relationship (e.g. org–org, person–org)                 |
| `data/collections/`        | `COLLECTION`         | For logical groupings like datasets, tools, dashboards                |
| `data/items/`              | `ITEM`, `OBJECT`     | Physical things like forms, dashboards, data files                    |
| `data/rules/`              | `RULE`               | Towards possible modelling of governance or validation logic          |


## Relations relevant to Map

+-----------------------+--------------------+---------------------------+
|      Subject          |     Relationship   |          Object           |
+-----------------------+--------------------+---------------------------+
| Service               | contains           | Service                   |
| Service               | influencedBy       | Objective                 |
| Service               | providedBy         | Agent                     |
| Service               | responsibilityOf   | Agent                     |
| Service               | serviceImplementsMethod | Method              |
| Service               | usedBy             | Community                 |
| Service               | subjectOf          | Agreement                 |
| Service               | containedIn        | Service                   |
| Service               | containedIn        | Function                  |
| Service               | raises             | Case                      |
| Service               | usesResource       | Resource                  |
| Service               | hasRule            | Rule                      |
+-----------------------+--------------------+---------------------------+

+----------------+------------------+----------------+
|    Subject     |   Relationship   |     Object     |
+----------------+------------------+----------------+
| Event          | atPlace          | Place          |
| Event          | hasOutcome       | State          |
| Event          | containedIn      | Case           |
| Event          | containedIn      | Account        |
| Event          | hasRoleFrom      | Item           |
| Event          | hasOutcome       | Decision       |
| Event          | eventPlannedIn   | Plan           |
+----------------+------------------+----------------+

+-----------+------------------------+----------------+
|  Subject  |     Relationship       |     Object     |
+-----------+------------------------+----------------+
| Plan      | contains               | Plan           |
| Plan      | hasTarget              | Target         |
| Plan      | influencedBy           | Objective      |
| Plan      | planDerivedFromMethod  | Method         |
| Plan      | planForEvent           | Event          |
| Plan      | planForCase            | Case           |
| Plan      | containedIn            | Plan           |
| Plan      | planOf                 | Agent          |
| Plan      | usesResource           | Resource       |
+-----------+------------------------+----------------+

+--------------+--------------+-------------+
|   Subject    | Relationship |   Object    |
+--------------+--------------+-------------+
| Organization | contains     | Organization|
| Organization | containedIn  | Organization|
| Organization | hasMember    | Person      |
+--------------+--------------+-------------+

+--------+------------+--------------+
| Subject| Relationship |  Object     |
+--------+------------+--------------+
| Person | memberOf   | Organization |
+--------+------------+--------------+

+--------+------------+----------+
| Subject| Relationship | Object   |
+--------+------------+----------+
| Rule   | ruleFor    | Service  |
+--------+------------+----------+

+----------+--------------+---------+
| Subject  | Relationship | Object  |
+----------+--------------+---------+
| Resource | resourceFor  | Service |
| Resource | resourceFor  | Plan    |
| Resource | resourceOf   | Agent   |
+----------+--------------+---------+

+-----------+--------------+-----------+
|  Subject  | Relationship |  Object   |
+-----------+--------------+-----------+
| Community | contains     | Community |
| Community | containedIn  | Community |
| Community | uses         | Service   |
+-----------+--------------+-----------+

+------------+------------------------+--------+
|  Subject   |     Relationship       | Object |
+------------+------------------------+--------+
| Collection | collectionContains     | Item   |
| Collection | collectionDefinedBy    | Agent  |
+------------+------------------------+--------+

+--------+---------------------+-------------+
| Subject|   Relationship      |   Object    |
+--------+---------------------+-------------+
| Agent  | has                 | Object      |
| Agent  | has                 | Abstract    |
| Agent  | hasAgreement        | Agreement   |
| Agent  | hasObjective        | Objective   |
| Agent  | hasPlan             | Plan        |
| Agent  | hasResource         | Resource    |
| Agent  | takesDecision       | Decision    |
| Agent  | uses                | Item        |
| Agent  | makesAssumption     | Assumption  |
| Agent  | definesCollection   | Collection  |
| Agent  | owns                | Account     |
| Agent  | provides            | Service     |
| Agent  | responsibleFor      | Service     |
+--------+---------------------+-------------+


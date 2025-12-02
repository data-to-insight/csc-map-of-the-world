# Development Log — MapOfTheWorld

## 2025-12-02

- Quite a gap since last working on this... although tbh lots of entries missing since last update here. 
- Fix a number of minor problems that i left hanging last time, namely:
- explorer search was not doing anything, 
- explorer search kept showing the full results list even after selecting one, wasnt ideal. Now the rest disappear   
- explorer info panel, this was only showing minimum data, not the fuller data from node_Details.json   
- explorer was duplicating edges when multi-press add 1 hop... (we needed to store bi-directional edge indexes)  
- Added 2 hops option and made buttons more visible instead of just text (bit more css)  
- Alison joins us and re-worked the intro page text, and nice infographic  
- did some work on data_source_optimisation.md content  
- Finding it really difficult to recall all the needed back-end processing and the process flow for all this now... maybe need to both tone down some of the docs, or just do my own idiots guide to refresh/remind myself how to work this. In particular
Need to re-check how to externally process and which files come up(search_index.json, state.json, + other /csc_artifacts or into docs/data/ ? - when i ran the external notebook.... it only updated some files and not the large parquet/fais files? )
- Timed the graph load on network_fullscreen.md, so i could add 'it's gonna take Xminutes to load, grab a drink :)' (was ~50secs in off-peak time)

## 2025-08-06 - Review the SAVVI model concepts agin

- Landed back on the SAVVI model, wondering if that was perhaps a better fit for htis project. Decided against. 


## 2025-08-05 — Input form logic with YAML export

- Finalised static HTML form for submitting new entries to the Map of the World
- Form supports(relevant) `@type` values defined in the SCCM-aligned data model: ORGANIZATION, SERVICE, EVENT, PLAN, COLLECTION, PERSON, RESOURCE, RELATIONSHIP
- Each type has type specific field section, dynamically shown/hidden on selection
- RELATIONSHIP includes source type dropdown to filter valid `relationship_type` options
- To help users, placeholder examples added (in grey text) for multi-value fields like Collaborators, Related Entities, Interests, etc
- Placeholders are auto-stripped from YAML output if unchanged(to make sure examples dont go into yml output)
- When `@type` changes, previously generated YAML box cleared to avoid confusion between entries

### _Implementation rationale_

The form built using a **lightweight HTML/CSS/JS stack - no frameworks or backend**, relying only on [js-yaml](https://github.com/nodeca/js-yaml) to handle YAML serialisation in browser. This driven by the following initial thinking:

#### Full compatibility with GitHub Pages
Form intended to be served directly from the repo — no server, no build process. Fully static ensures [GitHub Pages](https://pages.github.com/) compatibility, i.e. support for only static HTML/CSS/JS. This ensures all aspects of the form is human-readable, no reliance on 3rd party form, JS frameworks, or backend APIs that could disappear or break over time. 

#### Git-native and open source aligned
The YAML output integrates directly with the project’s Git-based workflow — contributors can download the file or submit via PR(not yet implemented), and the data remains version-controlled. This supports the vision of open, and collaborative mapping of the CSC ecosystem.

### Problems encountered

- **Type-specific sections not appearing**: logic flaw, only `ORGANIZATION` and `RELATIONSHIP` type fields were initially showing. fixed by ensuring `toggleTypeSections()` logic applied on both load and change.
- **YAML not generating or clearing the form unexpectedly**: "Generate YAML" button reset the form and wipe data. caused by incorrect form handling, resolved by preventing the default submit behaviour.
- **Type-specific fields missing from YAML output**: type fields not always included in the final output. fixed by reintroducing and checking all relevant fields per type
- **Placeholder values being treated as real input**: `example_value` showing in YAML. We introduced `cleanList()` and `cleanTextList()` utilities to strip placeholder content automatically.

---


## 2025-08-01 — Mailto links, devlog structure, and public-facing dev log

- Revised 'suggest improvement|fix' mailto to make it easier for direct contributions
- define a structure for this devlog. Using as a hybrid devlog/changelog
- Skipped tags and automation for now — Markdown works well and is fast to edit manually

_Notes:_  

---

## 2025-07-31 — Cytoscape class filters bug, stlite graph fixes

- Found a stubborn bug where class-based filters in Cytoscape weren’t applying on page load
- After investigating, I discovered that class assignment lagged layout rendering. A simple `setTimeout` workaround after graph layout stabilisation solved it
- Also fixed a mismatch in hardcoded colours and class names in the static legend — ‘ORGANIZATION’ nodes were showing grey due to casing

---

## 2025-07-30 — Static legend switch for graph UI

- The dynamic legend system was fragile, especially when class names didn’t match types consistently
- I rebuilt the legend as a static block — hardcoding known entity types like `ORGANIZATION`, `SERVICE`, `PERSON` etc. with consistent colours
- Filter defaults now apply correctly on page load. The legend also starts collapsed, which feels cleaner

---

## 2025-07-29 — YAML errors and edge failures in Cytoscape build

- Ran into YAML errors during `admin-build_cytoscape_json.py` — one malformed file broke the whole build
- Also noticed skipped edges due to missing nodes, traced to naming mismatches (e.g. `data_to_insight -> d2i_excel_toolkit_maintenance`)
- Rebuilt one broken relationship YAML from a working template, which fixed the issue — reinforcing the need for stricter YAML validation tooling

---

## 2025-07-22 to 2025-07-26 — External data inclusion and web scraping

- Decided to expand the knowledge base by integrating published web content (PDFs, guidance, reports)
- Designed a strategy to store scraped content under `data_web/` and generate YAML metadata for indexing
- Early blockers included inconsistent text extraction (e.g. malformed GOV.UK PDFs) and parsing issues for structured headers in some `.txt` and `.pdf` files


---
## 2025-07-19 — Pivot away from Streamlit/stlite to MkDocs + JS

- After several attempts to render interactive network graphs in `stlite`, I hit repeated blockers
- Despite simplifying the data and testing basic layouts, Cytoscape.js would either not load properly or failed silently due to lack of support for external JavaScript modules and delayed layout rendering
- These limitations made `stlite` too fragile for graph-based exploration — especially with filters, tooltips, and legend controls
- Decided to switch fully to **MkDocs** as the primary documentation and frontend base, embedding **custom HTML + JavaScript** components directly
- This offered a much more stable and extensible foundation for publishing network diagrams, filtered views, and layered data exploration

_Notes:_  
This was a significant architectural shift, but it unlocked better search integration, reusable visual components, and static hosting via GitHub Pages without relying on Python runtime hacks

---

## 2025-07-18 — Migration to `stlite` for frontend hosting

- Shifted from standard Streamlit to `stlite` to support deployment via GitHub Pages — keeping everything browser-based
- Had to strip out unsupported modules like `pyvis`, `pathlib.Path(__file__)`, and Parquet I/O
- Rebuilt the visualisation to use JSON and embedded Cytoscape.js directly in HTML

---

## 2025-07-17 — Parquet removal and frontend browser shift

- Began adapting the Streamlit app to run fully in-browser using `stlite`
- Removed Parquet-based data loading due to Pyodide/browser compatibility
- Replaced with pre-generated JSON stored in `data/index_data.json` and loaded via HTTP
- Shifted from Python visualisation tools to pure JS (Cytoscape.js) for performance and portability

---

## 2025-07-16 — SCCM node type update for YAML compatibility

- Switched all entity type declarations from `@type: PERSON` to `@type: 'PERSON'` (with quotes) to avoid YAML parsing issues
- This change rippled through the data layer and required updates to validation and the graph builder
- Highlighted the need for stricter YAML schema validation down the line

---

## 2025-07-14 — Fixing schema-to-graph disconnects

- Spotted broken links and dangling edges in the graph caused by mismatches between service/organisation IDs and their relationship definitions
- Rewrote edge-building logic to verify both subject and object exist before drawing the edge
- Output clearer error messages when skipping invalid relationships

---


## 2025-07-09 — Visual and navigational structure rethink

- Reorganised the `/docs/` folder to avoid the sprawl of earlier MkDocs projects
- Added grouped navigation for tools, scrapes, and thematic areas like Early Help, SEND, and Benchmarking
- Refined the script that auto-generates `mkdocs.yml` navigation from the folder structure

---

## 2025-07-03 — CSV and contact data integration

- Added ability to merge contact lists from separate sources (e.g. Wix exports and curated CSVs)
- Extracted email domains and lowercased fields for consistency
- Laid early groundwork for people-entity mapping within the broader ecosystem graph

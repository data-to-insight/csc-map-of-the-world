# Development Log — MapOfTheWorld



## 2025-08-01 — Mailto links, devlog structure, and public-facing logging

- Revised the 'suggest improvement|fix' to be mailto to make it easier for direct contributions. 
- Took the opportunity to define a structure for this devlog. Since it’s public-facing, I’m treating it as a hybrid devlog/changelog. Decided on reverse chronological order and clear date headings.
- Skipped tags and automation for now — Markdown works well and is fast to edit manually.

_Notes:_  

---

## 2025-07-31 — Cytoscape class filters bug, stlite graph fixes

- Found a stubborn bug where class-based filters in Cytoscape weren’t applying on page load.
- After investigating, I discovered that class assignment lagged layout rendering. A simple `setTimeout` workaround after graph layout stabilisation solved it.
- Also fixed a mismatch in hardcoded colours and class names in the static legend — ‘ORGANIZATION’ nodes were showing grey due to casing.

---

## 2025-07-30 — Static legend switch for graph UI

- The dynamic legend system was fragile, especially when class names didn’t match types consistently.
- I rebuilt the legend as a static block — hardcoding known entity types like `ORGANIZATION`, `SERVICE`, `PERSON` etc. with consistent colours.
- Filter defaults now apply correctly on page load. The legend also starts collapsed, which feels cleaner.

---

## 2025-07-29 — YAML errors and edge failures in Cytoscape build

- Ran into YAML errors during `admin-build_cytoscape_json.py` — one malformed file broke the whole build.
- Also noticed skipped edges due to missing nodes, traced to naming mismatches (e.g. `data_to_insight -> d2i_excel_toolkit_maintenance`).
- Rebuilt one broken relationship YAML from a working template, which fixed the issue — reinforcing the need for stricter YAML validation tooling.

---

## 2025-07-22 to 2025-07-26 — External data inclusion and web scraping

- Decided to expand the knowledge base by integrating published web content (PDFs, guidance, reports).
- Designed a strategy to store scraped content under `data_web/` and generate YAML metadata for indexing.
- Early blockers included inconsistent text extraction (e.g. malformed GOV.UK PDFs) and parsing issues for structured headers in some `.txt` and `.pdf` files.


---
## 2025-07-19 — Pivot away from Streamlit/stlite to MkDocs + JS

- After several attempts to render interactive network graphs in `stlite`, I hit repeated blockers.
- Despite simplifying the data and testing basic layouts, Cytoscape.js would either not load properly or failed silently due to lack of support for external JavaScript modules and delayed layout rendering.
- These limitations made `stlite` too fragile for graph-based exploration — especially with filters, tooltips, and legend controls.
- Decided to switch fully to **MkDocs** as the primary documentation and frontend base, embedding **custom HTML + JavaScript** components directly.
- This offered a much more stable and extensible foundation for publishing network diagrams, filtered views, and layered data exploration.

_Notes:_  
This was a significant architectural shift, but it unlocked better search integration, reusable visual components, and static hosting via GitHub Pages without relying on Python runtime hacks.

---

## 2025-07-18 — Migration to `stlite` for frontend hosting

- Shifted from standard Streamlit to `stlite` to support deployment via GitHub Pages — keeping everything browser-based.
- Had to strip out unsupported modules like `pyvis`, `pathlib.Path(__file__)`, and Parquet I/O.
- Rebuilt the visualisation to use JSON and embedded Cytoscape.js directly in HTML.

---

## 2025-07-17 — Parquet removal and frontend browser shift

- Began adapting the Streamlit app to run fully in-browser using `stlite`.
- Removed Parquet-based data loading due to Pyodide/browser compatibility.
- Replaced with pre-generated JSON stored in `data/index_data.json` and loaded via HTTP.
- Shifted from Python visualisation tools to pure JS (Cytoscape.js) for performance and portability.

---

## 2025-07-16 — SCCM node type update for YAML compatibility

- Switched all entity type declarations from `@type: PERSON` to `@type: 'PERSON'` (with quotes) to avoid YAML parsing issues.
- This change rippled through the data layer and required updates to validation and the graph builder.
- Highlighted the need for stricter YAML schema validation down the line.

---

## 2025-07-14 — Fixing schema-to-graph disconnects

- Spotted broken links and dangling edges in the graph caused by mismatches between service/organisation IDs and their relationship definitions.
- Rewrote edge-building logic to verify both subject and object exist before drawing the edge.
- Output clearer error messages when skipping invalid relationships.

---


## 2025-07-09 — Visual and navigational structure rethink

- Reorganised the `/docs/` folder to avoid the sprawl of earlier MkDocs projects.
- Added grouped navigation for tools, scrapes, and thematic areas like Early Help, SEND, and Benchmarking.
- Refined the script that auto-generates `mkdocs.yml` navigation from the folder structure.

---

## 2025-07-03 — CSV and contact data integration

- Added ability to merge contact lists from separate sources (e.g. Wix exports and curated CSVs).
- Extracted email domains and lowercased fields for consistency.
- Laid early groundwork for people-entity mapping within the broader ecosystem graph.

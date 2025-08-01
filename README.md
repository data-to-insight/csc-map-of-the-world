# CSC Knowledge Base Network

A structured, open-source knowledge base and ecosystem map for the **Children’s Social Care (CSC)** sector. This project brings together [Documentation], [Relationships], [Services], [Sector_Tools], [Rules], [Plans], [Events] using a flexible YAML-based data model and aiming for alignment with the [Smart City Concept Model (SCCM)](http://www.smartcityconceptmodel.com/) towards sector data interoperability.

It aims to support full-text search, (filtered)graph-based relations visualisation, and YAML schema validation across structured `.yml` records. Supporting documents (PDF, Markdown, HTML, Python, JS). Development is scaffolded/designed to be extensible, transparent, and Git-native.

**Current Dev Phase:** *Discovery-Alpha*

---

## Project Purpose

This proof of concept(PoC) project explores how a structured, searchable map of Children’s Social Care (CSC) data, tools, and activity could support work across the sector. While exact use-cases are still emerging, our goal is to create a shared resource that brings together:

- published reports  
- pre-defined data objects  
- web data (e.g. from the DfE, local authorities, third parties)  
- sector-developed tools and frameworks  
- connected people (organisational/sector tools linked where consent given or public record)  

All of this would be made accessible through a visual or navigable interface, allowing users to explore connections between people, projects, standards, and services.

We think this could help:

- **Make relationships clearer** — between local and national CSC initiatives, policies, systems, and data sources  
- **Show who’s doing what** — helping users track new tools, updates to frameworks, or structural changes in services  
- **Bring siloed or under-the-radar work into view** — so efforts can align, build on each other, or avoid duplication  
- **Support local teams** — by contributing to a more joined-up picture of activity across the sector  

We see this as **a collaborative mapping tool**, developed potentially with input from local authority teams, analysts, service leads, academic partners, and national bodies.

---

## Features

- Full-text search across `.md`, `.pdf`, `.html`, `.py`, `.js`, `.yml`, and `.yaml` documents
- Graph-based relationship rendering using Cytoscape.js
- Normalised text extraction via Python based tools, e.g. `nltk`
- Search index + schema validation scripts
- SCCM concept alignment across YAML content
- Local document upload (`/docs/`) for manual additions
- GitHub integration for syncing external repo docs
- Modular structure that supports standalone or embedded use

---

## Project Layout

*Note: Non-UK spelling dictated by some tools.* 

```
/workspaces/d2i-map-of-the-world-mkdocs/
├── admin_scripts/        # Admin scripts(.py) for index building, validation, sync
│   └──dev/
├── data_yml/             # Core SCCM-aligned YAML metadata (collections, plans, events...) 
│   ├── organizations/
│   ├── relationships/
│   ├── services/
│   ├── rules/
│   ├── events/
│   ├── resources/
│   └── ...
├── data_published/       # Cached/publicly released data reports/published frameworks (.pdfs)
├── data_repos/           # Cloned remote GitHub documentation sources (e.g. README, SCCM.yml)
├── data_web/             # Public scraped data, (e.g. local authority web sites, DfE, Others)
├── docs/                 # MkDocs content populates public /site after build (HTML, Markdown, PDF, JS, CSS)
│   ├── js/
│   ├── css/
│   ├── data/
│   │   ├── search_index.json # Pre-rendered search data used by search.js
│   │   └── graph_data.json # Pre-rendered graph data for network diagram used by graph.js
│   └── *.md # Mkdocs site pages, index.md etc.... 
├── mkdocs.yml            # Site config MKDOCS
├── requirements.txt
├── setup.sh              # Dev setup (codespace or local)
└── README.md
```

---

## Getting Started (Dev + CLI)

### Environment Setup

```bash
./setup.sh  # one-time setup (pip install, nltk, etc.)
```

### Run locally

```bash
mkdocs serve
# or if port conflict:
mkdocs serve --dev-addr=0.0.0.0:8001
# or 
python -m mkdocs serve

```


### Validate YAML records

```bash
python admin_scripts/validate_yml_objects.py
```
Ensure the core YML files are valid before running subsequent update processes. 

### Rebuild Search Index + Graph

```bash
python admin_scripts/build_main_search_index.py
```
Re-create/update the search index file from available data. 

```bash
python admin_scripts/build_cytoscape_json.py
```
Re-create/update the graph/network diagram index file from available data. 

```bash
python /workspaces/csc-map-of-the-world/admin_scripts/admin-re-build-sources-page.py
```
Refresh the sources page with any refreshed files or sources. Note that this overwrites the sources.md page. 


### Cleanup (optional)

```bash
rm -rf site/
```
To ensure clean re-build of mkdocs site folder. Rarely needed but in case. 

---

## Tech Stack

###  Python Stack
| Purpose             | Tools                                                                  |
| ------------------- | ---------------------------------------------------------------------- |
| YAML parsing        | `PyYAML`, `ruamel.yaml`                                                |
| PDF parsing         | `pdfplumber`, `PyMuPDF`                                                |
| HTML scraping       | `requests`, `BeautifulSoup4`                                           |
| NLP & text cleaning | `nltk` (stopwords, lemmatisation), `spacy`, `transformers`             |
| Keyword filtering   | `scikit-learn` (`CountVectorizer` for frequency-based filtering)       |
| Parquet support     | `fastparquet` (used with `pandas.to_parquet`)                          |
| Data handling       | `pandas`, `json`, `os`, `re`, `datetime`, `hashlib`                    |
| File handling       | `pathlib`, `glob`, `shutil`, `unicodedata`                             |
| Indexing (planned)  | `lunr`, `duckdb`, custom JSON-based indexing                           |
| Graph generation    | `networkx`, `pyvis`, `cytoscape.js` (via JSON export)                  |
| Markdown generation | `markdown`, `mkdocs`, `mkdocs-material`, `pandoc` (for `.docx` export) |
| Visualisation UI    | `streamlit`, `stlite`, `Cytoscape.js`                                  |


### Frontend / Docs / Search
| Purpose        | Tools                                                               |
| -------------- | ------------------------------------------------------------------- |
| Documentation  | `MkDocs`, `Material for MkDocs`, `mkdocs.yml`, `mkdocs-private.yml` |
| Hosting        | GitHub Pages (`gh-pages`, `GitHub Actions`)                         |
| Graph frontend | `Cytoscape.js` (embedded via JS inside MkDocs site)                 |
| Static search  | `list.js`, planned integration of `lunr.js`                         |


---

## Development Notes

- YAML records (attempt to)follow SCCM concepts: `OBJECT`, `AGENT`, `SERVICE`, `EVENT`, `COLLECTION`, `OBSERVATION`, `RELATIONSHIP`, etc.
- Each YAML file should include a `name`, `description`, and optional `@type`, `tags`, `related_to`, `source_url`, etc.
- `search_index.json` and `graph_data.json` are regenerated via scripts and used by the frontend
- Folder structure matters: new categories of YAML content should be placed in their own folder inside `/data_yml/`
- Scraped or imported documentation (e.g. Ofsted inspections, SEND guidance) lives in `/docs/` or `/data_published/`

---

## Dev/Future Work

Aside the ongoing dev/fixes... 

- SCCM-compliant exports
- Live data ingress to maintain updates, via direct LA/DfE urls or alternative
- Enhanced relationship modelling (multi-level RELATIONSHIP, EVENT chains)
- Editable front-end (e.g. via YAML form editor) or enabling direct YAML contributions
- Scaled search index using DuckDB-based backend or further optimised search index method(s)
- Expanded integration across D2I GitHub repos via cross-referencing tags

- Consider how best to model *temporal relationships* (e.g. `start_date`, `end_date`, `published`)
- Decide on storing personal names (e.g. contributors, collaborators) in `AGENT` vs anonymised role-based entries
- Test load/search performance as data grows (browser-side memory vs backend streaming)
- Can this stack/structure and git file allowance sufficiently scale up..... 

---

## Smart City Concept Model (SCCM) 

Possible mapping examples within this tool, these and others currently in internal review. 

| SCCM Concept (Category)                                                                 | Suggested example(s) (in progress)                                                                                     | 
|-----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| [Community](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=161)   | South East fostering cluster                                                                                            |
| [Documentation](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=183) | [CSC Independent Review](https://assets.publishing.service.gov.uk/media/640a17f28fa8f5560820da4b/Independent_review_of_children_s_social_care_-_Final_report.pdf) |
| [Events](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=164)        | *Children’s Social Care Review*, *ILACS Inspections*, *Public Inquiries*                                                |
| [Organization](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=160) | [Data to Insight](https://www.datatoinsight.org/), [LIIA](https://www.liia.london/)                                     |
| [Persons](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=159)      | Organisational/sector tools linked where consent given or public record                                                 |
| [Plans](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=177)        | *Kinship Care Strategy*, *Children’s Social Care National Framework*                                                    |
| [Relationships](http://www.smartcityconceptmodel.com/index.php?Action=ShowModel&Id=10)   | LA-1 ↔ Supports ↔ SSD Tests, DfE ↔ Pilots ↔ API Data Flows                                                               |
| [Rules](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=175)        | Statutory Guidance, *Keeping Children Safe in Education 2025*                                                           |
| [Sector Tools](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=166) | [PATCH](https://www.datatoinsight.org/patch), ChAT                                                                      |
| [Services](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=169)     |                                                                                                                         |




© Data to Insight — sector-driven, open knowledge 


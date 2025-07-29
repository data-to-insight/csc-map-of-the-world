# CSC Knowledge Base Network

A structured, open-source knowledge base and ecosystem map for the **Children’s Social Care (CSC)** sector. This project brings together [Documentation], [Relationships], [Services], [Sector_Tools], [Rules], [Plans], [Events] using a flexible YAML-based data model and aiming for alignment with the [Smart City Concept Model (SCCM)](http://www.smartcityconceptmodel.com/) towards sector data interoperability.

| Category        | Example(s)                                                                                      |
|----------------|--------------------------------------------------------------------------------------------------|
| Documentation  | SSD specification, CIN census guidance, ILACS framework                                         |
| Relationships  | Local authority1 ↔ Supporting ↔ SSD Testing, DfE ↔ Piloting ↔ Daily Data Flows                               |
| Services       |                                 |
| Sector_Tools   | [PATCH](https://www.datatoinsight.org/patch), ChAT                            |
| Rules          | Statutory Guidance, *Keeping Children Safe in Education 2025*, *Working Together to Safeguard Children* |
| Plans          | *Kinship Care Strategy*, *Children’s Social Care National Framework* |
| Events         | *Children’s Social Care Review*, *ILACS Inspections*, *Public Inquiries (e.g. Child Q)*         |

| SCCM Concept (Category)                                                                 | Suggested example(s)                                                                                      |
|-----------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| [Documentation](http://www.smartcityconceptmodel.com/index.php?Action=ShowModel&Id=10) | [CSC Independent Review](https://assets.publishing.service.gov.uk/media/640a17f28fa8f5560820da4b/Independent_review_of_children_s_social_care_-_Final_report.pdf)                                         |
| [Relationships](http://www.smartcityconceptmodel.com/index.php?Action=ShowModel&Id=10) | LA-1 ↔ Supports ↔ SSD Tests, DfE ↔ Pilots ↔ API Data Flows                                      |
| [Services](http://www.smartcityconceptmodel.com/index.php?Action=ShowModel&Id=10)      |                                 |
| [Sector Tools](http://www.smartcityconceptmodel.com/index.php?Action=ShowModel&Id=10)  | [PATCH](https://www.datatoinsight.org/patch), ChAT                            |
| [Rules](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=175)      | Statutory Guidance, *Keeping Children Safe in Education 2025* |
| [Plans](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=177)      | *Kinship Care Strategy*, *Children’s Social Care National Framework* |
| [Events](http://www.smartcityconceptmodel.com/index.php?Action=ShowModel&Id=10)        | *Children’s Social Care Review*, *ILACS Inspections*, *Public Inquiries*         |


It aims to support full-text search, (filtered)graph-based relations visualisation, and YAML schema validation across structured `.yml` records. Supporting documents (PDF, Markdown, HTML, Python, JS). Development is scaffolded/designed to be extensible, transparent, and Git-native.

**Current Dev Phase:** *Discovery-Alpha*

---

## Project Purpose

This proof of concept(PoC) project explores how a structured, searchable map of Children’s Social Care (CSC) data, tools, and activity could support work across the sector. While exact use-cases are still emerging, our goal is to create a shared resource that brings together:

- published reports  
- pre-defined data objects  
- web data (e.g. from the DfE, local authorities, third parties)  
- sector-developed tools and frameworks  

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
├── data_yml/             # SCCM-aligned YAML records (collections, plans, events...)
│   ├── organizations/
│   ├── relationships/
│   ├── services/
│   ├── rules/
│   ├── events/
│   └── ...
├── data_published/       # Cached/publicly released data reports/published frameworks
├── data_repos/           # Cloned GitHub documentation sources (e.g. README, SCCM.yml)
├── data_web/             # Scraped data, e.g. local authority web site, DfE, Others
├── docs/                 # MkDocs content (HTML, Markdown, PDF, JS, CSS)
│   ├── js/
│   ├── css/
│   ├── data/
│   │   ├── search_index.json
│   │   └── graph_data.json
│   └── *.md # Mkdocs site pages, index.md etc.... 
├── mkdocs.yml            # Site config
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

### Rebuild Search Index + Graph

```bash
python admin_scripts/build_main_search_index.py
python admin_scripts/build_cytoscape_json.py
```

### Validate YAML records

```bash
python admin_scripts/validate_yml_objects.py
```

### Cleanup (optional)

```bash
rm -rf site/
```

---

## Tech Stack

- **MkDocs** with Material theme
- **Python 3.9+**
- **NLTK** for text preprocessing
- **YAML** for data records (Incl Network graph data)
- **Cytoscape.js** for client-side graph rendering
- **JavaScript** for search UI
- **pdfplumber**, `bs4`, `re`, `json`, `glob` for parsing and index creation

---

## Development Notes

- YAML records (attempt to)follow SCCM concepts: `OBJECT`, `AGENT`, `SERVICE`, `EVENT`, `COLLECTION`, `OBSERVATION`, `RELATIONSHIP`, etc.
- Each YAML file should include a `name`, `description`, and optional `@type`, `tags`, `related_to`, `source_url`, etc.
- `search_index.json` and `graph_data.json` are regenerated via scripts and used by the frontend
- Folder structure matters: new categories of YAML content should be placed in their own folder inside `/data_yml/`
- Scraped or imported documentation (e.g. Ofsted inspections, SEND guidance) lives in `/docs/` or `/data_published/`

---

## Future Work

Aside the ongoing dev/fixes... 

- SCCM-compliant exports
- Live data ingress to maintain updates, via direct LA/DfE urls or alternative
- Enhanced relationship modelling (multi-level RELATIONSHIP, EVENT chains)
- Editable front-end (e.g. via YAML form editor) or enabling direct YAML contributions
- Scaled search index using DuckDB-based backend or further optimised search index method(s)
- Expanded integration across D2I GitHub repos via cross-referencing tags

---

## Developer To-Dos

- Consider how best to model *temporal relationships* (e.g. `start_date`, `end_date`, `published`)
- Decide on storing personal names (e.g. contributors, collaborators) in `AGENT` vs anonymised role-based entries
- Test load/search performance as data grows (browser-side memory vs backend streaming)

---

© Data to Insight — sector-driven, open knowledge 

